import { pool } from '../index.js';
import { CREATE_CONTACTS_TABLE } from '../models/Contact.js';

export const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    if (!pool) {
      console.log('No database pool available - skipping database initialization');
      return;
    }
    
    // Create tables
    await pool.query(CREATE_CONTACTS_TABLE);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export const testConnection = async () => {
  try {
    if (!pool) {
      console.log('No database pool available - skipping connection test');
      return false;
    }
    
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}; 