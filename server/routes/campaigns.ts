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
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch campaigns'
    });
  }
});

// Get a specific campaign with its messages
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;

    // Get campaign details
    const campaignResult = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get campaign messages
    const messagesResult = await pool.query(
      'SELECT * FROM campaign_messages WHERE campaign_id = $1 ORDER BY sequence_number, message_type',
      [id]
    );

    // Get campaign recipients
    const recipientsResult = await pool.query(`
      SELECT 
        cr.*,
        c.first_name,
        c.last_name,
        c.email,
        c.company
      FROM campaign_recipients cr
      JOIN contacts c ON cr.contact_id = c.id
      WHERE cr.campaign_id = $1
      ORDER BY cr.created_at DESC
    `, [id]);

    const campaign = campaignResult.rows[0];
    res.json({
      success: true,
      campaign: {
        ...campaign,
        messages: messagesResult.rows,
        recipients: recipientsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch campaign'
    });
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
      target_audience,
      settings,
      messages
    } = req.body;

    // Validate required fields
    if (!name || !type || !message_count || !messages) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, message_count, messages'
      });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Create campaign
      const campaignResult = await pool.query(`
        INSERT INTO campaigns (
          user_id, name, description, type, message_count, interval_days,
          start_date, target_audience, settings
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        req.user!.id,
        name,
        description,
        type,
        message_count,
        interval_days || 1,
        start_date || null,
        JSON.stringify(target_audience || {}),
        JSON.stringify(settings || {})
      ]);

      const campaign = campaignResult.rows[0];

      // Create campaign messages
      for (const message of messages) {
        await pool.query(`
          INSERT INTO campaign_messages (
            campaign_id, sequence_number, subject, message_body, 
            message_type, personalization_fields
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          campaign.id,
          message.sequence_number,
          message.subject || null,
          message.message_body,
          message.message_type,
          JSON.stringify(message.personalization_fields || {})
        ]);
      }

      await pool.query('COMMIT');

      res.status(201).json({
        success: true,
        campaign,
        message: 'Campaign created successfully'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create campaign'
    });
  }
});

// Update a campaign
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const {
      name,
      description,
      type,
      status,
      message_count,
      interval_days,
      start_date,
      target_audience,
      settings,
      messages
    } = req.body;

    // Check if campaign exists and belongs to user
    const existingCampaign = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (existingCampaign.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Update campaign
      const updateResult = await pool.query(`
        UPDATE campaigns SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          type = COALESCE($3, type),
          status = COALESCE($4, status),
          message_count = COALESCE($5, message_count),
          interval_days = COALESCE($6, interval_days),
          start_date = COALESCE($7, start_date),
          target_audience = COALESCE($8, target_audience),
          settings = COALESCE($9, settings),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10 AND user_id = $11
        RETURNING *
      `, [
        name,
        description,
        type,
        status,
        message_count,
        interval_days,
        start_date,
        target_audience ? JSON.stringify(target_audience) : null,
        settings ? JSON.stringify(settings) : null,
        id,
        req.user!.id
      ]);

      // Update messages if provided
      if (messages) {
        // Delete existing messages
        await pool.query('DELETE FROM campaign_messages WHERE campaign_id = $1', [id]);

        // Insert new messages
        for (const message of messages) {
          await pool.query(`
            INSERT INTO campaign_messages (
              campaign_id, sequence_number, subject, message_body, 
              message_type, personalization_fields
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            id,
            message.sequence_number,
            message.subject || null,
            message.message_body,
            message.message_type,
            JSON.stringify(message.personalization_fields || {})
          ]);
        }
      }

      await pool.query('COMMIT');

      res.json({
        success: true,
        campaign: updateResult.rows[0],
        message: 'Campaign updated successfully'
      });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update campaign'
    });
  }
});

// Delete a campaign
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM campaigns WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete campaign'
    });
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

    if (!contact_ids || !Array.isArray(contact_ids)) {
      return res.status(400).json({ error: 'contact_ids array is required' });
    }

    // Check if campaign exists and belongs to user
    const campaignResult = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2',
      [id, req.user!.id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Add recipients
    const recipientPromises = contact_ids.map((contactId: number) =>
      pool.query(`
        INSERT INTO campaign_recipients (campaign_id, contact_id)
        VALUES ($1, $2)
        ON CONFLICT (campaign_id, contact_id) DO NOTHING
        RETURNING *
      `, [id, contactId])
    );

    const results = await Promise.all(recipientPromises);
    const addedRecipients = results.filter(r => r.rows.length > 0).map(r => r.rows[0]);

    res.json({
      success: true,
      added_recipients: addedRecipients,
      message: `${addedRecipients.length} recipients added to campaign`
    });
  } catch (error) {
    console.error('Error adding recipients to campaign:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to add recipients to campaign'
    });
  }
});

// Start/activate a campaign
router.post('/:id/start', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;

    const result = await pool.query(`
      UPDATE campaigns SET
        status = 'active',
        start_date = CASE WHEN start_date IS NULL THEN CURRENT_TIMESTAMP ELSE start_date END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status = 'draft'
      RETURNING *
    `, [id, req.user!.id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Campaign not found or cannot be started (must be in draft status)'
      });
    }

    res.json({
      success: true,
      campaign: result.rows[0],
      message: 'Campaign started successfully'
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to start campaign'
    });
  }
});

// Pause/resume a campaign
router.post('/:id/pause', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { action } = req.body; // 'pause' or 'resume'

    const newStatus = action === 'resume' ? 'active' : 'paused';
    const result = await pool.query(`
      UPDATE campaigns SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3 AND status IN ('active', 'paused')
      RETURNING *
    `, [newStatus, id, req.user!.id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Campaign not found or cannot be paused/resumed'
      });
    }

    res.json({
      success: true,
      campaign: result.rows[0],
      message: `Campaign ${action === 'resume' ? 'resumed' : 'paused'} successfully`
    });
  } catch (error) {
    console.error('Error pausing/resuming campaign:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to pause/resume campaign'
    });
  }
});

export default router; 