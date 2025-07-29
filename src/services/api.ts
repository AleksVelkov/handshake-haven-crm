// API configuration
const API_BASE_URL = '/api';

// Contact interfaces matching the backend
export interface Contact {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  tags: string[];
  notes?: string;
  status: 'new' | 'contacted' | 'responded' | 'converted' | 'lost';
  lastContact?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactRequest {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  tags?: string[];
  notes?: string;
  status?: 'new' | 'contacted' | 'responded' | 'converted' | 'lost';
}

export interface UpdateContactRequest {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  notes?: string;
  status?: 'new' | 'contacted' | 'responded' | 'converted' | 'lost';
  lastContact?: string;
}

export interface ContactStats {
  total_contacts: number;
  new_contacts: number;
  contacted: number;
  responded: number;
  converted: number;
  lost: number;
  contacts_this_week: number;
  responses_this_week: number;
  conversions_this_week: number;
  messages_sent: number;
  messages_received: number;
  unread_messages: number;
  messages_sent_this_week: number;
}

// Campaign interfaces
export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: 'linkedin' | 'email' | 'mixed';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  message_count: number;
  interval_days: number;
  start_date?: string;
  end_date?: string;
  target_audience?: any;
  settings?: any;
  stats?: {
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
  };
  created_at: string;
  updated_at: string;
  recipient_count?: number;
  sent_count?: number;
}

export interface CampaignMessage {
  id: string;
  campaign_id: string;
  sequence_number: number;
  subject?: string;
  message_body: string;
  message_type: 'linkedin' | 'email';
  personalization_fields?: any;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  contact_id: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'failed';
  current_message_sequence: number;
  last_message_sent_at?: string;
  next_message_scheduled_at?: string;
  personalized_data?: any;
  interaction_history?: any[];
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
}

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  type: 'linkedin' | 'email' | 'mixed';
  message_count: number;
  interval_days?: number;
  start_date?: string;
  target_audience?: any;
  settings?: any;
  messages: {
    sequence_number: number;
    subject?: string;
    message_body: string;
    message_type: 'linkedin' | 'email';
    personalization_fields?: any;
  }[];
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  type?: 'linkedin' | 'email' | 'mixed';
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  message_count?: number;
  interval_days?: number;
  start_date?: string;
  target_audience?: any;
  settings?: any;
  messages?: {
    sequence_number: number;
    subject?: string;
    message_body: string;
    message_type: 'linkedin' | 'email';
    personalization_fields?: any;
  }[];
}

// Template interfaces
export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category?: string;
  message_type: 'linkedin' | 'email';
  subject?: string;
  message_body: string;
  personalization_fields?: any;
  usage_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  ownership?: 'owner' | 'public';
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  message_type: 'linkedin' | 'email';
  subject?: string;
  message_body: string;
  personalization_fields?: any;
  is_public?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  message_type?: 'linkedin' | 'email';
  subject?: string;
  message_body?: string;
  personalization_fields?: any;
  is_public?: boolean;
}

