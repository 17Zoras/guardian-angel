import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Clock3, MapPinned, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import SOSButton from "@/components/SOSButton";
import LocationDisplay from "@/components/LocationDisplay";
import EmergencyContacts from "@/components/EmergencyContacts";
import SafetyTips from "@/components/SafetyTips";
import QuickActions from "@/components/QuickActions";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAlerts } from "@/hooks/useAlerts";
import { useContacts } from "@/hooks/useContacts";
import { useNotifications } from "@/hooks/useNotifications";
import { useLiveLocation } from "@/hooks/useLiveLocation";
import { useAlertEvents } from "@/hooks/useAlertEvents";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";

const countdownOptions = [
  { label: "Send now", seconds: 0 },
  { label: "10 seconds", seconds: 10 },
  { label: "30 seconds", seconds: 30 },
];

const Index = () => {
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [selectedCountdown, setSelectedCountdown] = useState(0);
  const activeAlertIdRef = useRef<string | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const { alerts, activeAlert, error: alertsError, createAlert, updateAlert, escalateAlert } = useAlerts();
  const { contacts, error: contactsError } = useContacts();
  const { addNotification } = useNotifications();
  const { settings } = useSettings();
  const { isTracking, startTracking, stopTracking } = useLiveLocation();
  const { createEvent } = useAlertEvents(activeAlert?.id);

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

  useEffect(() => {
    if (!activeAlert || activeAlert.status !== "active") {
      return;
    }

    if (activeAlert.escalation_level >= 3) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const nextLevel = activeAlert.escalation_level + 1;
      escalateAlert.mutate({ id: activeAlert.id, escalationLevel: nextLevel });
      createEvent.mutate({
        alert_id: activeAlert.id,
        event_type: "escalated",
        message: `Alert escalation level increased to ${nextLevel}.`,
        metadata: { escalationLevel: nextLevel },
      });
      addNotification.mutate({
        type: "alert",
        title: `SOS escalation level ${nextLevel}`,
        message: "The alert is still active, so the response workflow has been escalated.",
      });
      toast.warning(`Alert escalated to level ${nextLevel}`);
    }, 60000);

    return () => window.clearTimeout(timeout);
  }, [activeAlert, addNotification, createEvent, escalateAlert]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!settings?.shake_to_alert || isAlertActive || countdownRemaining !== null) {
      return;
    }

    let lastTriggerAt = 0;
    const threshold = 24;

    const handleMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) {
        return;
      }

      const maxAxis = Math.max(
        Math.abs(acceleration.x ?? 0),
        Math.abs(acceleration.y ?? 0),
        Math.abs(acceleration.z ?? 0)
      );

      if (maxAxis < threshold || Date.now() - lastTriggerAt < 10000) {
        return;
      }

      lastTriggerAt = Date.now();
      toast.warning("Shake detected", {
        description: "Opening SOS options now.",
      });
      setCountdownOpen(true);
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [countdownRemaining, isAlertActive, settings?.shake_to_alert]);

  const launchAlert = async (countdownSeconds: number) => {
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
        countdown_seconds: countdownSeconds,
        contacts_notified: contacts.length,
        location_text:
          latitude && longitude
            ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            : "Live location will appear once GPS is available",
      });

      activeAlertIdRef.current = data.id;
      setIsAlertActive(true);
      startTracking(data.id);

      createEvent.mutate({
        alert_id: data.id,
        event_type: countdownSeconds > 0 ? "countdown_started" : "created",
        message: countdownSeconds > 0 ? `SOS sent after ${countdownSeconds} second countdown.` : "SOS alert activated immediately.",
        metadata: { contactsNotified: contacts.length },
      });

      createEvent.mutate({
        alert_id: data.id,
        event_type: "tracking_started",
        message: "Live location tracking started.",
      });

      addNotification.mutate({
        type: "alert",
        title: "SOS alert activated",
        message: `Emergency alert prepared for ${contacts.length} trusted contact${contacts.length === 1 ? "" : "s"}.`,
      });

      if (settings?.auto_recording) {
        addNotification.mutate({
          type: "info",
          title: "Auto recording reminder",
          message: "Open the Evidence Vault in Tools to capture a quick audio note for this incident.",
        });
      }

      toast.success("Emergency alert activated", {
        description: contacts.length
          ? `Live tracking started and ${contacts.length} contact${contacts.length === 1 ? "" : "s"} can be notified.`
          : "Live tracking started. Add emergency contacts for the strongest safety net.",
        duration: 5000,
      });
    } catch (err) {
      setIsAlertActive(false);
      toast.error("Unable to start the alert right now");
    }
  };

  const startCountdown = (seconds: number) => {
    setCountdownOpen(false);
    setSelectedCountdown(seconds);

    if (seconds === 0) {
      void launchAlert(0);
      return;
    }

    setCountdownRemaining(seconds);
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdownRemaining((previous) => {
        if (previous === null) {
          return null;
        }

        if (previous <= 1) {
          if (countdownIntervalRef.current) {
            window.clearInterval(countdownIntervalRef.current);
          }
          void launchAlert(seconds);
          return null;
        }

        return previous - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
    }
    setCountdownRemaining(null);
    toast.info("SOS countdown cancelled");
  };

  const handleSOSActivate = async () => {
    if (isAlertActive && activeAlertIdRef.current) {
      updateAlert.mutate({ id: activeAlertIdRef.current, status: "resolved" });
      createEvent.mutate({
        alert_id: activeAlertIdRef.current,
        event_type: "resolved",
        message: "Alert resolved by the user.",
      });
      stopTracking();
      activeAlertIdRef.current = null;
      setIsAlertActive(false);
      toast.info("Alert resolved. Live tracking stopped.");
      return;
    }

    setCountdownOpen(true);
  };

  const safetyScore = useMemo(
    () =>
      Math.min(
        100,
        (contacts.length >= 3 ? 50 : contacts.length * 15) + (alerts.length > 0 ? 20 : 0) + (activeAlert ? 30 : 10)
      ),
    [activeAlert, alerts.length, contacts.length]
  );

  const setupWarning = alertsError || contactsError;

  return (
    <Layout>
      <div className="space-y-6">
        {setupWarning && (
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-4 text-sm text-muted-foreground">{setupWarning}</CardContent>
          </Card>
        )}

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
                  Trigger SOS instantly or add a short countdown before sending the alert.
                </p>
              </div>

              <SOSButton onActivate={handleSOSActivate} isActive={isAlertActive} />

              {countdownRemaining !== null && (
                <Card className="border-0 bg-sos/10 shadow-card">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold text-foreground">SOS countdown in progress</p>
                      <p className="text-sm text-muted-foreground">Alert will send in {countdownRemaining} seconds.</p>
                    </div>
                    <Button variant="outline" onClick={cancelCountdown}>Cancel</Button>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Trusted Contacts</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{contacts.length}</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Alert History</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{alerts.length}</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground">Escalation</p>
                  <p className="mt-1 text-2xl font-bold text-sos">{activeAlert?.escalation_level ?? 0}</p>
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
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isAlertActive ? "bg-sos/10" : "bg-safe/10"}`}>
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
                      <p className="text-xs text-muted-foreground">
                        {isTracking
                          ? `Location syncing${activeAlert?.last_location_at ? ` • updated ${new Date(activeAlert.last_location_at).toLocaleTimeString()}` : ""}`
                          : "Inactive"}
                      </p>
                    </div>
                  </div>
                  {activeAlert && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (isTracking) {
                          stopTracking();
                          toast.info("Live tracking paused");
                          return;
                        }

                        startTracking(activeAlert.id);
                        toast.success("Live tracking resumed");
                      }}
                    >
                      {isTracking ? "Pause" : "Resume"}
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                      <Users className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Response Network</p>
                      <p className="text-xs text-muted-foreground">{contacts.length ? `${contacts.length} contact${contacts.length === 1 ? "" : "s"} ready` : "No contacts added yet"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                      <Clock3 className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Countdown Mode</p>
                      <p className="text-xs text-muted-foreground">{selectedCountdown ? `${selectedCountdown}s selected` : "Instant send ready"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {activeAlert ? (
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/track/${activeAlert.id}`}>Open Live Tracking</Link>
                </Button>
              ) : (
                <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                  The live map link appears here whenever an SOS alert is active.
                </div>
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

      <Dialog open={countdownOpen} onOpenChange={setCountdownOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose SOS mode</DialogTitle>
            <DialogDescription>Select whether to send the alert instantly or after a short countdown.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            {countdownOptions.map((option) => (
              <Button key={option.label} variant="outline" className="w-full justify-between" onClick={() => startCountdown(option.seconds)}>
                <span>{option.label}</span>
                {option.seconds === 0 ? <ShieldCheck className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Index;
