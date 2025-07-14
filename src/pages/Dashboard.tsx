import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import ContactCard from "@/components/ContactCard";
import LinkedInConnection from "@/components/LinkedInConnection";
import { Users, Mail, Bell, CheckCircle, AlertCircle, Link as LinkIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

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

  // Show loading state while initial load or retrying
  if (contactsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-card">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-8 pt-24">
          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                <p>Loading dashboard data...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Only show error after all retries have failed
  if (contactsIsError || statsIsError) {
    return (
      <div className="min-h-screen bg-gradient-card">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-8 pt-24">
          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className="flex items-center justify-center text-red-500">
                <AlertCircle className="w-6 h-6 mr-2" />
                <div>
                  <p className="font-semibold">Error loading dashboard data</p>
                  <p className="text-sm text-muted-foreground mt-1">
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-card">
      <Navbar />
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
          <Button variant="hero">
            <Users className="w-4 h-4 mr-2" />
            Add New Contact
          </Button>
          <Button variant="secondary">
            <Mail className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
          <Button variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            View Templates
          </Button>
        </div>

        {/* Integrations Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Integrations</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LinkedInConnection />
            <Card className="flex items-center justify-center p-6 border-2 border-dashed border-border">
              <div className="text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">Email Integration</p>
                <p className="text-xs text-muted-foreground">Coming Soon</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Recent Contacts */}
        <Card className="shadow-medium">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Recent Contacts</CardTitle>
              <Badge variant="outline">{recentContacts.length} contacts</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactsLoading ? (
                <div className="col-span-4 text-center py-8">
                  <p className="text-muted-foreground">Loading contacts...</p>
                </div>
              ) : recentContacts.length > 0 ? (
                recentContacts.map((contact) => (
                  <ContactCard key={contact.id} contact={contact} />
                ))
              ) : (
                <div className="col-span-4 text-center py-8">
                  <p className="text-muted-foreground">No contacts yet. Add your first contact to get started!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;