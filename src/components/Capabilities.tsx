import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const Capabilities = () => {
  const capabilities = [
    "LinkedIn/email connection",
    "Smart contact management",
    "AI-assisted message writing", 
    "Templates for different use cases",
    "Scheduling & automated workflows",
    "Follow-up logic based on response",
    "Open/click tracking",
    "Built-in compliance tools"
  ];

  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Everything You Need,
            <span className="block bg-gradient-secondary bg-clip-text text-transparent">
              All in One Place
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A complete suite of tools designed to transform how you build and maintain professional relationships.
          </p>
        </div>

        <Card className="shadow-large border-0 bg-gradient-card">
          <CardContent className="p-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {capabilities.map((capability, index) => (
                <div key={index} className="flex items-center gap-3 group">
                  <div className="w-6 h-6 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0 group-hover:shadow-glow transition-smooth">
                    <span className="text-primary-foreground text-xs font-bold">✓</span>
                  </div>
                  <span className="text-card-foreground font-medium group-hover:text-primary transition-smooth">
                    {capability}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-secondary shadow-medium">
                <span className="text-secondary-foreground font-semibold">
                  No more lost leads. No more forgotten connections.
                </span>
              </div>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
                Just meaningful follow-ups, at scale, with warmth, personality, and perfect timing. 
                It's your personal conference concierge — part CRM, part AI assistant, all heart. ❤️🤝
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default Capabilities;