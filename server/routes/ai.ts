import { Request, Response, Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { openaiService } from '../services/openai.js';
import { pool } from '../index.js';

const router = Router();

// All AI routes require authentication
router.use(authenticateToken);

// Generate email draft
router.post('/generate-email', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      contactId,
      purpose,
      customPrompt,
      tone = 'professional'
    } = req.body;

    if (!contactId || !purpose) {
      return res.status(400).json({
        error: 'Contact ID and purpose are required'
      });
    }

    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    // Get contact details
    const contactResult = await pool.query(
      'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, req.user?.id]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }

    const contact = contactResult.rows[0];
    const userFirstName = req.user?.firstName || 'User';

    const emailDraft = await openaiService.generateEmailDraft({
      contactName: contact.name,
      contactCompany: contact.company,
      contactEmail: contact.email,
      purpose,
      customPrompt,
      userFirstName,
      previousNotes: contact.notes,
      tone
    });

    res.json({
      success: true,
      email: emailDraft,
      contact: {
        id: contact.id,
        name: contact.name,
        company: contact.company,
        email: contact.email
      }
    });
  } catch (error) {
    console.error('Email generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate email'
    });
  }
});

// Summarize contact notes
router.post('/summarize-notes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({
        error: 'Contact ID is required'
      });
    }

    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    // Get contact details
    const contactResult = await pool.query(
      'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, req.user?.id]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }

    const contact = contactResult.rows[0];
    
    if (!contact.notes) {
      return res.status(400).json({
        error: 'No notes available for this contact'
      });
    }

    // Split notes into individual entries (assuming notes are separated by newlines or timestamps)
    const notes = contact.notes.split('\n').filter((note: string) => note.trim().length > 0);

    const summary = await openaiService.summarizeContactNotes(notes, contact.name);

    res.json({
      success: true,
      summary,
      contact: {
        id: contact.id,
        name: contact.name,
        company: contact.company
      }
    });
  } catch (error) {
    console.error('Notes summarization error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to summarize notes'
    });
  }
});

// Generate follow-up suggestions
router.post('/follow-up-suggestions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({
        error: 'Contact ID is required'
      });
    }

    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    // Get contact details
    const contactResult = await pool.query(
      'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
      [contactId, req.user?.id]
    );

    if (contactResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Contact not found'
      });
    }

    const contact = contactResult.rows[0];
    const suggestions = await openaiService.generateFollowUpSuggestions(contact);

    res.json({
      success: true,
      suggestions,
      contact: {
        id: contact.id,
        name: contact.name,
        company: contact.company,
        status: contact.status
      }
    });
  } catch (error) {
    console.error('Follow-up suggestions error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate follow-up suggestions'
    });
  }
});

// Generate campaign content
router.post('/generate-campaign', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      campaignType,
      audience,
      topic,
      tone = 'professional',
      length = 'medium',
      callToAction
    } = req.body;

    if (!campaignType || !audience || !topic) {
      return res.status(400).json({
        error: 'Campaign type, audience, and topic are required'
      });
    }

    const content = await openaiService.generateCampaignContent({
      campaignType,
      audience,
      topic,
      tone,
      length,
      callToAction
    });

    res.json({
      success: true,
      content
    });
  } catch (error) {
    console.error('Campaign generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate campaign content'
    });
  }
});

// Analyze contact insights
router.get('/contact-insights', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!pool) {
      return res.status(500).json({
        error: 'Database connection not available'
      });
    }

    // Get all contacts for the authenticated user
    const contactsResult = await pool.query(
      'SELECT * FROM contacts WHERE user_id = $1',
      [req.user?.id]
    );

    if (contactsResult.rows.length === 0) {
      return res.json({
        success: true,
        insights: {
          totalContacts: 0,
          insights: ['No contacts available for analysis'],
          recommendations: ['Add contacts to your CRM to get insights'],
          trends: []
        }
      });
    }

    const contacts = contactsResult.rows;
    const insights = await openaiService.analyzeContactInsights(contacts);

    res.json({
      success: true,
      insights
    });
  } catch (error) {
    console.error('Contact insights error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to analyze contact insights'
    });
  }
});

// Check AI service status
router.get('/status', (req: Request, res: Response) => {
  const isConfigured = process.env.OPENAI_API_KEY ? true : false;
  
  res.json({
    success: true,
    configured: isConfigured,
    message: isConfigured 
      ? 'OpenAI service is configured and ready' 
      : 'OpenAI API key is not configured'
  });
});

export default router; 