import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-smooth">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold text-foreground">ConferenceCRM</span>
          </Link>
          
          {!isDashboard && (
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-smooth">
                Features
              </a>
              <a href="#capabilities" className="text-muted-foreground hover:text-foreground transition-smooth">
                Capabilities
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-smooth">
                Pricing
              </a>
            </div>
          )}

          {isDashboard && (
            <div className="hidden md:flex items-center gap-8">
              <Link to="/dashboard" className="text-primary font-medium">
                Dashboard
              </Link>
              <span className="text-muted-foreground hover:text-foreground transition-smooth cursor-pointer">
                Contacts
              </span>
              <span className="text-muted-foreground hover:text-foreground transition-smooth cursor-pointer">
                Campaigns
              </span>
              <span className="text-muted-foreground hover:text-foreground transition-smooth cursor-pointer">
                Templates
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            {!isDashboard ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost">
                    Sign In
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="hero">
                    Get Started
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-secondary rounded-full flex items-center justify-center">
                    <span className="text-secondary-foreground font-medium text-sm">JD</span>
                  </div>
                  <span className="text-foreground font-medium hidden sm:block">John Doe</span>
                </div>
                <Link to="/">
                  <Button variant="outline" size="sm">
                    Sign Out
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;