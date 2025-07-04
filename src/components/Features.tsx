import { Card, CardContent } from "@/components/ui/card";

const Features = () => {
  const features = [
    {
      phase: "🎯 Before the Event",
      title: "Perfect Preparation",
      description: "Craft engaging pitch decks and personalized message sequences with AI assistance. Create targeted campaigns for investors, leads, and collaborators.",
      items: [
        "AI-powered message crafting",
        "Customizable templates",
        "Campaign goal setting",
        "Pitch deck preparation"
      ]
    },
    {
      phase: "📇 At the Event",
      title: "Seamless Collection",
      description: "Scan business cards or add contacts manually. Tag them instantly with smart categorization for perfect organization.",
      items: [
        "Business card scanning",
        "Manual contact entry",
        "Smart tagging system",
        "Real-time organization"
      ]
    },
    {
      phase: "📬 After the Event",
      title: "Automated Magic",
      description: "Your mini-CRM automatically sends personalized follow-ups. Choose single messages or full sequences with perfect timing.",
      items: [
        "Automated message sequences",
        "Personalization tokens",
        "Smart scheduling",
        "Response tracking"
      ]
    }
  ];

  return (
    <section className="py-20 px-6 bg-gradient-card">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Your Conference Flow,
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Simplified
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From preparation to follow-up, we've got every step covered with intelligent automation and personal touch.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-large transition-smooth border-0 shadow-medium bg-card">
              <CardContent className="p-8">
                <div className="mb-4">
                  <span className="text-sm font-semibold text-primary mb-2 block">
                    {feature.phase}
                  </span>
                  <h3 className="text-2xl font-bold mb-4 text-card-foreground group-hover:text-primary transition-smooth">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                
                <ul className="space-y-3">
                  {feature.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-gradient-primary rounded-full flex-shrink-0"></div>
                      <span className="text-card-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;