import { MapPin, MessageCircle, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContacts } from "@/hooks/useContacts";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";

const QuickActions = () => {
  const { contacts } = useContacts();
  const { addNotification } = useNotifications();

  const primaryContact = contacts.find((contact) => contact.is_primary) ?? contacts[0];

  const handleCallEmergency = () => {
    window.location.href = "tel:112";
  };

  const handleCallPrimaryContact = () => {
    if (!primaryContact) {
      toast.error("Add a trusted contact first");
      return;
    }

    window.location.href = `tel:${primaryContact.phone}`;
  };

  const handleAlertContacts = () => {
    if (contacts.length === 0) {
      toast.error("Add emergency contacts to use this action");
      return;
    }

    addNotification.mutate({
      type: "alert",
      title: "Contacts alerted",
      message: `Prepared an emergency update for ${contacts.length} trusted contacts.`,
    });

    toast.success("Contacts are ready to be alerted", {
      description: `${contacts.length} trusted contact${contacts.length === 1 ? "" : "s"} available.`,
    });
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const url = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;

        if (navigator.share) {
          try {
            await navigator.share({
              title: "My current location",
              text: "Sharing my live location for safety.",
              url,
            });
            toast.success("Location shared");
            return;
          } catch {
            // Fall through to clipboard copy.
          }
        }

        try {
          await navigator.clipboard.writeText(url);
          toast.success("Location link copied");
        } catch {
          toast.error("Unable to share your location");
        }
      },
      () => toast.error("Unable to get your current location")
    );
  };

  const actions = [
    { icon: Phone, label: "Call 112", color: "text-sos", action: handleCallEmergency },
    {
      icon: MessageCircle,
      label: primaryContact ? `Call ${primaryContact.name.split(" ")[0]}` : "Primary Call",
      color: "text-primary",
      action: handleCallPrimaryContact,
    },
    { icon: Users, label: "Alert Team", color: "text-safe", action: handleAlertContacts },
    { icon: MapPin, label: "Share Spot", color: "text-accent-foreground", action: handleShareLocation },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          className="flex h-auto flex-col items-center gap-2 rounded-2xl py-4 px-2 hover:bg-muted/50"
          onClick={action.action}
        >
          <action.icon className={`h-5 w-5 ${action.color}`} />
          <span className="text-center text-xs font-medium text-foreground">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default QuickActions;
