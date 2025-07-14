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
    return this.request<ContactStats>('/contacts/stats/summary');
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
}

export const apiClient = new ApiClient(); 