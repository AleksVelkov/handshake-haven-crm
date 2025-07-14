import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import contactsRouter from './routes/contacts';
import { initializeDatabase } from './utils/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
export const pool = new Pool(
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
);

// Initialize database and test connection
const initializeApp = async () => {
  try {
    console.log('Starting server initialization...');
    
    // Test database connection
    await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    // Initialize database schema
    await initializeDatabase();
    
    // Middleware
    app.use(cors());
    app.use(express.json());
    
    // Routes
    app.use('/api/contacts', contactsRouter);
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

initializeApp(); 