import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import contactsRouter from './routes/contacts.js';
import { initializeDatabase } from './utils/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection (only create if database config exists)
export const pool = (process.env.POSTGRESQL_URI || process.env.DB_HOST || process.env.DB_USER) 
  ? new Pool(
      process.env.POSTGRESQL_URI
        ? {
            connectionString: process.env.POSTGRESQL_URI,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'handshake_haven',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'password',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          }
    )
  : null;

// Initialize database and test connection
const initializeApp = async () => {
  try {
    console.log('Starting server initialization...');
    
    // Test database connection (skip if no database URL in development)
    if (pool) {
      await pool.connect();
      console.log('Connected to PostgreSQL database');
      
      // Initialize database schema
      await initializeDatabase();
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
    app.use('/api/contacts', contactsRouter);
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
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