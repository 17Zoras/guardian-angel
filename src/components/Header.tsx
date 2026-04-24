import { useState } from "react";
import { Shield, Menu, Bell, Home, Users, Clock, Wrench, User, Settings, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import NotificationsPanel from "@/components/NotificationsPanel";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const menuItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Users, label: "Emergency Contacts", path: "/contacts" },
  { icon: Clock, label: "Alert History", path: "/history" },
  { icon: Wrench, label: "Safety Tools", path: "/tools" },
  { icon: User, label: "Profile", path: "/profile" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.info("Signed out");
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">SafeHer</h1>
            <p className="text-xs text-muted-foreground">Your safety companion</p>
          </div>
        </NavLink>

        <div className="flex items-center gap-2">
          <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs bg-sos text-sos-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Notifications</SheetTitle>
              </SheetHeader>
              <NotificationsPanel onClose={() => setIsNotificationsOpen(false)} />
            </SheetContent>
          </Sheet>

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />SafeHer Menu
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-1">
                {menuItems.map((item) => (
                  <NavLink key={item.path} to={item.path} onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-foreground"
                    activeClassName="bg-primary/10 text-primary">
                    <item.icon className="w-5 h-5" /><span className="font-medium">{item.label}</span>
                  </NavLink>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="absolute bottom-6 left-6 right-6">
                <Button variant="outline" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
