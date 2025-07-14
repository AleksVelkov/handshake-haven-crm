import { Request, Response, Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { linkedinService, LinkedInService } from '../services/linkedin.js';
import { pool } from '../index.js';
import crypto from 'crypto';

const router = Router();

// OAuth state storage (in production, use Redis or database)
const oauthStates = new Map<string, { userId: string; timestamp: number }>();

// Clean up expired states every hour
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [state, data] of oauthStates.entries()) {
    if (data.timestamp < oneHourAgo) {
      oauthStates.delete(state);
    }
  }
}, 60 * 60 * 1000);

// Check LinkedIn configuration status
router.get('/status', (req: Request, res: Response) => {
  const isConfigured = LinkedInService.isConfigured();
  
  res.json({
    success: true,
    configured: isConfigured,
    message: isConfigured 
      ? 'LinkedIn integration is configured and ready' 
      : 'LinkedIn credentials are not configured'
  });
});

// Initiate LinkedIn OAuth flow
router.get('/auth/initiate', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, {
      userId: req.user!.id,
      timestamp: Date.now()
    });

    const authUrl = linkedinService.generateAuthUrl(state);
    
    res.json({
      success: true,
      authUrl,
      state
    });
  } catch (error) {
    console.error('LinkedIn auth initiation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to initiate LinkedIn authentication'
    });
  }
});

// Handle LinkedIn OAuth callback
router.get('/auth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query;

    console.log('LinkedIn OAuth callback received:', {
      hasCode: !!code,
      hasState: !!state,
      error: oauthError,
      fullUrl: req.url
    });

    if (oauthError) {
      console.error('LinkedIn OAuth error:', oauthError);
      return res.status(400).json({
        error: `LinkedIn OAuth error: ${oauthError}`
      });
    }

    if (!code || !state) {
      console.error('Missing code or state:', { code: !!code, state: !!state });
      return res.status(400).json({
        error: 'Missing authorization code or state'
      });
    }

    // Verify state
    const stateData = oauthStates.get(state as string);
    if (!stateData) {
      console.error('Invalid state parameter:', state);
      return res.status(400).json({
        error: 'Invalid or expired state parameter'
      });
    }

    console.log('State verified for user:', stateData.userId);

    // Clean up state
    oauthStates.delete(state as string);

    // Exchange code for token
    console.log('Exchanging code for token...');
    const tokenData = await linkedinService.exchangeCodeForToken(code as string);
    console.log('Token exchange successful');
    
    // Get user profile
    console.log('Fetching LinkedIn profile...');
    const profile = await linkedinService.getProfile(tokenData.access_token);
    console.log('Profile fetched:', profile.id);
    
    // Get email
    let email: string | undefined;
    try {
      console.log('Fetching email address...');
      email = await linkedinService.getEmailAddress(tokenData.access_token);
      console.log('Email fetched:', email);
    } catch (error) {
      console.warn('Could not fetch email from LinkedIn:', error);
    }

    // Save connection
    console.log('Saving LinkedIn connection...');
    await linkedinService.saveConnection(stateData.userId, tokenData, profile, email);
    console.log('LinkedIn connection saved successfully');

    // Redirect to success page - use production URL for DigitalOcean
    const frontendUrl = process.env.FRONTEND_URL || 
                       (process.env.NODE_ENV === 'production' ? 'https://handshake-crm-36ymw.ondigitalocean.app' : 'http://localhost:5173');
    
    const redirectUrl = `${frontendUrl}/dashboard?linkedin=connected`;
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 
                       (process.env.NODE_ENV === 'production' ? 'https://handshake-crm-36ymw.ondigitalocean.app' : 'http://localhost:5173');
    const redirectUrl = `${frontendUrl}/dashboard?linkedin=error`;
    console.log('Error - redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  }
});

