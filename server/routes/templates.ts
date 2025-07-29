import { Request, Response, Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { pool } from '../index.js';

const router = Router();

// Get all templates for the authenticated user
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { category, message_type, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT 
        *,
        (CASE WHEN user_id = $1 THEN 'owner' ELSE 'public' END) as ownership
      FROM message_templates 
      WHERE (user_id = $1 OR is_public = true)
    `;
    const queryParams: any[] = [req.user!.id];

    // Add filters
    if (category) {
      query += ` AND category = $${queryParams.length + 1}`;
      queryParams.push(category);
    }
    if (message_type) {
      query += ` AND message_type = $${queryParams.length + 1}`;
      queryParams.push(message_type);
    }

    query += `
      ORDER BY 
        (CASE WHEN user_id = $1 THEN 0 ELSE 1 END),
        usage_count DESC,
        created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM message_templates 
      WHERE (user_id = $1 OR is_public = true)
    `;
    const countParams: any[] = [req.user!.id];
    if (category) {
      countQuery += ` AND category = $${countParams.length + 1}`;
      countParams.push(category);
    }
    if (message_type) {
      countQuery += ` AND message_type = $${countParams.length + 1}`;
      countParams.push(message_type);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      templates: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch templates'
    });
  }
});

// Get template categories and stats
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Get categories with counts
    const categoriesResult = await pool.query(`
      SELECT 
        category,
        message_type,
        COUNT(*) as count,
        AVG(usage_count) as avg_usage
      FROM message_templates 
      WHERE (user_id = $1 OR is_public = true)
      GROUP BY category, message_type
      ORDER BY count DESC
    `, [req.user!.id]);

    // Get total stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_templates,
        COUNT(CASE WHEN user_id = $1 THEN 1 END) as user_templates,
        COUNT(CASE WHEN is_public = true THEN 1 END) as public_templates,
        SUM(usage_count) as total_usage
      FROM message_templates 
      WHERE (user_id = $1 OR is_public = true)
    `, [req.user!.id]);

    res.json({
      success: true,
      categories: categoriesResult.rows,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching template stats:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch template stats'
    });
  }
});

// Get a specific template
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM message_templates 
      WHERE id = $1 AND (user_id = $2 OR is_public = true)
    `, [id, req.user!.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      template: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch template'
    });
  }
});

// Create a new template
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const {
      name,
      description,
      category,
      message_type,
      subject,
      message_body,
      personalization_fields,
      is_public
    } = req.body;

    // Validate required fields
    if (!name || !message_type || !message_body) {
      return res.status(400).json({
        error: 'Missing required fields: name, message_type, message_body'
      });
    }

    const result = await pool.query(`
      INSERT INTO message_templates (
        user_id, name, description, category, message_type, 
        subject, message_body, personalization_fields, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      req.user!.id,
      name,
      description,
      category,
      message_type,
      subject,
      message_body,
      JSON.stringify(personalization_fields || {}),
      is_public || false
    ]);

    res.status(201).json({
      success: true,
      template: result.rows[0],
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create template'
    });
  }
});

// Update a template
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const {
      name,
      description,
      category,
      message_type,
      subject,
      message_body,
      personalization_fields,
      is_public
    } = req.body;

    const result = await pool.query(`
      UPDATE message_templates SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        message_type = COALESCE($4, message_type),
        subject = COALESCE($5, subject),
        message_body = COALESCE($6, message_body),
        personalization_fields = COALESCE($7, personalization_fields),
        is_public = COALESCE($8, is_public),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `, [
      name,
      description,
      category,
      message_type,
      subject,
      message_body,
      personalization_fields ? JSON.stringify(personalization_fields) : null,
      is_public,
      id,
      req.user!.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      template: result.rows[0],
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update template'
    });
  }
});

// Delete a template
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM message_templates WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to delete template'
    });
  }
});

// Increment template usage count
router.post('/:id/use', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;

    const result = await pool.query(`
      UPDATE message_templates SET
        usage_count = usage_count + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND (user_id = $2 OR is_public = true)
      RETURNING *
    `, [id, req.user!.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({
      success: true,
      template: result.rows[0],
      message: 'Template usage recorded'
    });
  } catch (error) {
    console.error('Error recording template usage:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to record template usage'
    });
  }
});

export default router; 