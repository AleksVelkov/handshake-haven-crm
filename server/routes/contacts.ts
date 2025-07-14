import express from 'express';
import { pool } from '../index';
import { Contact, CreateContactRequest, UpdateContactRequest } from '../models/Contact';

const router = express.Router();

// Type guard for PostgreSQL errors
function isPostgreSQLError(error: unknown): error is { code: string; message: string } {
  return error !== null && typeof error === 'object' && 'code' in error;
}

// Get all contacts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
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
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get contact by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        id, 
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
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Create new contact
router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, tags, notes, status = 'new' }: CreateContactRequest = req.body;
    
    const result = await pool.query(`
      INSERT INTO contacts (name, company, email, phone, tags, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        id, 
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
    `, [name, company, email, phone, tags, notes, status]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contact:', error);
    if (isPostgreSQLError(error) && error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Contact with this email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create contact' });
    }
  }
});

// Update contact
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, tags, notes, status, lastContact }: UpdateContactRequest = req.body;
    
    const result = await pool.query(`
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
      WHERE id = $9
      RETURNING 
        id, 
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
    `, [name, company, email, phone, tags, notes, status, lastContact, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM contacts WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Get contact statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_contacts,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost
      FROM contacts
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({ error: 'Failed to fetch contact statistics' });
  }
});

export default router; 