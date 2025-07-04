import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import heroImage from "@/assets/hero-conference.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Conference networking" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-80"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 text-primary-foreground">
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/20 backdrop-blur-sm border border-primary-foreground/20 text-sm font-medium">
            ✨ Your Personal Mini CRM
          </span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Turn Every
          <span className="block bg-gradient-to-r from-primary-glow to-secondary bg-clip-text text-transparent">
            Handshake
          </span>
          Into Lasting Relationships
        </h1>
        
        <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-3xl mx-auto leading-relaxed">
          Your AI-powered conference companion that helps you prepare, connect, 
          and follow up like a pro — with zero chaos and maximum impact.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button variant="hero" size="lg" className="text-lg px-8 py-4 h-auto">
            Start Building Connections
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-4 h-auto bg-background/20 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-background/30">
            See How It Works
          </Button>
        </div>
        
        <div className="animate-bounce">
          <ArrowDown className="mx-auto w-6 h-6 opacity-70" />
        </div>
      </div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-32 h-20 bg-primary/20 rounded-lg backdrop-blur-sm border border-primary-foreground/20 animate-pulse hidden lg:block"></div>
      <div className="absolute bottom-32 right-16 w-24 h-24 bg-secondary/20 rounded-full backdrop-blur-sm border border-primary-foreground/20 animate-pulse hidden lg:block"></div>
    </section>
  );
};

export default Hero;