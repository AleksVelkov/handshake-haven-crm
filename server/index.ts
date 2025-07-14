import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import contactsRouter from './routes/contacts.js';
import authRouter from './routes/auth.js';
import testRouter from './routes/test.js';
import aiRouter from './routes/ai.js';
import { initializeDatabase } from './utils/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection with multiple fallback strategies
let pool: Pool | null = null;

const createDatabasePool = () => {
  if (!process.env.POSTGRESQL_URI && !process.env.DB_HOST && !process.env.DB_USER) {
    return null;
  }

  // Set global TLS settings for production
  if (process.env.NODE_ENV === 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const baseConfig = process.env.POSTGRESQL_URI
    ? { connectionString: process.env.POSTGRESQL_URI }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'handshake_haven',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      };

  // Try SSL first in production
  if (process.env.NODE_ENV === 'production') {
    try {
      return new Pool({
        ...baseConfig,
        ssl: { rejectUnauthorized: false },
        // Connection pool settings for better stability
        max: 20, // Maximum number of connections
        min: 2,  // Minimum number of connections
        idleTimeoutMillis: 30000, // 30 seconds
        connectionTimeoutMillis: 5000, // 5 seconds
      });
    } catch (error) {
      console.log('SSL connection failed, trying without SSL...');
    }
  }

  // Fallback to no SSL
  return new Pool({
    ...baseConfig,
    ssl: false,
    // Connection pool settings for better stability
    max: 20, // Maximum number of connections
    min: 2,  // Minimum number of connections
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 5000, // 5 seconds
  });
};

// Create the pool
export { pool };
pool = createDatabasePool();

// Initialize database and test connection
const initializeApp = async () => {
  try {
    console.log('Starting server initialization...');
    
    // Test database connection with retry logic
    if (pool) {
      let connected = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!connected && attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Database connection attempt ${attempts}/${maxAttempts}...`);
          
          const client = await pool.connect();
          client.release();
          
          console.log('✅ Connected to PostgreSQL database');
          connected = true;
          
          // Initialize database schema
          await initializeDatabase();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`❌ Connection attempt ${attempts} failed:`, errorMessage);
          
          // If SSL error and we haven't tried without SSL yet, try that
          if (errorMessage.includes('certificate') && process.env.NODE_ENV === 'production' && attempts === 1) {
            console.log('🔄 SSL certificate issue detected, trying without SSL...');
            
            // Recreate pool without SSL
            const baseConfig = process.env.POSTGRESQL_URI
              ? { connectionString: process.env.POSTGRESQL_URI.replace('?sslmode=require', '') }
              : {
                  host: process.env.DB_HOST || 'localhost',
                  port: parseInt(process.env.DB_PORT || '5432'),
                  database: process.env.DB_NAME || 'handshake_haven',
                  user: process.env.DB_USER || 'postgres',
                  password: process.env.DB_PASSWORD || 'password',
                };
            
            pool = new Pool({
              ...baseConfig,
              ssl: false,
            });
            
            continue; // Try connection again with new pool
          }
          
          if (attempts >= maxAttempts) {
            console.log('⚠️  Max connection attempts reached. Starting server without database...');
            break;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } else {
      console.log('No database configuration found - running in demo mode');
    }
    
    // Middleware
    app.use(cors());
    app.use(express.json());
    
    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
    }
    
    // Routes
    app.use('/api/auth', authRouter);
    app.use('/api/contacts', contactsRouter);
    app.use('/api/ai', aiRouter);
    app.use('/api/test', testRouter);
    
    // Health check endpoint with database status
    app.get('/api/health', async (req, res) => {
      try {
        if (pool) {
          const client = await pool.connect();
          const result = await client.query('SELECT NOW() as current_time');
          client.release();
          
          res.json({ 
            status: 'OK', 
            database: 'connected',
            timestamp: new Date().toISOString(),
            dbTime: result.rows[0].current_time
          });
        } else {
          res.json({ 
            status: 'OK', 
            database: 'not_configured',
            timestamp: new Date().toISOString() 
          });
        }
      } catch (error) {
        res.status(500).json({ 
          status: 'ERROR', 
          database: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString() 
        });
      }
    });
    
    // Serve React app in production
    if (process.env.NODE_ENV === 'production') {
      app.get('*', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
      });
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

initializeApp(); 