// Get LinkedIn connection status
router.get('/connection', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const connection = await linkedinService.getConnection(req.user!.id);
    
    if (!connection) {
      return res.json({
        success: true,
        connected: false,
        connection: null
      });
    }

    // Don't send sensitive data
    const safeConnection = {
      id: connection.id,
      firstName: connection.firstName,
      lastName: connection.lastName,
      email: connection.email,
      profilePictureUrl: connection.profilePictureUrl,
      headline: connection.headline,
      publicProfileUrl: connection.publicProfileUrl,
      isActive: connection.isActive,
    };

    res.json({
      success: true,
      connected: true,
      connection: safeConnection
    });
  } catch (error) {
    console.error('LinkedIn connection status error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get LinkedIn connection status'
    });
  }
});

// Disconnect LinkedIn
router.delete('/connection', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    await pool.query(
      'UPDATE linkedin_connections SET is_active = false WHERE user_id = $1',
      [req.user!.id]
    );

    res.json({
      success: true,
      message: 'LinkedIn connection disabled'
    });
  } catch (error) {
    console.error('LinkedIn disconnect error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to disconnect LinkedIn'
    });
  }
});

// Send LinkedIn message
router.post('/messages/send', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { recipientId, message, subject } = req.body;

    if (!recipientId || !message) {
      return res.status(400).json({
        error: 'Recipient ID and message are required'
      });
    }

    const connection = await linkedinService.getConnection(req.user!.id);
    if (!connection) {
      return res.status(400).json({
        error: 'No LinkedIn connection found'
      });
    }

    // Validate and refresh token if needed
    const tokenValid = await linkedinService.validateAndRefreshToken(req.user!.id);
    if (!tokenValid) {
      return res.status(401).json({
        error: 'LinkedIn token expired. Please reconnect.'
      });
    }

    const messageId = await linkedinService.sendMessage(
      connection.accessToken,
      recipientId,
      message,
      subject
    );

    res.json({
      success: true,
      messageId,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('LinkedIn send message error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to send LinkedIn message'
    });
  }
});

// Get LinkedIn conversations
router.get('/messages/conversations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(`
      SELECT 
        conversation_id,
        contact_name,
        contact_avatar,
        contact_headline,
        message_count,
        unread_count,
        last_message_at,
        last_message_content,
        last_message_direction
      FROM linkedin_message_conversations 
      WHERE user_id = $1
      ORDER BY last_message_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user!.id, limit, offset]);

    res.json({
      success: true,
      conversations: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.rowCount || 0
      }
    });
  } catch (error) {
    console.error('LinkedIn conversations fetch error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch conversations'
    });
  }
});

// Get messages for a conversation
router.get('/messages/conversation/:conversationId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(`
      SELECT 
        lm.*,
        lc.first_name || ' ' || lc.last_name AS contact_name,
        lc.profile_picture_url AS contact_avatar
      FROM linkedin_messages lm
      LEFT JOIN linkedin_contacts lc ON lm.linkedin_contact_id = lc.id
      WHERE lm.user_id = $1 AND lm.conversation_id = $2
      ORDER BY lm.sent_at DESC
      LIMIT $3 OFFSET $4
    `, [req.user!.id, conversationId, limit, offset]);

    // Mark messages as read
    await pool.query(`
      UPDATE linkedin_messages 
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND conversation_id = $2 AND direction = 'inbound' AND NOT is_read
    `, [req.user!.id, conversationId]);

    res.json({
      success: true,
      messages: result.rows.reverse(), // Return in chronological order
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.rowCount || 0
      }
    });
  } catch (error) {
    console.error('LinkedIn messages fetch error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch messages'
    });
  }
});

// Create LinkedIn post
router.post('/posts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, visibility = 'PUBLIC', mediaUrls } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Post content is required'
      });
    }

    const connection = await linkedinService.getConnection(req.user!.id);
    if (!connection) {
      return res.status(400).json({
        error: 'No LinkedIn connection found'
      });
    }

    // Validate and refresh token if needed
    const tokenValid = await linkedinService.validateAndRefreshToken(req.user!.id);
    if (!tokenValid) {
      return res.status(401).json({
        error: 'LinkedIn token expired. Please reconnect.'
      });
    }

    const postId = await linkedinService.createPost(
      connection.accessToken,
      content,
      visibility,
      mediaUrls
    );

    // Save post to database
    await linkedinService.savePost(
      req.user!.id,
      connection.id,
      { id: postId },
      content,
      visibility
    );

    res.json({
      success: true,
      postId,
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('LinkedIn create post error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to create LinkedIn post'
    });
  }
});

// Get LinkedIn posts
router.get('/posts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(`
      SELECT 
        id, post_id, content, visibility, status, published_at, 
        engagement_data, post_url, created_at
      FROM linkedin_posts 
      WHERE user_id = $1
      ORDER BY published_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user!.id, limit, offset]);

    res.json({
      success: true,
      posts: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: result.rowCount || 0
      }
    });
  } catch (error) {
    console.error('LinkedIn posts fetch error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch posts'
    });
  }
});

