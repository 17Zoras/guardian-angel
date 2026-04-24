import { useEffect, useRef, useState } from "react";
import {
  Phone,
  Flashlight,
  Volume2,
  Share2,
  MapPin,
  MessageSquare,
  Shield,
  BookOpen,
  Bell,
  Timer,
  Vibrate,
  Info,
  Play,
  X,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { useNotifications } from "@/hooks/useNotifications";

const SAFE_WALK_KEY = "guardian-safe-walk";

interface SafeWalkState {
  endsAt: number;
  durationMinutes: number;
}

const Tools = () => {
  const { settings, updateSettings } = useSettings();
  const { addNotification } = useNotifications();

  const [flashlightOn, setFlashlightOn] = useState(false);
  const [sirenOn, setSirenOn] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const fakeCallTimeoutRef = useRef<number | null>(null);

  const [safeWalkOpen, setSafeWalkOpen] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [fakeCallOpen, setFakeCallOpen] = useState(false);
  const [fakeCallActive, setFakeCallActive] = useState(false);
  const [callerName, setCallerName] = useState("Mom");
  const [callDelay, setCallDelay] = useState(5);

  const [resourceOpen, setResourceOpen] = useState<string | null>(null);

  useEffect(() => {
    const savedSafeWalk = window.localStorage.getItem(SAFE_WALK_KEY);
    if (!savedSafeWalk) {
      return;
    }

    try {
      const parsed = JSON.parse(savedSafeWalk) as SafeWalkState;
      const remaining = Math.max(0, Math.round((parsed.endsAt - Date.now()) / 1000));
      if (remaining > 0) {
        setTimerMinutes(parsed.durationMinutes);
        setTimeRemaining(remaining);
        setTimerActive(true);
      } else {
        window.localStorage.removeItem(SAFE_WALK_KEY);
      }
    } catch {
      window.localStorage.removeItem(SAFE_WALK_KEY);
    }
  }, []);

  useEffect(() => {
    if (!timerActive) {
      return;
    }

    const interval = window.setInterval(() => {
      setTimeRemaining((previous) => {
        const next = previous - 1;
        if (next <= 0) {
          window.clearInterval(interval);
          setTimerActive(false);
          window.localStorage.removeItem(SAFE_WALK_KEY);
          toast.error("Check-in time expired", {
            description: "We recorded the missed check-in so you can act quickly.",
            duration: 10000,
          });
          addNotification.mutate({
            type: "alert",
            title: "Safe Walk expired",
            message: "Check-in time expired. Review your status and contact your trusted circle.",
          });
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [addNotification, timerActive]);

  useEffect(() => {
    return () => {
      if (fakeCallTimeoutRef.current) {
        window.clearTimeout(fakeCallTimeoutRef.current);
      }

      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }

      audioContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  const handleFakeCall = () => {
    setFakeCallOpen(false);
    toast.info(`Incoming call scheduled in ${callDelay} seconds`);

    fakeCallTimeoutRef.current = window.setTimeout(() => {
      setFakeCallActive(true);
    }, callDelay * 1000);
  };

  const handleAnswerCall = () => {
    setFakeCallActive(false);
    toast.success("Call connected");
  };

  const handleDeclineCall = () => {
    setFakeCallActive(false);
  };

  const handleFlashlight = () => {
    setFlashlightOn((previous) => !previous);
    toast.success(!flashlightOn ? "Screen beacon enabled" : "Screen beacon disabled");
  };

  const handleSiren = async () => {
    if (sirenOn) {
      oscillatorRef.current?.stop();
      oscillatorRef.current = null;
      gainNodeRef.current?.disconnect();
      gainNodeRef.current = null;
      setSirenOn(false);
      toast.info("Siren stopped");
      return;
    }

    try {
      const audioContext = audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = audioContext;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.08;

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();

      oscillatorRef.current = oscillator;
      gainNodeRef.current = gainNode;
      setSirenOn(true);
      toast.success("Siren activated");
    } catch {
      toast.error("Unable to start the siren on this device");
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
        if (navigator.share) {
          try {
            await navigator.share({
              title: "My location",
              text: "Sharing my current location for safety.",
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
      () => toast.error("Unable to get location")
    );
  };

  const startSafeWalk = () => {
    const durationSeconds = timerMinutes * 60;
    setTimeRemaining(durationSeconds);
    setTimerActive(true);
    setSafeWalkOpen(false);

    window.localStorage.setItem(
      SAFE_WALK_KEY,
      JSON.stringify({
        endsAt: Date.now() + durationSeconds * 1000,
        durationMinutes: timerMinutes,
      } satisfies SafeWalkState)
    );

    toast.success(`Safe Walk started for ${timerMinutes} minutes`);
    addNotification.mutate({
      type: "info",
      title: "Safe Walk started",
      message: `Timer set for ${timerMinutes} minutes.`,
    });
  };

  const cancelSafeWalk = () => {
    setTimerActive(false);
    setTimeRemaining(0);
    window.localStorage.removeItem(SAFE_WALK_KEY);
    toast.info("Safe Walk cancelled");
  };

  const checkIn = () => {
    setTimerActive(false);
    setTimeRemaining(0);
    window.localStorage.removeItem(SAFE_WALK_KEY);
    toast.success("Check-in successful");
    addNotification.mutate({
      type: "success",
      title: "Safe Walk check-in",
      message: "You confirmed that you are safe.",
    });
  };

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  const quickTools = [
    {
      icon: Phone,
      label: "Fake Call",
      description: "Simulate an incoming call",
      color: "text-primary",
      bgColor: "bg-primary/10",
      action: () => setFakeCallOpen(true),
    },
    {
      icon: Flashlight,
      label: "Beacon",
      description: flashlightOn ? "Bright screen alert" : "Turn screen into a signal",
      color: flashlightOn ? "text-primary" : "text-muted-foreground",
      bgColor: flashlightOn ? "bg-primary/20" : "bg-muted",
      action: handleFlashlight,
    },
    {
      icon: Volume2,
      label: "Siren",
      description: sirenOn ? "Loud alarm active" : "Create attention fast",
      color: sirenOn ? "text-sos" : "text-muted-foreground",
      bgColor: sirenOn ? "bg-sos/20" : "bg-muted",
      action: handleSiren,
    },
    {
      icon: Share2,
      label: "Share Location",
      description: "Send your current map pin",
      color: "text-safe",
      bgColor: "bg-safe/10",
      action: handleShareLocation,
    },
  ];

  const resources = [
    {
      icon: BookOpen,
      label: "Safety Guide",
      description: "Tips for staying safe",
      content:
        "Build habits before stress hits:\n\n• Keep emergency contacts updated.\n• Share your route before late travel.\n• Stay in well-lit, public areas when possible.\n• Trust your instincts and exit early when something feels wrong.",
    },
    {
      icon: MapPin,
      label: "Safe Places",
      description: "Find nearby help",
      content:
        "Look for police stations, hospitals, busy cafes, pharmacies, hotels, and 24-hour stores. Pick places with staff, cameras, and clear exits.",
    },
    {
      icon: MessageSquare,
      label: "Crisis Support",
      description: "24/7 help lines",
      content:
        "Emergency numbers:\n• 112 / 911 for immediate emergency help\n• 988 for mental health crisis support\n• 1-800-799-7233 for domestic violence support",
    },
    {
      icon: Shield,
      label: "Self Defense",
      description: "Escape-first basics",
      content:
        "Aim for disruption, not a fight:\n1. Create distance.\n2. Use your voice loudly.\n3. Target vulnerable areas only to escape.\n4. Move to people, light, and help immediately.",
    },
  ];

  return (
    <Layout>
      {flashlightOn && (
        <div className="pointer-events-none fixed inset-0 z-40 animate-pulse bg-white/70 mix-blend-screen" />
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Safety Tools</h1>
          <p className="text-muted-foreground">Fast actions, guided check-ins, and backup options when you need them.</p>
        </div>

        {timerActive && (
          <Card className="gradient-card border-0 border-l-4 border-l-primary shadow-card">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Safe Walk Active</span>
                </div>
                <span className="text-2xl font-bold text-primary">{formatTime(timeRemaining)}</span>
              </div>
              <Progress value={(timeRemaining / (timerMinutes * 60)) * 100} className="mb-3" />
              <div className="flex gap-2">
                <Button onClick={checkIn} className="flex-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  I&apos;m Safe
                </Button>
                <Button variant="outline" onClick={cancelSafeWalk}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="gradient-card border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Shield className="h-5 w-5 text-primary" />
              Quick Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickTools.map((tool) => (
                <Button
                  key={tool.label}
                  variant="ghost"
                  className="h-auto flex-col items-center gap-2 rounded-xl bg-muted/50 px-4 py-4 hover:bg-muted"
                  onClick={tool.action}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${tool.bgColor}`}>
                    <tool.icon className={`h-6 w-6 ${tool.color}`} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">{tool.label}</p>
                    <p className="text-xs text-muted-foreground">{tool.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {!timerActive && (
          <Card className="gradient-card border-0 bg-gradient-to-r from-primary/5 to-safe/5 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Timer className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Safe Walk Timer</h3>
                  <p className="text-sm text-muted-foreground">Set a timed check-in when traveling alone.</p>
                </div>
                <Button onClick={() => setSafeWalkOpen(true)}>Start</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="gradient-card border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Auto Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Vibrate className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <Label className="font-medium">Shake to Alert</Label>
                  <p className="text-xs text-muted-foreground">Prepare for quick SOS activation</p>
                </div>
              </div>
              <Switch checked={settings?.shake_to_alert ?? true} onCheckedChange={(checked) => updateSettings.mutate({ shake_to_alert: checked })} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <Label className="font-medium">Auto Recording</Label>
                  <p className="text-xs text-muted-foreground">Keep a record when an SOS alert starts</p>
                </div>
              </div>
              <Switch checked={settings?.auto_recording ?? false} onCheckedChange={(checked) => updateSettings.mutate({ auto_recording: checked })} />
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Info className="h-5 w-5 text-primary" />
              Safety Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {resources.map((resource) => (
              <Button
                key={resource.label}
                variant="ghost"
                className="h-auto w-full justify-start rounded-xl px-3 py-3 hover:bg-muted/50"
                onClick={() => setResourceOpen(resource.label)}
              >
                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <resource.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{resource.label}</p>
                  <p className="text-xs text-muted-foreground">{resource.description}</p>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sos bg-sos/5 shadow-card">
          <CardContent className="p-4">
            <h3 className="mb-3 font-semibold text-foreground">Emergency Numbers</h3>
            <div className="space-y-2">
              {[
                { num: "112", label: "Emergency", color: "text-sos" },
                { num: "911", label: "US Emergency", color: "text-primary" },
                { num: "988", label: "Crisis Line", color: "text-safe" },
              ].map((entry) => (
                <Button
                  key={entry.num}
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => {
                    window.location.href = `tel:${entry.num}`;
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Phone className={`h-4 w-4 ${entry.color}`} />
                    <span>
                      {entry.num} - {entry.label}
                    </span>
                  </div>
                  <span className={`${entry.color} font-bold`}>Call</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={safeWalkOpen} onOpenChange={setSafeWalkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Safe Walk Timer</DialogTitle>
            <DialogDescription>Set how long until you should check in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Timer Duration (minutes)</Label>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 30, 60].map((minutes) => (
                  <Button
                    key={minutes}
                    variant={timerMinutes === minutes ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimerMinutes(minutes)}
                  >
                    {minutes}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={startSafeWalk} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Start {timerMinutes} Minute Timer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={fakeCallOpen} onOpenChange={setFakeCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Up Fake Call</DialogTitle>
            <DialogDescription>Configure your fake incoming call.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Caller Name</Label>
              <Input value={callerName} onChange={(event) => setCallerName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Call in (seconds)</Label>
              <div className="flex gap-2">
                {[5, 10, 30, 60].map((seconds) => (
                  <Button
                    key={seconds}
                    variant={callDelay === seconds ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCallDelay(seconds)}
                  >
                    {seconds}s
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={handleFakeCall} className="w-full">
              <Phone className="mr-2 h-4 w-4" />
              Schedule Fake Call
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {fakeCallActive && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background p-8">
          <div className="mb-6 flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-primary/10">
            <Phone className="h-12 w-12 text-primary" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">{callerName}</h2>
          <p className="mb-12 text-muted-foreground">Incoming Call...</p>
          <div className="flex gap-8">
            <Button onClick={handleDeclineCall} size="lg" className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90">
              <X className="h-8 w-8" />
            </Button>
            <Button onClick={handleAnswerCall} size="lg" className="h-16 w-16 rounded-full bg-safe hover:bg-safe/90">
              <Phone className="h-8 w-8" />
            </Button>
          </div>
        </div>
      )}

      {resources.map((resource) => (
        <Dialog key={resource.label} open={resourceOpen === resource.label} onOpenChange={() => setResourceOpen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{resource.label}</DialogTitle>
            </DialogHeader>
            <p className="whitespace-pre-line text-muted-foreground">{resource.content}</p>
          </DialogContent>
        </Dialog>
      ))}
    </Layout>
  );
};

export default Tools;
