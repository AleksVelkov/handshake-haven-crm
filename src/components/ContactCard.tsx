import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, Users } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  company?: string;
  email: string;
  tags: string[];
  lastContact?: string;
  status: "new" | "contacted" | "responded" | "converted" | "lost";
}

interface ContactCardProps {
  contact: Contact;
}

const ContactCard = ({ contact }: ContactCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-muted text-muted-foreground";
      case "contacted": return "bg-primary/20 text-primary";
      case "responded": return "bg-secondary/20 text-secondary";
      case "converted": return "bg-accent/20 text-accent";
      case "lost": return "bg-red-100 text-red-800";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="group hover:shadow-medium transition-smooth shadow-soft">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-smooth">
              {contact.name}
            </h3>
            {contact.company && <p className="text-sm text-muted-foreground">{contact.company}</p>}
          </div>
          <Badge className={getStatusColor(contact.status)}>
            {contact.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>{contact.email}</span>
          </div>
          
          {contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {contact.lastContact && (
            <p className="text-xs text-muted-foreground">
              Last contact: {contact.lastContact}
            </p>
          )}
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              <Mail className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button size="sm" variant="secondary" className="flex-1">
              <Users className="w-4 h-4 mr-2" />
              Connect
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactCard;