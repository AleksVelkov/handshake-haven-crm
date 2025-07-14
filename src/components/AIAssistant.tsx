import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Mail, 
  MessageSquare, 
  TrendingUp, 
  Lightbulb,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { Contact } from '@/services/api';

interface AIAssistantProps {
  contact?: Contact;
  onClose?: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ contact, onClose }) => {
  const [activeTab, setActiveTab] = useState('email');
  const [loading, setLoading] = useState(false);
  const [aiConfigured, setAIConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState<string | null>(null);

  // Email generation states
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [emailPurpose, setEmailPurpose] = useState<'introduction' | 'follow-up' | 'proposal' | 'thank-you' | 'custom'>('follow-up');
  const [emailTone, setEmailTone] = useState<'professional' | 'friendly' | 'casual'>('professional');
  const [customPrompt, setCustomPrompt] = useState('');

  // Notes summary states
  const [notesSummary, setNotesSummary] = useState<{
    summary: string;
    keyPoints: string[];
    nextActions: string[];
    relationshipStatus: string;
  } | null>(null);

  // Follow-up suggestions states
  const [followUpSuggestions, setFollowUpSuggestions] = useState<{
    suggestions: string[];
    timing: string;
    priority: string;
  } | null>(null);

  // Contact insights states
  const [contactInsights, setContactInsights] = useState<{
    totalContacts: number;
    insights: string[];
    recommendations: string[];
    trends: string[];
  } | null>(null);

  // Campaign content states
  const [campaignContent, setCampaignContent] = useState<{
    title: string;
    content: string;
    hashtags?: string[];
  } | null>(null);
  const [campaignType, setCampaignType] = useState<'email' | 'social' | 'newsletter' | 'announcement'>('email');
  const [campaignAudience, setCampaignAudience] = useState('');
  const [campaignTopic, setCampaignTopic] = useState('');

  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const response = await apiClient.getAIStatus();
      setAIConfigured(response.configured);
      if (!response.configured) {
        setError('OpenAI is not configured. Please add your OpenAI API key.');
      }
    } catch (error) {
      console.error('AI status check failed:', error);
      setError('Unable to check AI service status');
    }
  };

  const handleCopyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(type);
      setTimeout(() => setCopiedToClipboard(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const generateEmailDraft = async () => {
    if (!contact) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.generateEmailDraft({
        contactId: contact.id,
        purpose: emailPurpose,
        customPrompt: emailPurpose === 'custom' ? customPrompt : undefined,
        tone: emailTone,
      });
      setEmailDraft(response.email);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate email draft');
    } finally {
      setLoading(false);
    }
  };

  const summarizeNotes = async () => {
    if (!contact) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.summarizeContactNotes(contact.id);
      setNotesSummary(response.summary);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to summarize notes');
    } finally {
      setLoading(false);
    }
  };

  const generateFollowUp = async () => {
    if (!contact) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.generateFollowUpSuggestions(contact.id);
      setFollowUpSuggestions(response.suggestions);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate follow-up suggestions');
    } finally {
      setLoading(false);
    }
  };

  const generateCampaign = async () => {
    if (!campaignAudience || !campaignTopic) {
      setError('Please provide audience and topic for campaign generation');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.generateCampaignContent({
        campaignType,
        audience: campaignAudience,
        topic: campaignTopic,
        tone: 'professional',
        length: 'medium',
      });
      setCampaignContent(response.content);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate campaign content');
    } finally {
      setLoading(false);
    }
  };

  const getContactInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getContactInsights();
      setContactInsights(response.insights);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to get contact insights');
    } finally {
      setLoading(false);
    }
  };

  if (!aiConfigured) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            AI Assistant Not Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              OpenAI integration is not configured. Please add your OpenAI API key to enable AI features.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI Assistant
          {contact && (
            <Badge variant="secondary" className="ml-2">
              {contact.name}
            </Badge>
          )}
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="absolute top-4 right-4">
            ×
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="email" className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1" disabled={!contact}>
              <MessageSquare className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="followup" className="flex items-center gap-1" disabled={!contact}>
              <Lightbulb className="h-4 w-4" />
              Follow-up
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="campaign" className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" />
              Campaign
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Purpose</label>
                <Select value={emailPurpose} onValueChange={(value: any) => setEmailPurpose(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="introduction">Introduction</SelectItem>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="thank-you">Thank You</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tone</label>
                <Select value={emailTone} onValueChange={(value: any) => setEmailTone(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {emailPurpose === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-2">Custom Instructions</label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Describe what you want the email to accomplish..."
                  rows={3}
                />
              </div>
            )}

            <Button 
              onClick={generateEmailDraft} 
              disabled={loading || !contact}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Generate Email Draft
            </Button>

            {emailDraft && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Subject</label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyToClipboard(emailDraft.subject, 'subject')}
                    >
                      {copiedToClipboard === 'subject' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{emailDraft.subject}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Email Body</label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyToClipboard(emailDraft.body, 'body')}
                    >
                      {copiedToClipboard === 'body' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">{emailDraft.body}</pre>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Button 
              onClick={summarizeNotes} 
              disabled={loading || !contact}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              Summarize Contact Notes
            </Button>

            {notesSummary && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Summary</h4>
                  <p className="text-sm text-gray-600">{notesSummary.summary}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Key Points</h4>
                  <ul className="space-y-1">
                    {notesSummary.keyPoints.map((point, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Next Actions</h4>
                  <ul className="space-y-1">
                    {notesSummary.nextActions.map((action, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Relationship Status</h4>
                  <Badge variant={notesSummary.relationshipStatus === 'hot' ? 'default' : 'secondary'}>
                    {notesSummary.relationshipStatus}
                  </Badge>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="followup" className="space-y-4">
            <Button 
              onClick={generateFollowUp} 
              disabled={loading || !contact}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lightbulb className="h-4 w-4 mr-2" />}
              Generate Follow-up Suggestions
            </Button>

            {followUpSuggestions && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    Priority: {followUpSuggestions.priority}
                  </Badge>
                  <Badge variant="secondary">
                    Timing: {followUpSuggestions.timing}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Suggestions</h4>
                  <ul className="space-y-2">
                    {followUpSuggestions.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Button 
              onClick={getContactInsights} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
              Analyze Contact Database
            </Button>

            {contactInsights && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{contactInsights.totalContacts}</div>
                  <div className="text-sm text-gray-600">Total Contacts</div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Insights</h4>
                  <ul className="space-y-2">
                    {contactInsights.insights.map((insight, index) => (
                      <li key={index} className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Recommendations</h4>
                  <ul className="space-y-2">
                    {contactInsights.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-600 p-3 bg-green-50 rounded-lg">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                {contactInsights.trends.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Trends</h4>
                    <ul className="space-y-2">
                      {contactInsights.trends.map((trend, index) => (
                        <li key={index} className="text-sm text-gray-600 p-3 bg-purple-50 rounded-lg">
                          {trend}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="campaign" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Type</label>
                <Select value={campaignType} onValueChange={(value: any) => setCampaignType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Campaign</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="newsletter">Newsletter</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Audience</label>
                <input
                  type="text"
                  value={campaignAudience}
                  onChange={(e) => setCampaignAudience(e.target.value)}
                  placeholder="e.g., Small business owners"
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Topic</label>
              <input
                type="text"
                value={campaignTopic}
                onChange={(e) => setCampaignTopic(e.target.value)}
                placeholder="e.g., New product launch"
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>

            <Button 
              onClick={generateCampaign} 
              disabled={loading || !campaignAudience || !campaignTopic}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Campaign Content
            </Button>

            {campaignContent && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Title</label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyToClipboard(campaignContent.title, 'title')}
                    >
                      {copiedToClipboard === 'title' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{campaignContent.title}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Content</label>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyToClipboard(campaignContent.content, 'content')}
                    >
                      {copiedToClipboard === 'content' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">{campaignContent.content}</pre>
                  </div>
                </div>

                {campaignContent.hashtags && campaignContent.hashtags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Hashtags</label>
                    <div className="flex flex-wrap gap-2">
                      {campaignContent.hashtags.map((hashtag, index) => (
                        <Badge key={index} variant="secondary">
                          {hashtag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIAssistant; 