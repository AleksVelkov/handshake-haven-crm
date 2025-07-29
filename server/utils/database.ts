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
    // Users table (from User.ts model)
    await pool.query(CREATE_USERS_TABLE);

    // Contacts table (from Contact.ts model)
    await pool.query(CREATE_CONTACTS_TABLE);

    // LinkedIn connections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS linkedin_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Campaigns table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL CHECK (type IN ('linkedin', 'email', 'mixed')),
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
        message_count INTEGER NOT NULL DEFAULT 1,
        interval_days INTEGER NOT NULL DEFAULT 1,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        target_audience JSONB,
        settings JSONB,
        stats JSONB DEFAULT '{"sent": 0, "delivered": 0, "opened": 0, "replied": 0}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Campaign messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL,
        sequence_number INTEGER NOT NULL,
        subject VARCHAR(255),
        message_body TEXT NOT NULL,
        message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('linkedin', 'email')),
        personalization_fields JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        UNIQUE(campaign_id, sequence_number, message_type)
      )
    `);

    // Campaign recipients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL,
        contact_id UUID NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'replied', 'bounced', 'failed')),
        current_message_sequence INTEGER DEFAULT 1,
        last_message_sent_at TIMESTAMP,
        next_message_scheduled_at TIMESTAMP,
        personalized_data JSONB,
        interaction_history JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        UNIQUE(campaign_id, contact_id)
      )
    `);

    // Message templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('linkedin', 'email')),
        subject VARCHAR(255),
        message_body TEXT NOT NULL,
        personalization_fields JSONB,
        usage_count INTEGER DEFAULT 0,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // LinkedIn messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS linkedin_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        linkedin_connection_id UUID,
        campaign_id UUID,
        contact_id UUID NOT NULL,
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (linkedin_connection_id) REFERENCES linkedin_connections(id) ON DELETE SET NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
        UNIQUE(message_id)
      )
    `);

    // LinkedIn posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS linkedin_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        linkedin_connection_id UUID,
        post_id VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        visibility VARCHAR(50) DEFAULT 'PUBLIC',
        status VARCHAR(50) DEFAULT 'published',
        published_at TIMESTAMP,
        engagement_data JSONB,
        post_url TEXT,
        raw_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (linkedin_connection_id) REFERENCES linkedin_connections(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ All database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating database tables:', error);
    throw error;
  }
}; 