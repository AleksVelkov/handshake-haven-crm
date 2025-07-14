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
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

export const apiClient = new ApiClient(); 