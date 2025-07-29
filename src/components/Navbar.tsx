import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { User, LogOut, Settings } from "lucide-react";

interface NavbarProps {
  currentView?: string;
  onViewChange?: (view: string) => void;
}

const Navbar = ({ currentView, onViewChange }: NavbarProps) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const isDashboard = location.pathname === '/dashboard';

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
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

          {isDashboard && onViewChange && (
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => onViewChange('dashboard')}
                className={`font-medium transition-smooth ${
                  currentView === 'dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => onViewChange('contacts')}
                className={`font-medium transition-smooth ${
                  currentView === 'contacts' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Contacts
              </button>
              <button 
                onClick={() => onViewChange('campaigns')}
                className={`font-medium transition-smooth ${
                  currentView === 'campaigns' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Campaigns
              </button>
              <button 
                onClick={() => onViewChange('view-templates')}
                className={`font-medium transition-smooth ${
                  currentView === 'view-templates' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Templates
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {!isDashboard && (
                  <Link to="/dashboard">
                    <Button variant="secondary">
                      Dashboard
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="hero">
                    Get Started
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