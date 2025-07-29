import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  MessageSquare, 
  ArrowLeft,
  Search,
  Filter,
  Copy,
  Eye,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient, MessageTemplate, CreateTemplateRequest } from "@/services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface TemplateManagerProps {
  onBack: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ onBack }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);

  // Template form state
  const [templateForm, setTemplateForm] = useState<CreateTemplateRequest>({
    name: '',
    description: '',
    category: '',
    message_type: 'linkedin',
    subject: '',
    message_body: '',
    personalization_fields: {},
    is_public: false
  });

  // Fetch templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['templates', filterType, filterCategory],
    queryFn: () => apiClient.getTemplates({
      message_type: filterType === 'all' ? undefined : filterType as 'linkedin' | 'email',
      category: filterCategory === 'all' ? undefined : filterCategory,
      limit: 100
    }),
  });

  // Fetch template stats
  const { data: statsData } = useQuery({
    queryKey: ['template-stats'],
    queryFn: () => apiClient.getTemplateStats(),
  });

  const templates = templatesData?.templates || [];
  const stats = statsData?.stats;
  const categories = statsData?.categories || [];

  // Filtered templates based on search
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.message_body.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.category && template.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (data: CreateTemplateRequest) => apiClient.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-stats'] });
      toast({
        title: "Success!",
        description: "Template created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTemplateRequest }) => 
      apiClient.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({
        title: "Success!",
        description: "Template updated successfully",
      });
      setEditingTemplate(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-stats'] });
      toast({
        title: "Success!",
        description: "Template deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      category: '',
      message_type: 'linkedin',
      subject: '',
      message_body: '',
      personalization_fields: {},
      is_public: false
    });
  };

  const handleFormChange = (field: keyof CreateTemplateRequest, value: any) => {
    setTemplateForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateTemplate = () => {
    if (!templateForm.name.trim() || !templateForm.message_body.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name and message content are required",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate(templateForm);
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      category: template.category || '',
      message_type: template.message_type,
      subject: template.subject || '',
      message_body: template.message_body,
      personalization_fields: template.personalization_fields || {},
      is_public: template.is_public
    });
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;

    if (!templateForm.name.trim() || !templateForm.message_body.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name and message content are required",
        variant: "destructive",
      });
      return;
    }

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      data: templateForm
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplateMutation.mutate(templateId);
  };

  const copyTemplateContent = (template: MessageTemplate) => {
    navigator.clipboard.writeText(template.message_body);
    toast({
      title: "Copied!",
      description: "Template content copied to clipboard",
    });
  };

  const renderTemplateForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="templateName">Template Name *</Label>
          <Input
            id="templateName"
            value={templateForm.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            placeholder="Enter template name..."
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="templateType">Message Type</Label>
          <Select 
            value={templateForm.message_type} 
            onValueChange={(value) => handleFormChange('message_type', value)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linkedin">
                <MessageSquare className="w-4 h-4 inline mr-2" />
                LinkedIn Message
              </SelectItem>
              <SelectItem value="email">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="templateCategory">Category</Label>
          <Input
            id="templateCategory"
            value={templateForm.category}
            onChange={(e) => handleFormChange('category', e.target.value)}
            placeholder="e.g., cold-outreach, follow-up..."
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="templateDescription">Description</Label>
          <Input
            id="templateDescription"
            value={templateForm.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            placeholder="Brief description..."
            className="mt-1"
          />
        </div>
      </div>

      {templateForm.message_type === 'email' && (
        <div>
          <Label htmlFor="templateSubject">Email Subject</Label>
          <Input
            id="templateSubject"
            value={templateForm.subject}
            onChange={(e) => handleFormChange('subject', e.target.value)}
            placeholder="Email subject line..."
            className="mt-1"
          />
        </div>
      )}

      <div>
        <Label htmlFor="templateContent">Message Content *</Label>
        <Textarea
          id="templateContent"
          value={templateForm.message_body}
          onChange={(e) => handleFormChange('message_body', e.target.value)}
          placeholder="Enter your template content..."
          rows={8}
          className="mt-1"
        />
        <div className="text-xs text-muted-foreground mt-1">
          Available variables: firstName, lastName, company, email (use with double curly braces)
        </div>
      </div>
    </div>
  );

  const renderTemplateCard = (template: MessageTemplate) => (
    <Card key={template.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {template.name}
              {template.message_type === 'email' ? (
                <Mail className="w-4 h-4 text-blue-500" />
              ) : (
                <MessageSquare className="w-4 h-4 text-blue-600" />
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              {template.category && (
                <Badge variant="secondary" className="text-xs">
                  {template.category}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {template.ownership === 'owner' ? 'Your Template' : 'Public'}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                {template.usage_count} uses
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewTemplate(template)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyTemplateContent(template)}
            >
              <Copy className="w-4 h-4" />
            </Button>
            {template.ownership === 'owner' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Template</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{template.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {template.subject && (
          <div className="mb-2">
            <Label className="text-sm font-medium">Subject:</Label>
            <p className="text-sm text-muted-foreground">{template.subject}</p>
          </div>
        )}
        <div>
          <Label className="text-sm font-medium">Message:</Label>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
            {template.message_body}
          </p>
        </div>
        {template.description && (
          <div className="mt-2">
            <Label className="text-sm font-medium">Description:</Label>
            <p className="text-xs text-muted-foreground">{template.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Message Templates</h1>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            {renderTemplateForm()}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={createTemplateMutation.isPending}
              >
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total_templates}</div>
              <div className="text-sm text-muted-foreground">Total Templates</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.user_templates}</div>
              <div className="text-sm text-muted-foreground">Your Templates</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.public_templates}</div>
              <div className="text-sm text-muted-foreground">Public Templates</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total_usage}</div>
              <div className="text-sm text-muted-foreground">Total Uses</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Array.from(new Set(categories.map(c => c.category).filter(Boolean))).map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading templates...</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search or filters' : 'Create your first template to get started'}
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(renderTemplateCard)}
        </div>
      )}

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {renderTemplateForm()}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setEditingTemplate(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTemplate}
              disabled={updateTemplateMutation.isPending}
            >
              Update Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {previewTemplate.message_type === 'email' ? (
                    <><Mail className="w-3 h-3 mr-1" /> Email</>
                  ) : (
                    <><MessageSquare className="w-3 h-3 mr-1" /> LinkedIn</>
                  )}
                </Badge>
                {previewTemplate.category && (
                  <Badge variant="secondary">{previewTemplate.category}</Badge>
                )}
              </div>
              
              {previewTemplate.description && (
                <div>
                  <Label className="text-sm font-medium">Description:</Label>
                  <p className="text-sm text-muted-foreground mt-1">{previewTemplate.description}</p>
                </div>
              )}

              {previewTemplate.subject && (
                <div>
                  <Label className="text-sm font-medium">Subject:</Label>
                  <p className="text-sm mt-1">{previewTemplate.subject}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Message Content:</Label>
                <div className="bg-muted p-4 rounded-md mt-1">
                  <p className="text-sm whitespace-pre-wrap">{previewTemplate.message_body}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Used {previewTemplate.usage_count} times</span>
                <span>Created {new Date(previewTemplate.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateManager; 