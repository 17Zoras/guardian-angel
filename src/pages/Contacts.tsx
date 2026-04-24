import { useState } from "react";
import { Phone, Plus, User, Users, Heart, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import { useContacts } from "@/hooks/useContacts";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const Contacts = () => {
  const { contacts, isLoading, error, addContact, deleteContact, setPrimary } = useContacts();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relationship: "Family" });

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      toast.error("Name and phone number are required");
      return;
    }

    addContact.mutate(
      {
        ...newContact,
        name: newContact.name.trim(),
        phone: newContact.phone.trim(),
        is_primary: contacts.length === 0,
      },
      {
        onSuccess: () => {
          setNewContact({ name: "", phone: "", relationship: "Family" });
          setIsAddOpen(false);
        },
      }
    );
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 p-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Card className="gradient-card border-0 shadow-card">
          <CardContent className="p-6 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold text-foreground">Contacts are not ready yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const primaryContacts = contacts.filter((contact) => contact.is_primary);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Emergency Contacts</h1>
            <p className="text-muted-foreground">People who will be notified in emergencies</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Emergency Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Contact name"
                    value={newContact.name}
                    onChange={(event) => setNewContact({ ...newContact, name: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    value={newContact.phone}
                    onChange={(event) => setNewContact({ ...newContact, phone: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select value={newContact.relationship} onValueChange={(value) => setNewContact({ ...newContact, relationship: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Family", "Friend", "Partner", "Colleague", "Other"].map((relationship) => (
                        <SelectItem key={relationship} value={relationship}>
                          {relationship}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddContact} className="w-full" disabled={addContact.isPending}>
                  {addContact.isPending ? "Adding..." : "Add Contact"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {primaryContacts.length > 0 && (
          <Card className="gradient-card border-0 border-l-4 border-l-primary shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-primary">
                <Heart className="h-4 w-4" />
                Primary Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              {primaryContacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                  </div>
                  <Button variant="default" size="icon" className="bg-safe hover:bg-safe/90" onClick={() => handleCall(contact.phone)}>
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="gradient-card border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">All Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>No contacts added yet</p>
                <p className="text-sm">Add emergency contacts to get started</p>
              </div>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                    <User className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">{contact.name}</p>
                      {contact.is_primary && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Primary</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {contact.relationship} • {contact.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!contact.is_primary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => setPrimary.mutate(contact.id)}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-safe hover:bg-safe/10 hover:text-safe"
                      onClick={() => handleCall(contact.phone)}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deleteContact.mutate(contact.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 bg-accent/30 shadow-card">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Your primary contact should be the person most likely to answer quickly. We recommend adding at least 3 trusted contacts.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Contacts;
