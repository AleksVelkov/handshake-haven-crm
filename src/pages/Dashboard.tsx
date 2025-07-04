import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ContactCard from "@/components/ContactCard";
import { Users, Mail, Bell, CheckCircle } from "lucide-react";

const Dashboard = () => {
  // Sample data
  const stats = [
    { title: "Total Contacts", value: "247", icon: Users, change: "+12 this week" },
    { title: "Messages Sent", value: "89", icon: Mail, change: "+23 this week" },
    { title: "Responses", value: "34", icon: Bell, change: "+8 this week" },
    { title: "Conversions", value: "12", icon: CheckCircle, change: "+3 this week" }
  ];

  const sampleContacts = [
    {
      id: "1",
      name: "Sarah Chen",
      company: "TechStart Inc",
      email: "sarah@techstart.com",
      tags: ["TechConf2025", "VC", "AI"],
      lastContact: "2 days ago",
      status: "responded" as const
    },
    {
      id: "2", 
      name: "Michael Rodriguez",
      company: "Innovation Labs",
      email: "m.rodriguez@innovlabs.com",
      tags: ["TechConf2025", "Startup", "B2B"],
      status: "contacted" as const
    },
    {
      id: "3",
      name: "Emily Watson",
      company: "Growth Partners",
      email: "emily.w@growthpartners.co",
      tags: ["Investor", "Series A"],
      status: "new" as const
    },
    {
      id: "4",
      name: "David Kim",
      company: "AI Ventures",
      email: "david@aiventures.com", 
      tags: ["TechConf2025", "AI", "ML"],
      lastContact: "1 week ago",
      status: "converted" as const
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-card">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back! 👋
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
              <Badge variant="outline">4 contacts</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sampleContacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;