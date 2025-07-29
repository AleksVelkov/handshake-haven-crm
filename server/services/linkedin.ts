import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { pool } from '../index.js';

// LinkedIn API configuration
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
const LINKEDIN_AUTH_BASE = 'https://www.linkedin.com/oauth/v2';

// LinkedIn OAuth scopes - Full scopes for approved LinkedIn app
const LINKEDIN_SCOPES = [
  'r_basicprofile',  // Basic profile information
  'r_emailaddress'   // Email address (requires approved LinkedIn app)
].join(' ');

export interface LinkedInProfile {
  id: string;
  firstName: {
    localized: { [key: string]: string };
  };
  lastName: {
    localized: { [key: string]: string };
  };
  profilePicture?: {
    displayImage: string;
  };
  headline?: {
    localized: { [key: string]: string };
  };
  vanityName?: string;
}

export interface LinkedInMessage {
  id: string;
  conversationId: string;
  from: string;
  to: string[];
  subject?: string;
  body: string;
  sentAt: string;
  messageType: 'text' | 'media';
  mediaUrl?: string;
}

export interface LinkedInPost {
  id: string;
  content: string;
  visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
  mediaUrls?: string[];
  publishedAt: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface LinkedInConnection {
  id: string;
  userId: string;
  linkedinUserId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  profileData: any;
  firstName: string;
  lastName: string;
  email?: string;
  profilePictureUrl?: string;
  headline?: string;
  publicProfileUrl?: string;
  isActive: boolean;
}

export class LinkedInService {
  private static instance: LinkedInService;
  private apiClient: AxiosInstance;

  private constructor() {
    this.apiClient = axios.create({
      baseURL: LINKEDIN_API_BASE,
      timeout: 30000,
    });
  }

  public static getInstance(): LinkedInService {
    if (!LinkedInService.instance) {
      LinkedInService.instance = new LinkedInService();
    }
    return LinkedInService.instance;
  }

