import { Request, Response, Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { pool } from '../index.js';

const router = Router();

// Get all campaigns for the authenticated user
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { page = 1, limit = 10, status, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT 
        c.*,
        COUNT(cr.id) as recipient_count,
        COUNT(CASE WHEN cr.status = 'sent' THEN 1 END) as sent_count
      FROM campaigns c
      LEFT JOIN campaign_recipients cr ON c.id = cr.campaign_id
      WHERE c.user_id = $1
    `;
    const queryParams: any[] = [req.user!.id];

    // Add filters
    if (status) {
      query += ` AND c.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }
    if (type) {
      query += ` AND c.type = $${queryParams.length + 1}`;
      queryParams.push(type);
    }

    query += `
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM campaigns WHERE user_id = $1';
    const countParams: any[] = [req.user!.id];
    if (status) {
      countQuery += ` AND status = $${countParams.length + 1}`;
      countParams.push(status);
    }
    if (type) {
      countQuery += ` AND type = $${countParams.length + 1}`;
      countParams.push(type);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      campaigns: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific campaign by ID
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const userId = req.user!.id;

    const campaignResult = await pool.query(
      `SELECT * FROM campaigns WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const messagesResult = await pool.query(
      `SELECT * FROM campaign_messages WHERE campaign_id = $1 ORDER BY sequence_number`,
      [id]
    );

    const recipientsResult = await pool.query(`
      SELECT 
        cr.*,
        c.name as contact_name,
        c.email as contact_email,
        c.company as contact_company
      FROM campaign_recipients cr
      JOIN contacts c ON cr.contact_id = c.id
      WHERE cr.campaign_id = $1
      ORDER BY cr.created_at
    `, [id]);

    const campaign = {
      ...campaignResult.rows[0],
      messages: messagesResult.rows,
      recipients: recipientsResult.rows
    };

    res.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new campaign
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const {
      name,
      description,
      type,
      message_count,
      interval_days,
      start_date,
      end_date,
      target_audience,
      settings,
      messages
    } = req.body;

    const userId = req.user!.id;

    if (!name || !type || !message_count || !messages) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (messages.length !== message_count) {
      return res.status(400).json({ error: 'Number of messages must match message_count' });
    }

    await pool.query('BEGIN');

    try {
      // Create campaign
      const campaignResult = await pool.query(`
        INSERT INTO campaigns (
          user_id, name, description, type, message_count, interval_days,
          start_date, end_date, target_audience, settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        userId,
        name,
        description,
        type,
        message_count,
        interval_days,
        start_date || null,
        end_date || null,
        target_audience ? JSON.stringify(target_audience) : null,
        settings ? JSON.stringify(settings) : null
      ]);

      const campaignId = campaignResult.rows[0].id;

      // Create campaign messages
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        await pool.query(`
          INSERT INTO campaign_messages (
            campaign_id, sequence_number, subject, message_body, message_type, personalization_fields
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          campaignId,
          i + 1,
          message.subject || null,
          message.message_body,
          type, // Use campaign type as message type
          message.personalization_fields ? JSON.stringify(message.personalization_fields) : null
        ]);
      }

      await pool.query('COMMIT');

      res.status(201).json({
        campaign: campaignResult.rows[0],
        message: 'Campaign created successfully'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a campaign
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const userId = req.user!.id;
    const {
      name,
      description,
      type,
      message_count,
      interval_days,
      start_date,
      end_date,
      target_audience,
      settings,
      messages
    } = req.body;

    // Check if campaign exists and belongs to user
    const existingCampaign = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingCampaign.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await pool.query('BEGIN');

    try {
      // Update campaign
      const updateResult = await pool.query(`
        UPDATE campaigns SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          type = COALESCE($3, type),
          message_count = COALESCE($4, message_count),
          interval_days = COALESCE($5, interval_days),
          start_date = COALESCE($6, start_date),
          end_date = COALESCE($7, end_date),
          target_audience = COALESCE($8, target_audience),
          settings = COALESCE($9, settings),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10 AND user_id = $11
        RETURNING *
      `, [
        name,
        description,
        type,
        message_count,
        interval_days,
        start_date,
        end_date,
        target_audience ? JSON.stringify(target_audience) : null,
        settings ? JSON.stringify(settings) : null,
        id,
        userId
      ]);

      // If messages are provided, update them
      if (messages && Array.isArray(messages)) {
        // Delete existing messages
        await pool.query('DELETE FROM campaign_messages WHERE campaign_id = $1', [id]);

        // Insert new messages
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          await pool.query(`
            INSERT INTO campaign_messages (
              campaign_id, sequence_number, subject, message_body, message_type, personalization_fields
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            id,
            i + 1,
            message.subject || null,
            message.message_body,
            type || existingCampaign.rows[0].type,
            message.personalization_fields ? JSON.stringify(message.personalization_fields) : null
          ]);
        }
      }

      await pool.query('COMMIT');

      res.json({
        campaign: updateResult.rows[0],
        message: 'Campaign updated successfully'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a campaign
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const userId = req.user!.id;

    const result = await pool.query(
      'DELETE FROM campaigns WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add recipients to a campaign
router.post('/:id/recipients', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { contact_ids } = req.body;
    const userId = req.user!.id;

    if (!contact_ids || !Array.isArray(contact_ids)) {
      return res.status(400).json({ error: 'contact_ids must be an array' });
    }

    // Check if campaign exists and belongs to user
    const campaignResult = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Add recipients
    const recipientPromises = contact_ids.map((contactId: number) =>
      pool!.query(`
        INSERT INTO campaign_recipients (campaign_id, contact_id)
        VALUES ($1, $2)
        ON CONFLICT (campaign_id, contact_id) DO NOTHING
        RETURNING *
      `, [id, contactId])
    );

    const results = await Promise.all(recipientPromises);
    const addedRecipients = results.flatMap(result => result.rows);

    res.json({
      added_recipients: addedRecipients,
      message: `${addedRecipients.length} recipients added to campaign`
    });
  } catch (error) {
    console.error('Error adding recipients to campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start a campaign
router.post('/:id/start', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const userId = req.user!.id;

    const result = await pool.query(`
      UPDATE campaigns 
      SET status = 'active', start_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status IN ('draft', 'paused')
      RETURNING *
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found or cannot be started' });
    }

    res.json({
      campaign: result.rows[0],
      message: 'Campaign started successfully'
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Pause/Resume a campaign
router.post('/:id/pause', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { action } = req.body; // 'pause' or 'resume'
    const userId = req.user!.id;

    if (!action || !['pause', 'resume'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "pause" or "resume"' });
    }

    const newStatus = action === 'pause' ? 'paused' : 'active';
    const allowedCurrentStatuses = action === 'pause' ? ['active'] : ['paused'];

    const result = await pool.query(`
      UPDATE campaigns 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3 AND status = ANY($4)
      RETURNING *
    `, [newStatus, id, userId, allowedCurrentStatuses]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: `Campaign not found or cannot be ${action}d` 
      });
    }

    res.json({
      campaign: result.rows[0],
      message: `Campaign ${action}d successfully`
    });
  } catch (error) {
    console.error(`Error ${req.body.action}ing campaign:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 