// Sync LinkedIn data
router.post('/sync', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const connection = await linkedinService.getConnection(req.user!.id);
    if (!connection) {
      return res.status(400).json({
        error: 'No LinkedIn connection found'
      });
    }

    // Validate and refresh token if needed
    const tokenValid = await linkedinService.validateAndRefreshToken(req.user!.id);
    if (!tokenValid) {
      return res.status(401).json({
        error: 'LinkedIn token expired. Please reconnect.'
      });
    }

    // Sync messages
    await linkedinService.syncMessages(req.user!.id);

    // Update last sync timestamp
    if (pool) {
      await pool.query(
        'UPDATE linkedin_connections SET last_sync = CURRENT_TIMESTAMP WHERE user_id = $1',
        [req.user!.id]
      );
    }

    res.json({
      success: true,
      message: 'LinkedIn data synced successfully'
    });
  } catch (error) {
    console.error('LinkedIn sync error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to sync LinkedIn data'
    });
  }
});

// Get message drafts
router.get('/messages/drafts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    const result = await pool.query(`
      SELECT 
        lmd.*,
        lc.first_name || ' ' || lc.last_name AS recipient_name,
        lc.profile_picture_url AS recipient_avatar
      FROM linkedin_message_drafts lmd
      LEFT JOIN linkedin_contacts lc ON lmd.linkedin_contact_id = lc.id
      WHERE lmd.user_id = $1
      ORDER BY lmd.created_at DESC
    `, [req.user!.id]);

    res.json({
      success: true,
      drafts: result.rows
    });
  } catch (error) {
    console.error('LinkedIn drafts fetch error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch drafts'
    });
  }
});

// Save message draft
router.post('/messages/drafts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      recipientLinkedinId,
      recipientName,
      subject,
      content,
      isTemplate,
      templateName,
      aiGenerated,
      aiPrompt
    } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Message content is required'
      });
    }

    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    const connection = await linkedinService.getConnection(req.user!.id);
    if (!connection) {
      return res.status(400).json({
        error: 'No LinkedIn connection found'
      });
    }

    const result = await pool.query(`
      INSERT INTO linkedin_message_drafts (
        user_id, linkedin_connection_id, subject, content,
        recipient_linkedin_id, recipient_name, is_template, template_name,
        ai_generated, ai_prompt
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      req.user!.id,
      connection.id,
      subject || null,
      content,
      recipientLinkedinId || null,
      recipientName || null,
      isTemplate || false,
      templateName || null,
      aiGenerated || false,
      aiPrompt || null
    ]);

    res.json({
      success: true,
      draftId: result.rows[0].id,
      message: 'Draft saved successfully'
    });
  } catch (error) {
    console.error('LinkedIn save draft error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save draft'
    });
  }
});

// Get unread message count
router.get('/messages/unread-count', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    const result = await pool.query(`
      SELECT COUNT(*) as unread_count
      FROM linkedin_messages 
      WHERE user_id = $1 AND direction = 'inbound' AND NOT is_read
    `, [req.user!.id]);

    res.json({
      success: true,
      unreadCount: parseInt(result.rows[0].unread_count) || 0
    });
  } catch (error) {
    console.error('LinkedIn unread count error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get unread count'
    });
  }
});

export default router; 