import { Phone, Plus, User, Heart, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useContacts } from "@/hooks/useContacts";
import { Skeleton } from "@/components/ui/skeleton";

const EmergencyContacts = () => {
  const { contacts, isLoading, error } = useContacts();

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (isLoading) {
    return (
      <Card className="gradient-card border-0 shadow-card">
        <CardContent className="space-y-3 p-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-0 shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Heart className="h-5 w-5 text-primary" />
            Emergency Contacts
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" asChild>
            <NavLink to="/contacts">
              <Plus className="mr-1 h-4 w-4" />
              Add
            </NavLink>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <TriangleAlert className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Contacts unavailable</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        ) : contacts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No contacts yet. Add your first emergency contact.</p>
        ) : (
          contacts.slice(0, 3).map((contact) => (
            <div key={contact.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <User className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{contact.name}</p>
                <p className="text-xs text-muted-foreground">{contact.relationship}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-safe hover:bg-safe/10 hover:text-safe"
                onClick={() => handleCall(contact.phone)}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
        <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" asChild>
          <NavLink to="/contacts">View all contacts →</NavLink>
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmergencyContacts;
