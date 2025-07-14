export interface Contact {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  tags: string[];
  notes?: string;
  status: 'new' | 'contacted' | 'responded' | 'converted' | 'lost';
  lastContact?: Date;
  createdAt: Date;
  updatedAt: Date;
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
  lastContact?: Date;
}

export const CREATE_CONTACTS_TABLE = `
  CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    tags TEXT[],
    notes TEXT,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'converted', 'lost')),
    last_contact TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
  CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
  CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
`; 