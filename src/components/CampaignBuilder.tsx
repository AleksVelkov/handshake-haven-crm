import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Clock, 
  Users, 
  Save,
  Send,
  ArrowLeft,
  Eye,
  Edit,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient, CreateCampaignRequest, MessageTemplate } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

interface CampaignBuilderProps {
  onBack: () => void;
  editCampaignId?: string;
}

interface CampaignMessageForm {
  sequence_number: number;
  subject?: string;
  message_body: string;
  message_type: 'linkedin' | 'email';
  personalization_fields?: string[];
}

const CampaignBuilder: React.FC<CampaignBuilderProps> = ({ onBack, editCampaignId }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    type: 'linkedin' as 'linkedin' | 'email' | 'mixed',
    message_count: 1,
    interval_days: 1,
    start_date: '',
  });

  const [messages, setMessages] = useState<CampaignMessageForm[]>([
    {
      sequence_number: 1,
      subject: '',
      message_body: '',
      message_type: 'linkedin' as 'linkedin' | 'email',
      personalization_fields: []
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);

  // Fetch templates for quick insertion
  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => apiClient.getTemplates({ limit: 50 }),
  });

  const templates = templatesData?.templates || [];

  // Update messages when message count changes
  useEffect(() => {
    const currentCount = messages.length;
    const targetCount = campaignForm.message_count;

    if (targetCount > currentCount) {
      // Add new messages
      const newMessages = Array.from({ length: targetCount - currentCount }, (_, index) => ({
        sequence_number: currentCount + index + 1,
        subject: '',
        message_body: '',
        message_type: campaignForm.type === 'mixed' ? 'linkedin' as 'linkedin' | 'email' : campaignForm.type,
        personalization_fields: []
      }));
      setMessages([...messages, ...newMessages]);
    } else if (targetCount < currentCount) {
      // Remove excess messages
      setMessages(messages.slice(0, targetCount));
    }
  }, [campaignForm.message_count, campaignForm.type]);

  // Load campaign data for editing
  useEffect(() => {
    if (editCampaignId) {
      const loadCampaign = async () => {
        try {
          const response = await apiClient.getCampaign(editCampaignId);
          const campaign = response.campaign;
          
          setCampaignForm({
            name: campaign.name,
            description: campaign.description || '',
            type: campaign.type,
            message_count: campaign.message_count,
            interval_days: campaign.interval_days,
            start_date: campaign.start_date ? new Date(campaign.start_date).toISOString().split('T')[0] : '',
          });

          setMessages(campaign.messages.map(msg => ({
            sequence_number: msg.sequence_number,
            subject: msg.subject || '',
            message_body: msg.message_body,
            message_type: msg.message_type,
            personalization_fields: Object.keys(msg.personalization_fields || {})
          })));
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load campaign for editing",
            variant: "destructive",
          });
        }
      };
      loadCampaign();
    }
  }, [editCampaignId]);

  const handleCampaignFormChange = (field: string, value: any) => {
    setCampaignForm(prev => ({ ...prev, [field]: value }));
  };

  const handleMessageChange = (index: number, field: string, value: any) => {
    setMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, [field]: value } : msg
    ));
  };

  const useTemplate = (templateId: string, messageIndex: number) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      handleMessageChange(messageIndex, 'message_body', template.message_body);
      if (template.subject) {
        handleMessageChange(messageIndex, 'subject', template.subject);
      }
      
      // Record template usage
      apiClient.useTemplate(templateId).catch(console.error);
      
      toast({
        title: "Template Applied",
        description: `Template "${template.name}" has been applied to message ${messageIndex + 1}`,
      });
    }
  };

  const saveCampaign = async (asDraft = true) => {
    try {
      setIsLoading(true);

      // Validate required fields
      if (!campaignForm.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Campaign name is required",
          variant: "destructive",
        });
        return;
      }

      if (messages.some(msg => !msg.message_body.trim())) {
        toast({
          title: "Validation Error",
          description: "All messages must have content",
          variant: "destructive",
        });
        return;
      }

      const campaignData: CreateCampaignRequest = {
        name: campaignForm.name,
        description: campaignForm.description,
        type: campaignForm.type,
        message_count: campaignForm.message_count,
        interval_days: campaignForm.interval_days,
        start_date: campaignForm.start_date || undefined,
        messages: messages.map(msg => ({
          sequence_number: msg.sequence_number,
          subject: msg.subject || undefined,
          message_body: msg.message_body,
          message_type: msg.message_type,
          personalization_fields: {}
        }))
      };

      let response;
      if (editCampaignId) {
        response = await apiClient.updateCampaign(editCampaignId, campaignData);
      } else {
        response = await apiClient.createCampaign(campaignData);
      }

      toast({
        title: "Success!",
        description: `Campaign ${editCampaignId ? 'updated' : 'created'} successfully`,
      });

      if (!asDraft && !editCampaignId) {
        // Start the campaign if not saving as draft
        await apiClient.startCampaign(response.campaign.id);
        toast({
          title: "Campaign Started!",
          description: "Your campaign is now active and running",
        });
      }

      onBack();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save campaign",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderCampaignBasics = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Campaign Basics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="campaignName">Campaign Name *</Label>
          <Input
            id="campaignName"
            value={campaignForm.name}
            onChange={(e) => handleCampaignFormChange('name', e.target.value)}
            placeholder="Enter campaign name..."
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="campaignDescription">Description</Label>
          <Textarea
            id="campaignDescription"
            value={campaignForm.description}
            onChange={(e) => handleCampaignFormChange('description', e.target.value)}
            placeholder="Describe your campaign..."
            rows={3}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="campaignType">Campaign Type</Label>
            <Select value={campaignForm.type} onValueChange={(value) => handleCampaignFormChange('type', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    LinkedIn Only
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Only
                  </div>
                </SelectItem>
                <SelectItem value="mixed">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    <Mail className="w-4 h-4" />
                    Mixed
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="messageCount">Number of Messages</Label>
            <Select 
              value={campaignForm.message_count.toString()} 
              onValueChange={(value) => handleCampaignFormChange('message_count', parseInt(value))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} Message{num > 1 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="intervalDays">Interval (Days)</Label>
            <Select 
              value={campaignForm.interval_days.toString()} 
              onValueChange={(value) => handleCampaignFormChange('interval_days', parseInt(value))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Day</SelectItem>
                <SelectItem value="2">2 Days</SelectItem>
                <SelectItem value="3">3 Days</SelectItem>
                <SelectItem value="7">1 Week</SelectItem>
                <SelectItem value="14">2 Weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="startDate">Start Date (Optional)</Label>
          <Input
            id="startDate"
            type="date"
            value={campaignForm.start_date}
            onChange={(e) => handleCampaignFormChange('start_date', e.target.value)}
            className="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderMessageBuilder = () => (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">Message {index + 1}</Badge>
                {index > 0 && (
                  <span className="text-sm text-muted-foreground">
                    (Sent {campaignForm.interval_days * index} day{campaignForm.interval_days * index !== 1 ? 's' : ''} after previous)
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select 
                  value={message.message_type} 
                  onValueChange={(value) => handleMessageChange(index, 'message_type', value)}
                  disabled={campaignForm.type !== 'mixed'}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">
                      <MessageSquare className="w-4 h-4 inline mr-2" />
                      LinkedIn
                    </SelectItem>
                    <SelectItem value="email">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {message.message_type === 'email' && (
              <div>
                <Label htmlFor={`subject-${index}`}>Subject Line</Label>
                <Input
                  id={`subject-${index}`}
                  value={message.subject || ''}
                  onChange={(e) => handleMessageChange(index, 'subject', e.target.value)}
                  placeholder="Enter email subject..."
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor={`message-${index}`}>Message Content *</Label>
                <Select onValueChange={(templateId) => useTemplate(templateId, index)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Use template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter(t => t.message_type === message.message_type)
                      .map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                id={`message-${index}`}
                value={message.message_body}
                onChange={(e) => handleMessageChange(index, 'message_body', e.target.value)}
                placeholder={`Enter your ${message.message_type} message...`}
                rows={6}
                className="mt-1"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Available variables: {{`{firstName}`}}, {{`{lastName}`}}, {{`{company}`}}, {{`{email}`}}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Campaign Name</Label>
              <p className="text-sm text-muted-foreground">{campaignForm.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Type</Label>
              <Badge variant="outline" className="ml-2">
                {campaignForm.type.charAt(0).toUpperCase() + campaignForm.type.slice(1)}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Messages</Label>
              <p className="text-sm text-muted-foreground">{campaignForm.message_count} messages</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Interval</Label>
              <p className="text-sm text-muted-foreground">{campaignForm.interval_days} day{campaignForm.interval_days !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {campaignForm.description && (
            <div className="mt-4">
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground">{campaignForm.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {messages.map((message, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge>Message {index + 1}</Badge>
              <Badge variant="outline">
                {message.message_type === 'email' ? (
                  <><Mail className="w-3 h-3 mr-1" /> Email</>
                ) : (
                  <><MessageSquare className="w-3 h-3 mr-1" /> LinkedIn</>
                )}
              </Badge>
              {index > 0 && (
                <span className="text-sm text-muted-foreground">
                  +{campaignForm.interval_days * index} days
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {message.subject && (
              <div className="mb-3">
                <Label className="text-sm font-medium">Subject:</Label>
                <p className="text-sm">{message.subject}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Message:</Label>
              <div className="bg-muted p-3 rounded-md mt-1">
                <p className="text-sm whitespace-pre-wrap">{message.message_body}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">
            {editCampaignId ? 'Edit Campaign' : 'Create New Campaign'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? <Edit className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>
        </div>
      </div>

      {!isPreviewMode ? (
        <Tabs value={currentStep.toString()} onValueChange={(value) => setCurrentStep(parseInt(value))}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="1">Campaign Setup</TabsTrigger>
            <TabsTrigger value="2">Message Builder</TabsTrigger>
          </TabsList>

          <TabsContent value="1" className="mt-6">
            {renderCampaignBasics()}
          </TabsContent>

          <TabsContent value="2" className="mt-6">
            {renderMessageBuilder()}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Campaign Preview</h2>
          {renderPreview()}
        </div>
      )}

      <Separator className="my-6" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentStep > 1 && !isPreviewMode && (
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Previous
            </Button>
          )}
          {currentStep < 2 && !isPreviewMode && (
            <Button 
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              Next
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => saveCampaign(true)}
            disabled={isLoading}
          >
            <Save className="w-4 h-4 mr-2" />
            Save as Draft
          </Button>
          <Button
            onClick={() => saveCampaign(false)}
            disabled={isLoading}
          >
            <Send className="w-4 h-4 mr-2" />
            {editCampaignId ? 'Update Campaign' : 'Create & Start'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CampaignBuilder; 