import { Request, Response, Router } from 'express';
import { pool } from '../index.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: 'Database pool not initialized'
      });
    }
    
    // Test database connection
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result.rows[0].current_time
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test database tables
router.get('/db-status', async (req: Request, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({
        status: 'error',
        error: 'Database pool not initialized'
      });
    }
    
    const tables = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'contacts')
      ORDER BY table_name, ordinal_position
    `);

    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const contactCount = await pool.query('SELECT COUNT(*) FROM contacts');

    res.json({
      status: 'success',
      tables: tables.rows,
      counts: {
        users: parseInt(userCount.rows[0].count),
        contacts: parseInt(contactCount.rows[0].count)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test authentication middleware
router.get('/auth-test', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    status: 'authenticated',
    user: req.user,
    message: 'Authentication middleware is working!'
  });
});

// Test user registration (without actually creating a user)
router.post('/register-test', async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields'
    });
  }

  try {
    if (!pool) {
      return res.status(500).json({
        status: 'error',
        error: 'Database pool not initialized'
      });
    }
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'User already exists'
      });
    }

    res.json({
      status: 'success',
      message: 'Registration validation passed (not actually creating user in test mode)',
      data: { email, firstName, lastName }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 