import OpenAI from 'openai';
import { Contact } from '../models/Contact.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIService {
  private static instance: OpenAIService;
  private client: OpenAI;

  private constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    this.client = openai;
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  // Generate personalized email draft
  async generateEmailDraft(params: {
    contactName: string;
    contactCompany?: string;
    contactEmail: string;
    purpose: 'introduction' | 'follow-up' | 'proposal' | 'thank-you' | 'custom';
    customPrompt?: string;
    userFirstName: string;
    previousNotes?: string;
    tone?: 'professional' | 'friendly' | 'casual';
  }): Promise<{ subject: string; body: string }> {
    const { contactName, contactCompany, purpose, customPrompt, userFirstName, previousNotes, tone = 'professional' } = params;
    
    const systemPrompt = `You are a professional email assistant for a CRM system. Generate personalized, engaging emails that help build business relationships. The emails should be ${tone} in tone and appropriate for B2B communication.`;
    
    let userPrompt = `Generate an email for the following:
- Contact: ${contactName}${contactCompany ? ` from ${contactCompany}` : ''}
- Purpose: ${purpose}
- Sender: ${userFirstName}
- Tone: ${tone}`;

    if (previousNotes) {
      userPrompt += `\n- Previous interaction notes: ${previousNotes}`;
    }

    if (purpose === 'custom' && customPrompt) {
      userPrompt += `\n- Custom instructions: ${customPrompt}`;
    }

    userPrompt += `\n\nPlease provide:
1. A compelling subject line
2. A personalized email body
3. Keep it concise but engaging
4. Include a clear call-to-action
5. Use proper email formatting

Format the response as JSON with 'subject' and 'body' fields.`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      try {
        const parsed = JSON.parse(content);
        return {
          subject: parsed.subject || 'Subject not generated',
          body: parsed.body || 'Email body not generated'
        };
      } catch (parseError) {
        // Fallback: try to extract subject and body from plain text
        const lines = content.split('\n');
        const subjectLine = lines.find(line => line.toLowerCase().includes('subject:'));
        const subject = subjectLine ? subjectLine.replace(/subject:\s*/i, '').trim() : 'Follow-up';
        
        return {
          subject,
          body: content
        };
      }
    } catch (error) {
      console.error('OpenAI email generation error:', error);
      throw new Error('Failed to generate email draft');
    }
  }

  // Summarize contact notes and interactions
  async summarizeContactNotes(notes: string[], contactName: string): Promise<{
    summary: string;
    keyPoints: string[];
    nextActions: string[];
    relationshipStatus: 'new' | 'warming' | 'engaged' | 'hot' | 'cold';
  }> {
    const systemPrompt = `You are a CRM assistant that analyzes contact interactions to provide insights and recommendations. Analyze the conversation history and provide actionable insights.`;

    const userPrompt = `Analyze the following interaction notes for ${contactName}:

${notes.join('\n\n')}

Please provide:
1. A concise summary of the relationship and interactions
2. Key points and insights about the contact
3. Suggested next actions
4. Relationship status assessment

Format as JSON with fields: summary, keyPoints (array), nextActions (array), relationshipStatus (one of: new, warming, engaged, hot, cold)`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || 'No summary available',
        keyPoints: parsed.keyPoints || [],
        nextActions: parsed.nextActions || [],
        relationshipStatus: parsed.relationshipStatus || 'new'
      };
    } catch (error) {
      console.error('OpenAI contact analysis error:', error);
      throw new Error('Failed to analyze contact notes');
    }
  }

  // Generate follow-up suggestions based on contact status
  async generateFollowUpSuggestions(contact: Contact): Promise<{
    suggestions: string[];
    timing: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    const systemPrompt = `You are a CRM assistant that provides follow-up recommendations based on contact information and interaction history.`;

    const userPrompt = `Based on the following contact information, suggest follow-up actions:

Contact: ${contact.name}
Company: ${contact.company || 'Not specified'}
Status: ${contact.status}
Last Contact: ${contact.lastContact || 'Never'}
Tags: ${contact.tags?.join(', ') || 'None'}
Notes: ${contact.notes || 'No notes'}

Provide:
1. Specific follow-up suggestions (3-5 actionable items)
2. Recommended timing for next contact
3. Priority level (low, medium, high)

Format as JSON with fields: suggestions (array), timing (string), priority (string)`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 600,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      return {
        suggestions: parsed.suggestions || [],
        timing: parsed.timing || 'Within 1 week',
        priority: parsed.priority || 'medium'
      };
    } catch (error) {
      console.error('OpenAI follow-up suggestions error:', error);
      throw new Error('Failed to generate follow-up suggestions');
    }
  }

  // Generate content for campaigns or outreach
  async generateCampaignContent(params: {
    campaignType: 'email' | 'social' | 'newsletter' | 'announcement';
    audience: string;
    topic: string;
    tone: 'professional' | 'friendly' | 'casual' | 'urgent';
    length: 'short' | 'medium' | 'long';
    callToAction?: string;
  }): Promise<{
    title: string;
    content: string;
    hashtags?: string[];
  }> {
    const { campaignType, audience, topic, tone, length, callToAction } = params;

    const systemPrompt = `You are a marketing content creator specializing in B2B communications. Create engaging, professional content that drives action.`;

    const userPrompt = `Create ${campaignType} content with these specifications:
- Type: ${campaignType}
- Audience: ${audience}
- Topic: ${topic}
- Tone: ${tone}
- Length: ${length}
- Call to action: ${callToAction || 'Contact us for more information'}

Requirements:
- Make it engaging and relevant
- Include appropriate formatting
- Add hashtags if it's social content
- Keep the tone consistent throughout

Format as JSON with fields: title, content, hashtags (array, only for social media)`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1200,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      return {
        title: parsed.title || 'Generated Content',
        content: parsed.content || 'Content not generated',
        hashtags: parsed.hashtags || []
      };
    } catch (error) {
      console.error('OpenAI campaign content error:', error);
      throw new Error('Failed to generate campaign content');
    }
  }

  // Extract insights from contact data
  async analyzeContactInsights(contacts: Contact[]): Promise<{
    totalContacts: number;
    insights: string[];
    recommendations: string[];
    trends: string[];
  }> {
    const systemPrompt = `You are a CRM data analyst that provides insights and recommendations based on contact data patterns.`;

    const contactSummary = contacts.map(contact => ({
      status: contact.status,
      company: contact.company,
      tags: contact.tags,
      hasNotes: !!contact.notes,
      lastContact: contact.lastContact,
      createdAt: contact.createdAt
    }));

    const userPrompt = `Analyze this contact data and provide insights:

Contact Summary:
${JSON.stringify(contactSummary, null, 2)}

Provide:
1. Key insights about the contact database
2. Recommendations for improvement
3. Trends and patterns observed

Format as JSON with fields: totalContacts, insights (array), recommendations (array), trends (array)`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      return {
        totalContacts: contacts.length,
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
        trends: parsed.trends || []
      };
    } catch (error) {
      console.error('OpenAI contact insights error:', error);
      throw new Error('Failed to analyze contact insights');
    }
  }

  // Check if OpenAI is properly configured
  static isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }
}

export const openaiService = OpenAIService.getInstance(); 