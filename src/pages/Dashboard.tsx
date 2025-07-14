import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import ContactCard from "@/components/ContactCard";
import { Users, Mail, Bell, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch contacts data
  const { data: contacts = [], isLoading: contactsLoading, error: contactsError, isError: contactsIsError } = useQuery({
    queryKey: ['contacts'],
    queryFn: apiClient.getContacts,
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch contact statistics
  const { data: statsData, isLoading: statsLoading, error: statsError, isError: statsIsError } = useQuery({
    queryKey: ['contactStats'],
    queryFn: apiClient.getContactStats,
    retry: 3,
    retryDelay: 1000,
  });

  // Calculate stats from data
  const stats = [
    { 
      title: "Total Contacts", 
      value: statsData?.total_contacts?.toString() || "0", 
      icon: Users, 
      change: "+12 this week" 
    },
    { 
      title: "Messages Sent", 
      value: "89", 
      icon: Mail, 
      change: "+23 this week" 
    },
    { 
      title: "Responses", 
      value: statsData?.responded?.toString() || "0", 
      icon: Bell, 
      change: "+8 this week" 
    },
    { 
      title: "Conversions", 
      value: statsData?.converted?.toString() || "0", 
      icon: CheckCircle, 
      change: "+3 this week" 
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