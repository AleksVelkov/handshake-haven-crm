import express from 'express';
import { pool } from '../index.js';
import { Contact, CreateContactRequest, UpdateContactRequest } from '../models/Contact.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all contact routes
router.use(authenticateToken);

// Type guard for PostgreSQL errors
function isPostgreSQLError(error: unknown): error is { code: string; message: string } {
  return error !== null && typeof error === 'object' && 'code' in error;
}

// Helper function to handle database operations
async function executeQuery(query: string, params?: any[]) {
  if (!pool) {
    throw new Error('Database not available');
  }
  return pool.query(query, params);
}

// Get all contacts for authenticated user
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!pool) {
      return res.json([]);
    }

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const result = await executeQuery(`
      SELECT 
        id, 
        user_id as "userId",
        name, 
        company, 
        email, 
        phone, 
        tags, 
        notes, 
        status, 
        last_contact as "lastContact", 
        created_at as "createdAt", 
        updated_at as "updatedAt"
      FROM contacts 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get contact by ID for authenticated user
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const result = await executeQuery(`
      SELECT 
        id, 
        user_id as "userId",
        name, 
        company, 
        email, 
        phone, 
        tags, 
        notes, 
        status, 
        last_contact as "lastContact", 
        created_at as "createdAt", 
        updated_at as "updatedAt"
      FROM contacts 
      WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Create new contact for authenticated user
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { name, company, email, phone, tags, notes, status = 'new' }: CreateContactRequest = req.body;
    
    const result = await executeQuery(`
      INSERT INTO contacts (user_id, name, company, email, phone, tags, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id, 
        user_id as "userId",
        name, 
        company, 
        email, 
        phone, 
        tags, 
        notes, 
        status, 
        last_contact as "lastContact", 
        created_at as "createdAt", 
        updated_at as "updatedAt"
    `, [req.user.id, name, company, email, phone, tags, notes, status]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contact:', error);
    if (isPostgreSQLError(error) && error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'You already have a contact with this email address' });
    } else {
      res.status(500).json({ error: 'Failed to create contact' });
    }
  }
});

// Update contact for authenticated user
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const { name, company, email, phone, tags, notes, status, lastContact }: UpdateContactRequest = req.body;
    
    const result = await executeQuery(`
      UPDATE contacts 
      SET 
        name = COALESCE($1, name),
        company = COALESCE($2, company),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        tags = COALESCE($5, tags),
        notes = COALESCE($6, notes),
        status = COALESCE($7, status),
        last_contact = COALESCE($8, last_contact),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND user_id = $10
      RETURNING 
        id, 
        user_id as "userId",
        name, 
        company, 
        email, 
        phone, 
        tags, 
        notes, 
        status, 
        last_contact as "lastContact", 
        created_at as "createdAt", 
        updated_at as "updatedAt"
    `, [name, company, email, phone, tags, notes, status, lastContact, id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact for authenticated user
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { id } = req.params;
    const result = await executeQuery('DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING id', [id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Get contact statistics for authenticated user
router.get('/stats/summary', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await executeQuery(`
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_contacts,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost
      FROM contacts
      WHERE user_id = $1
    `, [req.user.id]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({ error: 'Failed to fetch contact statistics' });
  }
});

// Get comprehensive dashboard statistics
router.get('/stats/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get contact statistics
    const contactStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_contacts,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as contacts_this_week,
        COUNT(CASE WHEN status = 'responded' AND updated_at >= NOW() - INTERVAL '7 days' THEN 1 END) as responses_this_week,
        COUNT(CASE WHEN status = 'converted' AND updated_at >= NOW() - INTERVAL '7 days' THEN 1 END) as conversions_this_week
      FROM contacts
      WHERE user_id = $1
    `, [req.user.id]);

    // Get LinkedIn message statistics (only if linkedin_messages table exists)
    let linkedinStats = {
      messages_sent: 0,
      messages_received: 0,
      unread_messages: 0,
      messages_sent_this_week: 0
    };

    try {
      const messageStats = await executeQuery(`
        SELECT 
          COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as messages_sent,
          COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as messages_received,
          COUNT(CASE WHEN direction = 'inbound' AND NOT is_read THEN 1 END) as unread_messages,
          COUNT(CASE WHEN direction = 'outbound' AND sent_at >= NOW() - INTERVAL '7 days' THEN 1 END) as messages_sent_this_week
        FROM linkedin_messages
        WHERE user_id = $1
      `, [req.user.id]);

      if (messageStats.rows.length > 0) {
        linkedinStats = {
          messages_sent: parseInt(messageStats.rows[0].messages_sent) || 0,
          messages_received: parseInt(messageStats.rows[0].messages_received) || 0,
          unread_messages: parseInt(messageStats.rows[0].unread_messages) || 0,
          messages_sent_this_week: parseInt(messageStats.rows[0].messages_sent_this_week) || 0
        };
      }
    } catch (error) {
      // LinkedIn messages table might not exist yet, ignore error
      console.log('LinkedIn messages table not available:', error);
    }

    // Combine all statistics
    const stats = {
      // Contact statistics
      total_contacts: parseInt(contactStats.rows[0].total_contacts) || 0,
      new_contacts: parseInt(contactStats.rows[0].new_contacts) || 0,
      contacted: parseInt(contactStats.rows[0].contacted) || 0,
      responded: parseInt(contactStats.rows[0].responded) || 0,
      converted: parseInt(contactStats.rows[0].converted) || 0,
      lost: parseInt(contactStats.rows[0].lost) || 0,
      
      // Weekly changes
      contacts_this_week: parseInt(contactStats.rows[0].contacts_this_week) || 0,
      responses_this_week: parseInt(contactStats.rows[0].responses_this_week) || 0,
      conversions_this_week: parseInt(contactStats.rows[0].conversions_this_week) || 0,
      
      // Message statistics
      messages_sent: linkedinStats.messages_sent,
      messages_received: linkedinStats.messages_received,
      unread_messages: linkedinStats.unread_messages,
      messages_sent_this_week: linkedinStats.messages_sent_this_week
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

export default router; 