  // OAuth Methods
  generateAuthUrl(state: string): string {
    // Ensure proper URL encoding for all parameters
    const clientId = encodeURIComponent(process.env.LINKEDIN_CLIENT_ID!);
    const redirectUri = encodeURIComponent(process.env.LINKEDIN_REDIRECT_URI!);
    const stateParam = encodeURIComponent(state);
    const scope = encodeURIComponent(LINKEDIN_SCOPES);
    
    const authUrl = `${LINKEDIN_AUTH_BASE}/authorization?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `state=${stateParam}&` +
      `scope=${scope}`;
    
    // Debug logging for production
    console.log('LinkedIn Auth URL Generation:');
    console.log('- Client ID:', process.env.LINKEDIN_CLIENT_ID);
    console.log('- Redirect URI:', process.env.LINKEDIN_REDIRECT_URI);
    console.log('- Scope:', LINKEDIN_SCOPES);
    console.log('- Generated URL:', authUrl);
    
    return authUrl;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    try {
      // Prepare form-encoded data for LinkedIn OAuth token exchange
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append('client_id', process.env.LINKEDIN_CLIENT_ID!);
      params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET!);
      params.append('redirect_uri', process.env.LINKEDIN_REDIRECT_URI!);

      const response = await axios.post(`${LINKEDIN_AUTH_BASE}/accessToken`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      console.log('LinkedIn token exchange successful:', {
        access_token: response.data.access_token ? 'present' : 'missing',
        expires_in: response.data.expires_in
      });

      return response.data;
    } catch (error) {
      console.error('LinkedIn token exchange error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('Token exchange failed - Status:', axiosError.response?.status);
        console.error('Token exchange failed - Data:', JSON.stringify(axiosError.response?.data, null, 2));
      }
      throw new Error('Failed to exchange authorization code for access token');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    try {
      // Prepare form-encoded data for LinkedIn OAuth token refresh
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
      params.append('client_id', process.env.LINKEDIN_CLIENT_ID!);
      params.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET!);

      const response = await axios.post(`${LINKEDIN_AUTH_BASE}/accessToken`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error) {
      console.error('LinkedIn token refresh error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('Token refresh failed - Status:', axiosError.response?.status);
        console.error('Token refresh failed - Data:', JSON.stringify(axiosError.response?.data, null, 2));
      }
      throw new Error('Failed to refresh access token');
    }
  }

  // Profile Methods
  async getProfile(accessToken: string): Promise<LinkedInProfile> {
    try {
      // Use current LinkedIn API v2 endpoint for basic profile with r_basicprofile scope
      const response = await this.apiClient.get('/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('LinkedIn profile response:', JSON.stringify(response.data, null, 2));

      // Transform the response to match our interface
      const profileData = response.data;
      const profile: LinkedInProfile = {
        id: profileData.id,
        firstName: {
          localized: profileData.firstName?.localized || { 'en_US': 'Unknown' }
        },
        lastName: {
          localized: profileData.lastName?.localized || { 'en_US': 'Unknown' }
        },
        profilePicture: profileData.profilePicture ? {
          displayImage: profileData.profilePicture.displayImage
        } : undefined,
        headline: profileData.headline ? {
          localized: profileData.headline.localized
        } : undefined,
        vanityName: profileData.vanityName
      };

      return profile;
    } catch (error) {
      console.error('LinkedIn profile fetch error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('Response status:', axiosError.response?.status);
        console.error('Response data:', JSON.stringify(axiosError.response?.data, null, 2));
      }
      throw new Error('Failed to fetch LinkedIn profile');
    }
  }

  async getEmailAddress(accessToken: string): Promise<string> {
    try {
      // Use current LinkedIn API v2 for email with r_emailaddress scope
      const response = await this.apiClient.get('/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('LinkedIn email response:', JSON.stringify(response.data, null, 2));

      const email = response.data?.elements?.[0]?.['handle~']?.emailAddress;
      if (!email) {
        throw new Error('No email address found');
      }

      return email;
    } catch (error) {
      console.error('LinkedIn email fetch error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('Response status:', axiosError.response?.status);
        console.error('Response data:', JSON.stringify(axiosError.response?.data, null, 2));
        
        // Provide more specific error messages
        if (axiosError.response?.status === 403) {
          throw new Error('Access denied - ensure r_emailaddress permission is granted');
        } else if (axiosError.response?.status === 404) {
          throw new Error('Email endpoint not found - check API permissions');
        }
      }
      throw new Error('Failed to fetch LinkedIn email address');
    }
  }

  // Connection Management
  async saveConnection(userId: string, tokenData: any, profileData: LinkedInProfile, email?: string): Promise<string> {
    if (!pool) {
      throw new Error('Database connection not available');
    }

    try {
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
      
      const firstName = Object.values(profileData.firstName.localized)[0] as string;
      const lastName = Object.values(profileData.lastName.localized)[0] as string;
      const headline = profileData.headline ? Object.values(profileData.headline.localized)[0] as string : null;
      const profilePictureUrl = profileData.profilePicture?.displayImage || null;
      const publicProfileUrl = profileData.vanityName ? `https://www.linkedin.com/in/${profileData.vanityName}` : null;

      const result = await pool.query(`
        INSERT INTO linkedin_connections (
          user_id, linkedin_user_id, access_token, refresh_token, token_expires_at,
          profile_data, first_name, last_name, email, profile_picture_url, 
          headline, public_profile_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          profile_data = EXCLUDED.profile_data,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          email = EXCLUDED.email,
          profile_picture_url = EXCLUDED.profile_picture_url,
          headline = EXCLUDED.headline,
          public_profile_url = EXCLUDED.public_profile_url,
          is_active = true,
          last_sync = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `, [
        userId,
        profileData.id,
        tokenData.access_token,
        tokenData.refresh_token || null,
        expiresAt,
        JSON.stringify(profileData),
        firstName,
        lastName,
        email || null,
        profilePictureUrl,
        headline,
        publicProfileUrl
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Error saving LinkedIn connection:', error);
      throw new Error('Failed to save LinkedIn connection');
    }
  }

  async getConnection(userId: string): Promise<LinkedInConnection | null> {
    if (!pool) {
      throw new Error('Database connection not available');
    }

    try {
      const result = await pool.query(
        'SELECT * FROM linkedin_connections WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        linkedinUserId: row.linkedin_user_id,
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        tokenExpiresAt: row.token_expires_at,
        profileData: row.profile_data,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        profilePictureUrl: row.profile_picture_url,
        headline: row.headline,
        publicProfileUrl: row.public_profile_url,
        isActive: row.is_active,
      };
    } catch (error) {
      console.error('Error fetching LinkedIn connection:', error);
      throw new Error('Failed to fetch LinkedIn connection');
    }
  }

  // Messaging Methods
  async sendMessage(
    accessToken: string,
    recipientId: string,
    message: string,
    subject?: string
  ): Promise<string> {
    try {
      const messageData = {
        recipients: [recipientId],
        message: {
          body: message,
          subject: subject || '',
        },
      };

      const response = await this.apiClient.post('/messaging/conversations', messageData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.id;
    } catch (error) {
      console.error('LinkedIn send message error:', error);
      throw new Error('Failed to send LinkedIn message');
    }
  }

  async getConversations(accessToken: string, start: number = 0, count: number = 50): Promise<any[]> {
    try {
      const response = await this.apiClient.get(`/messaging/conversations?start=${start}&count=${count}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data.elements || [];
    } catch (error) {
      console.error('LinkedIn conversations fetch error:', error);
      throw new Error('Failed to fetch conversations');
    }
  }

  async getMessages(accessToken: string, conversationId: string): Promise<any[]> {
    try {
      const response = await this.apiClient.get(`/messaging/conversations/${conversationId}/events`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data.elements || [];
    } catch (error) {
      console.error('LinkedIn messages fetch error:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  async saveMessage(
    userId: string,
    linkedinConnectionId: string,
    messageData: any,
    direction: 'inbound' | 'outbound'
  ): Promise<string> {
    if (!pool) {
      throw new Error('Database connection not available');
    }

    try {
      const result = await pool.query(`
        INSERT INTO linkedin_messages (
          user_id, linkedin_connection_id, conversation_id, message_id,
          sender_id, recipient_id, direction, content, sent_at, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (message_id) DO NOTHING
        RETURNING id
      `, [
        userId,
        linkedinConnectionId,
        messageData.conversationId,
        messageData.id,
        messageData.from,
        messageData.to.join(','),
        direction,
        messageData.body,
        new Date(messageData.sentAt),
        JSON.stringify(messageData)
      ]);

      return result.rows[0]?.id;
    } catch (error) {
      console.error('Error saving LinkedIn message:', error);
      throw new Error('Failed to save LinkedIn message');
    }
  }

  // Posting Methods
  async createPost(
    accessToken: string,
    content: string,
    visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS' = 'PUBLIC',
    mediaUrls?: string[]
  ): Promise<string> {
    try {
      const postData: any = {
        author: `urn:li:person:${await this.getCurrentUserId(accessToken)}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: mediaUrls && mediaUrls.length > 0 ? 'IMAGE' : 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
        },
      };

      if (mediaUrls && mediaUrls.length > 0) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrls.map(url => ({
          status: 'READY',
          description: {
            text: 'Image shared via HandshakeHaven CRM',
          },
          media: url,
          title: {
            text: 'Shared Image',
          },
        }));
      }

      const response = await this.apiClient.post('/ugcPosts', postData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.id;
    } catch (error) {
      console.error('LinkedIn create post error:', error);
      throw new Error('Failed to create LinkedIn post');
    }
  }

  async savePost(
    userId: string,
    linkedinConnectionId: string,
    postData: any,
    content: string,
    visibility: string
  ): Promise<string> {
    if (!pool) {
      throw new Error('Database connection not available');
    }

    try {
      const result = await pool.query(`
        INSERT INTO linkedin_posts (
          user_id, linkedin_connection_id, post_id, content, visibility,
          published_at, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        userId,
        linkedinConnectionId,
        postData.id,
        content,
        visibility,
        new Date(),
        JSON.stringify(postData)
      ]);

      return result.rows[0].id;
    } catch (error) {
      console.error('Error saving LinkedIn post:', error);
      throw new Error('Failed to save LinkedIn post');
    }
  }

  // Helper Methods
  private async getCurrentUserId(accessToken: string): Promise<string> {
    try {
      const response = await this.apiClient.get('/people/~:(id)', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.data.id;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      throw new Error('Failed to get current user ID');
    }
  }

  async syncMessages(userId: string): Promise<void> {
    const connection = await this.getConnection(userId);
    if (!connection) {
      throw new Error('No LinkedIn connection found');
    }

    try {
      const conversations = await this.getConversations(connection.accessToken);
      
      for (const conversation of conversations) {
        const messages = await this.getMessages(connection.accessToken, conversation.id);
        
        for (const message of messages) {
          const direction = message.from === connection.linkedinUserId ? 'outbound' : 'inbound';
          await this.saveMessage(userId, connection.id, message, direction);
        }
      }
    } catch (error) {
      console.error('Error syncing messages:', error);
      throw new Error('Failed to sync messages');
    }
  }

  // Connection status check
  async isConnected(userId: string): Promise<boolean> {
    const connection = await this.getConnection(userId);
    return connection !== null && connection.isActive;
  }

  // Token validation and refresh
  async validateAndRefreshToken(userId: string): Promise<boolean> {
    const connection = await this.getConnection(userId);
    if (!connection) {
      return false;
    }

    // Check if token is expired
    if (connection.tokenExpiresAt && new Date() >= connection.tokenExpiresAt) {
      if (connection.refreshToken) {
        try {
          const tokenData = await this.refreshAccessToken(connection.refreshToken);
          
          // Update token in database
          if (pool) {
            await pool.query(`
              UPDATE linkedin_connections 
              SET access_token = $1, token_expires_at = $2, updated_at = CURRENT_TIMESTAMP
              WHERE id = $3
            `, [
              tokenData.access_token,
              new Date(Date.now() + (tokenData.expires_in * 1000)),
              connection.id
            ]);
          }
          
          return true;
        } catch (error) {
          console.error('Token refresh failed:', error);
          return false;
        }
      } else {
        return false;
      }
    }

    return true;
  }

  // Configuration check
  static isConfigured(): boolean {
    return !!(
      process.env.LINKEDIN_CLIENT_ID && 
      process.env.LINKEDIN_CLIENT_SECRET && 
      process.env.LINKEDIN_REDIRECT_URI
    );
  }
}

export const linkedinService = LinkedInService.getInstance(); 