// API utility functions
class ApiClient {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Handle unauthorized responses
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please login again.'));
      }
      
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Contact API methods
  async getContacts(): Promise<Contact[]> {
    return this.request<Contact[]>('/contacts');
  }

  async getContact(id: string): Promise<Contact> {
    return this.request<Contact>(`/contacts/${id}`);
  }

  async createContact(data: CreateContactRequest): Promise<Contact> {
    return this.request<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContact(id: string, data: UpdateContactRequest): Promise<Contact> {
    return this.request<Contact>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteContact(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  async getContactStats(): Promise<ContactStats> {
    return this.request<ContactStats>('/contacts/stats/dashboard');
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; database?: string }> {
    return this.request<{ status: string; timestamp: string; database?: string }>('/health');
  }

  // Warm up the connection to reduce initial load failures
  async warmUp(): Promise<void> {
    try {
      await this.healthCheck();
    } catch (error) {
      console.warn('Connection warmup failed:', error);
    }
  }

  // AI-powered features
  async generateEmailDraft(params: {
    contactId: string;
    purpose: 'introduction' | 'follow-up' | 'proposal' | 'thank-you' | 'custom';
    customPrompt?: string;
    tone?: 'professional' | 'friendly' | 'casual';
  }): Promise<{
    email: { subject: string; body: string };
    contact: { id: string; name: string; company?: string; email: string };
  }> {
    return this.request('/ai/generate-email', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async summarizeContactNotes(contactId: string): Promise<{
    summary: {
      summary: string;
      keyPoints: string[];
      nextActions: string[];
      relationshipStatus: 'new' | 'warming' | 'engaged' | 'hot' | 'cold';
    };
    contact: { id: string; name: string; company?: string };
  }> {
    return this.request('/ai/summarize-notes', {
      method: 'POST',
      body: JSON.stringify({ contactId }),
    });
  }

  async generateFollowUpSuggestions(contactId: string): Promise<{
    suggestions: {
      suggestions: string[];
      timing: string;
      priority: 'low' | 'medium' | 'high';
    };
    contact: { id: string; name: string; company?: string; status: string };
  }> {
    return this.request('/ai/follow-up-suggestions', {
      method: 'POST',
      body: JSON.stringify({ contactId }),
    });
  }

  async generateCampaignContent(params: {
    campaignType: 'email' | 'social' | 'newsletter' | 'announcement';
    audience: string;
    topic: string;
    tone?: 'professional' | 'friendly' | 'casual' | 'urgent';
    length?: 'short' | 'medium' | 'long';
    callToAction?: string;
  }): Promise<{
    content: {
      title: string;
      content: string;
      hashtags?: string[];
    };
  }> {
    return this.request('/ai/generate-campaign', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getContactInsights(): Promise<{
    insights: {
      totalContacts: number;
      insights: string[];
      recommendations: string[];
      trends: string[];
    };
  }> {
    return this.request('/ai/contact-insights');
  }

  async getAIStatus(): Promise<{
    configured: boolean;
    message: string;
  }> {
    return this.request('/ai/status');
  }

  // LinkedIn API methods
  async getLinkedInStatus(): Promise<{
    configured: boolean;
    message: string;
  }> {
    return this.request('/linkedin/status');
  }

  async initiateLinkedInAuth(): Promise<{
    authUrl: string;
    state: string;
  }> {
    return this.request('/linkedin/auth/initiate');
  }

  async getLinkedInConnection(): Promise<{
    connected: boolean;
    connection: any;
  }> {
    return this.request('/linkedin/connection');
  }

  async disconnectLinkedIn(): Promise<{ message: string }> {
    return this.request('/linkedin/connection', {
      method: 'DELETE',
    });
  }

  async sendLinkedInMessage(params: {
    recipientId: string;
    message: string;
    subject?: string;
  }): Promise<{
    messageId: string;
    message: string;
  }> {
    return this.request('/linkedin/messages/send', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getLinkedInConversations(page: number = 1, limit: number = 20): Promise<{
    conversations: any[];
    pagination: any;
  }> {
    return this.request(`/linkedin/messages/conversations?page=${page}&limit=${limit}`);
  }

  async getLinkedInMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<{
    messages: any[];
    pagination: any;
  }> {
    return this.request(`/linkedin/messages/conversation/${conversationId}?page=${page}&limit=${limit}`);
  }

  async createLinkedInPost(params: {
    content: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
    mediaUrls?: string[];
  }): Promise<{
    postId: string;
    message: string;
  }> {
    return this.request('/linkedin/posts', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getLinkedInPosts(page: number = 1, limit: number = 20): Promise<{
    posts: any[];
    pagination: any;
  }> {
    return this.request(`/linkedin/posts?page=${page}&limit=${limit}`);
  }

  async syncLinkedInData(): Promise<{ message: string }> {
    return this.request('/linkedin/sync', {
      method: 'POST',
    });
  }

  async getLinkedInDrafts(): Promise<{
    drafts: any[];
  }> {
    return this.request('/linkedin/messages/drafts');
  }

  async saveLinkedInDraft(params: {
    recipientLinkedinId?: string;
    recipientName?: string;
    subject?: string;
    content: string;
    isTemplate?: boolean;
    templateName?: string;
    aiGenerated?: boolean;
    aiPrompt?: string;
  }): Promise<{
    draftId: string;
    message: string;
  }> {
    return this.request('/linkedin/messages/drafts', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getLinkedInUnreadCount(): Promise<{
    unreadCount: number;
  }> {
    return this.request('/linkedin/messages/unread-count');
  }

  // Campaign API methods
  async getCampaigns(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }): Promise<{
    campaigns: Campaign[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    
    const query = queryParams.toString();
    return this.request(`/campaigns${query ? `?${query}` : ''}`);
  }

  async getCampaign(id: string): Promise<{
    campaign: Campaign & {
      messages: CampaignMessage[];
      recipients: CampaignRecipient[];
    };
  }> {
    return this.request(`/campaigns/${id}`);
  }

  async createCampaign(data: CreateCampaignRequest): Promise<{
    campaign: Campaign;
    message: string;
  }> {
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id: string, data: UpdateCampaignRequest): Promise<{
    campaign: Campaign;
    message: string;
  }> {
    return this.request(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCampaign(id: string): Promise<{
    message: string;
  }> {
    return this.request(`/campaigns/${id}`, {
      method: 'DELETE',
    });
  }

  async addCampaignRecipients(id: string, contactIds: number[]): Promise<{
    added_recipients: any[];
    message: string;
  }> {
    return this.request(`/campaigns/${id}/recipients`, {
      method: 'POST',
      body: JSON.stringify({ contact_ids: contactIds }),
    });
  }

  async startCampaign(id: string): Promise<{
    campaign: Campaign;
    message: string;
  }> {
    return this.request(`/campaigns/${id}/start`, {
      method: 'POST',
    });
  }

  async pauseCampaign(id: string, action: 'pause' | 'resume'): Promise<{
    campaign: Campaign;
    message: string;
  }> {
    return this.request(`/campaigns/${id}/pause`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // Template API methods
  async getTemplates(params?: {
    category?: string;
    message_type?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    templates: MessageTemplate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.message_type) queryParams.append('message_type', params.message_type);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.request(`/templates${query ? `?${query}` : ''}`);
  }

  async getTemplateStats(): Promise<{
    categories: any[];
    stats: {
      total_templates: number;
      user_templates: number;
      public_templates: number;
      total_usage: number;
    };
  }> {
    return this.request('/templates/stats');
  }

  async getTemplate(id: string): Promise<{
    template: MessageTemplate;
  }> {
    return this.request(`/templates/${id}`);
  }

  async createTemplate(data: CreateTemplateRequest): Promise<{
    template: MessageTemplate;
    message: string;
  }> {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTemplate(id: string, data: UpdateTemplateRequest): Promise<{
    template: MessageTemplate;
    message: string;
  }> {
    return this.request(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTemplate(id: string): Promise<{
    message: string;
  }> {
    return this.request(`/templates/${id}`, {
      method: 'DELETE',
    });
  }

  async useTemplate(id: string): Promise<{
    template: MessageTemplate;
    message: string;
  }> {
    return this.request(`/templates/${id}/use`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient(); 