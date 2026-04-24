import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, MapPinned, ShieldAlert, Users } from "lucide-react";
import SOSButton from "@/components/SOSButton";
import LocationDisplay from "@/components/LocationDisplay";
import EmergencyContacts from "@/components/EmergencyContacts";
import SafetyTips from "@/components/SafetyTips";
import QuickActions from "@/components/QuickActions";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/hooks/useAlerts";
import { useContacts } from "@/hooks/useContacts";
import { useNotifications } from "@/hooks/useNotifications";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { toast } from "sonner";

const Index = () => {
  const [isAlertActive, setIsAlertActive] = useState(false);
  const activeAlertIdRef = useRef<string | null>(null);
  const { alerts, activeAlert, createAlert, updateAlert } = useAlerts();
  const { contacts } = useContacts();
  const { addNotification } = useNotifications();
  const { isTracking, startTracking, stopTracking } = useLiveLocation();

  useEffect(() => {
    if (!activeAlert) {
      activeAlertIdRef.current = null;
      setIsAlertActive(false);
      return;
    }

    activeAlertIdRef.current = activeAlert.id;
    setIsAlertActive(true);

    if (!isTracking) {
      startTracking(activeAlert.id);
    }
  }, [activeAlert, isTracking, startTracking]);

  const handleSOSActivate = async () => {
    if (isAlertActive && activeAlertIdRef.current) {
      updateAlert.mutate({ id: activeAlertIdRef.current, status: "resolved" });
      stopTracking();
      activeAlertIdRef.current = null;
      setIsAlertActive(false);
      toast.info("Alert resolved. Live tracking stopped.");
      return;
    }

    try {
      const currentPosition = await new Promise<GeolocationPosition | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });

      const latitude = currentPosition?.coords.latitude;
      const longitude = currentPosition?.coords.longitude;

      const data = await createAlert.mutateAsync({
        latitude,
        longitude,
        contacts_notified: contacts.length,
        location_text:
          latitude && longitude
            ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            : "Live location will appear once GPS is available",
      });

      activeAlertIdRef.current = data.id;
      setIsAlertActive(true);
      startTracking(data.id);

      addNotification.mutate({
        type: "alert",
        title: "SOS alert activated",
        message: `Emergency alert prepared for ${contacts.length} trusted contact${contacts.length === 1 ? "" : "s"}.`,
      });

      toast.success("Emergency alert activated", {
        description: contacts.length
          ? `Live tracking started and ${contacts.length} contact${contacts.length === 1 ? "" : "s"} can be notified.`
          : "Live tracking started. Add emergency contacts for the strongest safety net.",
        duration: 5000,
      });
    } catch (err) {
      setIsAlertActive(false);
      console.error("Alert creation failed:", err);
      toast.error("Unable to start the alert right now");
    }
  };

  const safetyScore = Math.min(
    100,
    (contacts.length >= 3 ? 50 : contacts.length * 15) +
      (alerts.length > 0 ? 20 : 0) +
      (activeAlert ? 30 : 10)
  );

  return (
    <Layout>
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2 text-center">
                <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Guardian Mode
                </p>
                <h2 className="text-3xl font-bold text-foreground">You are never alone</h2>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  One tap starts your SOS flow, saves the alert, and keeps your live location updated.
                </p>
              </div>

              <SOSButton onActivate={handleSOSActivate} isActive={isAlertActive} />

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Trusted Contacts</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{contacts.length}</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Alert History</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{alerts.length}</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Safety Readiness</p>
                  <p className="mt-1 text-2xl font-bold text-primary">{safetyScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-semibold text-foreground">Live Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl ${isAlertActive ? "bg-sos/10" : "bg-safe/10"} flex items-center justify-center`}>
                      <Activity className={`h-5 w-5 ${isAlertActive ? "text-sos" : "text-safe"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Protection Status</p>
                      <p className="text-xs text-muted-foreground">{isAlertActive ? "Alert is live" : "Standing by"}</p>
                    </div>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${isAlertActive ? "bg-sos animate-pulse" : "bg-safe"}`} />
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <MapPinned className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Tracking</p>
                      <p className="text-xs text-muted-foreground">{isTracking ? "Location syncing" : "Inactive"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                      <Users className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Response Network</p>
                      <p className="text-xs text-muted-foreground">
                        {contacts.length ? `${contacts.length} contact${contacts.length === 1 ? "" : "s"} ready` : "No contacts added yet"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {activeAlert && (
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/track/${activeAlert.id}`}>Open Live Tracking</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="animate-fade-in-up animation-delay-100">
          <QuickActions />
        </section>
        <section className="animate-fade-in-up animation-delay-200">
          <LocationDisplay />
        </section>
        <section className="animate-fade-in-up animation-delay-300">
          <EmergencyContacts />
        </section>
        <section className="animate-fade-in-up animation-delay-400">
          <SafetyTips />
        </section>

        <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2">
          <div
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 shadow-soft transition-all duration-300 ${
              isAlertActive ? "bg-sos text-sos-foreground" : "border border-border/50 bg-card text-foreground"
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isAlertActive ? "bg-white animate-pulse" : "bg-safe"}`} />
            <span className="text-sm font-medium">
              {isAlertActive ? (isTracking ? "Tracking live location..." : "Alert active") : "You are safe"}
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
