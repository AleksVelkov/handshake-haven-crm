import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import ContactCard from "@/components/ContactCard";
import LinkedInConnection from "@/components/LinkedInConnection";
import CampaignBuilder from "@/components/CampaignBuilder";
import TemplateManager from "@/components/TemplateManager";
import ContactsManager from "@/components/ContactsManager";
import CampaignsManager from "@/components/CampaignsManager";
import { Users, Mail, Bell, CheckCircle, AlertCircle, Link as LinkIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<'dashboard' | 'contacts' | 'campaigns' | 'create-campaign' | 'view-templates'>('dashboard');

  // Handle LinkedIn OAuth callback
  useEffect(() => {
    const linkedinStatus = searchParams.get('linkedin');
    if (linkedinStatus === 'connected') {
      toast({
        title: "LinkedIn Connected! 🎉",
        description: "Your LinkedIn account has been successfully connected to your CRM.",
      });
      // Remove the parameter from URL
      searchParams.delete('linkedin');
      setSearchParams(searchParams, { replace: true });
    } else if (linkedinStatus === 'error') {
      toast({
        title: "LinkedIn Connection Failed",
        description: "There was an error connecting your LinkedIn account. Please try again.",
        variant: "destructive",
      });
      // Remove the parameter from URL
      searchParams.delete('linkedin');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  // Fetch contacts data
  const { data: contacts = [], isLoading: contactsLoading, error: contactsError, isError: contactsIsError } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiClient.getContacts(),
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch contact statistics
  const { data: statsData, isLoading: statsLoading, error: statsError, isError: statsIsError } = useQuery({
    queryKey: ['contactStats'],
    queryFn: () => apiClient.getContactStats(),
    retry: 3,
    retryDelay: 1000,
  });

  // Calculate stats from data
  const stats = [
    { 
      title: "Total Contacts", 
      value: statsData?.total_contacts?.toString() || "0", 
      icon: Users, 
      change: `+${statsData?.contacts_this_week || 0} this week` 
    },
    { 
      title: "Messages Sent", 
      value: statsData?.messages_sent?.toString() || "0", 
      icon: Mail, 
      change: `+${statsData?.messages_sent_this_week || 0} this week` 
    },
    { 
      title: "Responses", 
      value: statsData?.responded?.toString() || "0", 
      icon: Bell, 
      change: `+${statsData?.responses_this_week || 0} this week` 
    },
    { 
      title: "Conversions", 
      value: statsData?.converted?.toString() || "0", 
      icon: CheckCircle, 
      change: `+${statsData?.conversions_this_week || 0} this week` 
    }
  ];

  // Get recent contacts (first 4)
  const recentContacts = contacts.slice(0, 4);

  // Handle view changes
  const handleViewChange = (view: 'dashboard' | 'contacts' | 'campaigns' | 'create-campaign' | 'view-templates') => {
    setCurrentView(view);
  };

  // Show loading state while initial load or retrying
  if (contactsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-card">
        <Navbar currentView={currentView} onViewChange={handleViewChange} />
        <div className="max-w-7xl mx-auto px-6 py-8 pt-24">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if both queries failed
  if (contactsIsError && statsIsError) {
    return (
      <div className="min-h-screen bg-gradient-card">
        <Navbar currentView={currentView} onViewChange={handleViewChange} />
        <div className="max-w-7xl mx-auto px-6 py-8 pt-24">
          <Card>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  Unable to load dashboard data
                </h3>
                <p className="text-muted-foreground mb-4">
                  {contactsError?.message || statsError?.message || 'Please check your database connection.'}
                </p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="mt-3"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-card">
      <Navbar currentView={currentView} onViewChange={handleViewChange} />
      
      {currentView === 'contacts' && (
        <ContactsManager onBack={() => handleViewChange('dashboard')} />
      )}
      
      {currentView === 'campaigns' && (
        <CampaignsManager 
          onBack={() => handleViewChange('dashboard')} 
          onCreateCampaign={() => handleViewChange('create-campaign')}
        />
      )}
      
      {currentView === 'create-campaign' && (
        <CampaignBuilder onBack={() => handleViewChange('dashboard')} />
      )}
      
      {currentView === 'view-templates' && (
        <TemplateManager onBack={() => handleViewChange('dashboard')} />
      )}
      
      {currentView === 'dashboard' && (
        <div className="max-w-7xl mx-auto px-6 py-8 pt-24">{/* Added pt-24 for navbar spacing */}
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, {user?.firstName}! 👋
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your connections today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} className="shadow-soft hover:shadow-medium transition-smooth">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                      <p className="text-xs text-primary">{stat.change}</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                      <stat.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Button variant="hero" onClick={() => handleViewChange('contacts')}>
              <Users className="w-4 h-4 mr-2" />
              Manage Contacts
            </Button>
            <Button variant="secondary" onClick={() => handleViewChange('create-campaign')}>
              <Mail className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
            <Button variant="outline" onClick={() => handleViewChange('view-templates')}>
              <Bell className="w-4 h-4 mr-2" />
              View Templates
            </Button>
            <Button variant="outline" onClick={() => handleViewChange('campaigns')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              View Campaigns
            </Button>
          </div>

          {/* Integrations Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">LinkedIn Integration</h2>
            </div>
            <LinkedInConnection />
          </div>

          {/* Recent Contacts */}
          {recentContacts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Recent Contacts</h2>
                <Button variant="ghost" onClick={() => handleViewChange('contacts')}>
                  View All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recentContacts.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {recentContacts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  No contacts yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start building your network by adding your first contact or connecting your LinkedIn account.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => handleViewChange('contacts')}>
                    <Users className="w-4 h-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;