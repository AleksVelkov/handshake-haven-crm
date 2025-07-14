import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../index.js';
import { CreateUserRequest, LoginRequest, UserResponse, AuthResponse } from '../models/User.js';
import { authenticateToken, generateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Helper function to handle database operations
async function executeQuery(query: string, params?: any[]) {
  if (!pool) {
    throw new Error('Database not available');
  }
  return pool.query(query, params);
}

// Helper function to convert database user to UserResponse
const formatUserResponse = (dbUser: any): UserResponse => ({
  id: dbUser.id,
  email: dbUser.email,
  firstName: dbUser.first_name,
  lastName: dbUser.last_name,
  role: dbUser.role,
  isVerified: dbUser.is_verified,
  lastLogin: dbUser.last_login,
  createdAt: dbUser.created_at,
  updatedAt: dbUser.updated_at,
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user' }: CreateUserRequest = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await executeQuery(`
      INSERT INTO users (email, password, first_name, last_name, role, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, is_verified, created_at, updated_at
    `, [email.toLowerCase(), hashedPassword, firstName, lastName, role, true]);

    const user = formatUserResponse(result.rows[0]);
    const token = generateToken(user.id);

    const authResponse: AuthResponse = { user, token };
    res.status(201).json(authResponse);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await executeQuery(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const dbUser = result.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, dbUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await executeQuery(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [dbUser.id]
    );

    const user = formatUserResponse(dbUser);
    const token = generateToken(user.id);

    const authResponse: AuthResponse = { user, token };
    res.json(authResponse);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await executeQuery(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = formatUserResponse(result.rows[0]);
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const result = await executeQuery(`
      UPDATE users 
      SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, email, first_name, last_name, role, is_verified, last_login, created_at, updated_at
    `, [firstName, lastName, req.user.id]);

    const user = formatUserResponse(result.rows[0]);
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current user with password
    const userResult = await executeQuery(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await executeQuery(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // In a more complex setup, you might want to blacklist the token
    // For now, we'll just return success as the client will remove the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router; 