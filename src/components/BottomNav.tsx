import { Home, Users, Clock, Shield, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Users, label: "Contacts", path: "/contacts" },
  { icon: Clock, label: "History", path: "/history" },
  { icon: Shield, label: "Tools", path: "/tools" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors text-muted-foreground hover:text-primary"
              activeClassName="text-primary bg-primary/10"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
