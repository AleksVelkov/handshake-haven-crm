import { pool } from '../index.js';
import { CREATE_CONTACTS_TABLE } from '../models/Contact.js';
import { CREATE_USERS_TABLE } from '../models/User.js';

export const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    if (!pool) {
      console.log('No database pool available - skipping database initialization');
      return;
    }
    
    // Use the comprehensive table creation function
    await createTables();
    
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

export const createTables = async () => {
  if (!pool) {
    throw new Error('Database pool is not initialized');
  }
  
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Contacts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(200),
        position VARCHAR(200),
        linkedin_url VARCHAR(500),
        notes TEXT,
        tags TEXT[],
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // LinkedIn connections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS linkedin_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        linkedin_user_id VARCHAR(255) UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        profile_data JSONB,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        profile_picture_url TEXT,
        headline TEXT,
        public_profile_url TEXT,
        is_active BOOLEAN DEFAULT true,
        last_sync TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Campaigns table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL CHECK (type IN ('linkedin', 'email', 'mixed')),
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
        message_count INTEGER NOT NULL DEFAULT 1,
        interval_days INTEGER NOT NULL DEFAULT 1,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        target_audience JSONB, -- Store targeting criteria
        settings JSONB, -- Store campaign-specific settings
        stats JSONB DEFAULT '{"sent": 0, "delivered": 0, "opened": 0, "replied": 0}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Campaign messages table (templates for each step in the campaign)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_messages (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        sequence_number INTEGER NOT NULL, -- 1, 2, 3... for message order
        subject VARCHAR(255), -- For email campaigns
        message_body TEXT NOT NULL,
        message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('linkedin', 'email')),
        personalization_fields JSONB, -- Store merge fields like {{firstName}}, {{company}}
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(campaign_id, sequence_number, message_type)
      )
    `);

    // Campaign recipients table (who will receive the campaign)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'failed')),
        current_message_sequence INTEGER DEFAULT 1,
        last_message_sent_at TIMESTAMP,
        next_message_scheduled_at TIMESTAMP,
        personalized_data JSONB, -- Store personalized data for this recipient
        interaction_history JSONB DEFAULT '[]', -- Store interaction history
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(campaign_id, contact_id)
      )
    `);

    // Message templates table (reusable templates)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100), -- 'outreach', 'follow-up', 'cold-email', etc.
        message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('linkedin', 'email')),
        subject VARCHAR(255), -- For email templates
        message_body TEXT NOT NULL,
        personalization_fields JSONB, -- Available merge fields
        usage_count INTEGER DEFAULT 0,
        is_public BOOLEAN DEFAULT false, -- Share with other users
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // LinkedIn messages table (for tracking actual sent messages)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS linkedin_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        linkedin_connection_id INTEGER REFERENCES linkedin_connections(id),
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        conversation_id VARCHAR(255),
        message_id VARCHAR(255),
        sender_id VARCHAR(255),
        recipient_id VARCHAR(255),
        direction VARCHAR(20) CHECK (direction IN ('inbound', 'outbound')),
        content TEXT,
        sent_at TIMESTAMP,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id)
      )
    `);

    // LinkedIn posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS linkedin_posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        linkedin_connection_id INTEGER REFERENCES linkedin_connections(id),
        post_id VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        visibility VARCHAR(50) DEFAULT 'PUBLIC',
        status VARCHAR(50) DEFAULT 'published',
        published_at TIMESTAMP,
        engagement_data JSONB,
        post_url TEXT,
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ All database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating database tables:', error);
    throw error;
  }
}; 