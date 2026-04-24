import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Flashlight,
  Info,
  MapPin,
  MessageSquare,
  Mic,
  PauseCircle,
  Phone,
  Play,
  Save,
  Share2,
  Shield,
  Square,
  Timer,
  Trash2,
  Vibrate,
  Volume2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { useNotifications } from "@/hooks/useNotifications";
import { useSafetyCheckins } from "@/hooks/useSafetyCheckins";
import { useEvidence } from "@/hooks/useEvidence";
import { useAlerts } from "@/hooks/useAlerts";
import { useContacts } from "@/hooks/useContacts";
import { useAlertEvents } from "@/hooks/useAlertEvents";

const Tools = () => {
  const { settings, updateSettings } = useSettings();
  const { addNotification } = useNotifications();
  const { contacts } = useContacts();
  const { activeAlert, createAlert } = useAlerts();
  const { createEvent } = useAlertEvents(activeAlert?.id);
  const { activeCheckin, checkins, createCheckin, updateCheckin, error: checkinError } = useSafetyCheckins();
  const { evidenceItems, addEvidence, updateEvidence, deleteEvidence, error: evidenceError } = useEvidence();

  const [flashlightOn, setFlashlightOn] = useState(false);
  const [sirenOn, setSirenOn] = useState(false);
  const [safeWalkOpen, setSafeWalkOpen] = useState(false);
  const [manualCheckOpen, setManualCheckOpen] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(15);
  const [checkInTitle, setCheckInTitle] = useState("Quick safety check-in");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [fakeCallOpen, setFakeCallOpen] = useState(false);
  const [fakeCallActive, setFakeCallActive] = useState(false);
  const [callerName, setCallerName] = useState("Mom");
  const [callDelay, setCallDelay] = useState(5);
  const [resourceOpen, setResourceOpen] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const fakeCallTimeoutRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!activeCheckin) {
      setTimeRemaining(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.round((new Date(activeCheckin.expires_at).getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [activeCheckin]);

  useEffect(() => {
    if (!activeCheckin || timeRemaining !== 0) {
      return;
    }

    if (activeCheckin.status !== "active") {
      return;
    }

    const expire = async () => {
      let createdAlertId = activeCheckin.created_alert_id;

      if (!createdAlertId) {
        const alert = await createAlert.mutateAsync({
          contacts_notified: contacts.length,
          location_text: `${activeCheckin.title} expired and triggered escalation.`,
        });
        createdAlertId = alert.id;
      }

      updateCheckin.mutate({
        id: activeCheckin.id,
        updates: {
          status: "expired",
          created_alert_id: createdAlertId,
        },
      });

      createEvent.mutate({
        alert_id: createdAlertId,
        event_type: "check_in_expired",
        message: `${activeCheckin.type === "safe_walk" ? "Safe Walk" : "Check-in"} timer expired.`,
      });

      addNotification.mutate({
        type: "alert",
        title: "Safety timer expired",
        message: "A safety timer expired and created a new alert for follow-up.",
      });

      toast.error("Safety timer expired", {
        description: "An alert was created so you can respond quickly.",
      });
    };

    void expire();
  }, [activeCheckin, addNotification, contacts.length, createAlert, createEvent, timeRemaining, updateCheckin]);

  useEffect(() => {
    return () => {
      if (fakeCallTimeoutRef.current) {
        window.clearTimeout(fakeCallTimeoutRef.current);
      }

      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
      }

      audioContextRef.current?.close().catch(() => undefined);
    };
  }, []);

  const handleFakeCall = () => {
    setFakeCallOpen(false);
    toast.info(`Incoming call scheduled in ${callDelay} seconds`);
    fakeCallTimeoutRef.current = window.setTimeout(() => setFakeCallActive(true), callDelay * 1000);
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
      async (position) => {
        const url = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
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
            // fall through
          }
        }

        await navigator.clipboard.writeText(url);
        toast.success("Location link copied");
      },
      () => toast.error("Unable to get location")
    );
  };

  const startCheckin = (type: "safe_walk" | "manual_check_in") => {
    const expiresAt = new Date(Date.now() + timerMinutes * 60 * 1000).toISOString();
    createCheckin.mutate({
      type,
      title: type === "safe_walk" ? "Safe Walk Timer" : checkInTitle.trim() || "Manual Check-In",
      duration_minutes: timerMinutes,
      expires_at: expiresAt,
    });

    setSafeWalkOpen(false);
    setManualCheckOpen(false);
    addNotification.mutate({
      type: "info",
      title: type === "safe_walk" ? "Safe Walk started" : "Check-in timer started",
      message: `Timer set for ${timerMinutes} minutes.`,
    });
    toast.success(`${type === "safe_walk" ? "Safe Walk" : "Check-in"} started for ${timerMinutes} minutes`);
  };

  const cancelCheckin = () => {
    if (!activeCheckin) return;
    updateCheckin.mutate({
      id: activeCheckin.id,
      updates: { status: "cancelled" },
    });
    toast.info("Safety timer cancelled");
  };

  const completeCheckin = () => {
    if (!activeCheckin) return;
    updateCheckin.mutate({
      id: activeCheckin.id,
      updates: { status: "completed", completed_at: new Date().toISOString() },
    });

    if (activeCheckin.created_alert_id) {
      createEvent.mutate({
        alert_id: activeCheckin.created_alert_id,
        event_type: "check_in_completed",
        message: "The user completed the safety check-in.",
      });
    }

    addNotification.mutate({
      type: "success",
      title: "Check-in completed",
      message: "You confirmed that you are safe.",
    });
    toast.success("Check-in successful");
  };

  const saveNote = () => {
    if (!noteTitle.trim() || !noteBody.trim()) {
      toast.error("Add a title and note content first");
      return;
    }

    addEvidence.mutate({
      title: noteTitle.trim(),
      item_type: "note",
      note: noteBody.trim(),
    });
    setNoteTitle("");
    setNoteBody("");
    setNoteOpen(false);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Audio recording is not supported on this device");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.readAsDataURL(blob);
        });

        addEvidence.mutate({
          title: `Audio evidence ${new Date().toLocaleString()}`,
          item_type: "audio",
          audio_data: dataUrl,
          mime_type: blob.type,
        });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch {
      toast.error("Unable to access your microphone");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
    toast.success("Recording saved");
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  const activeProgress = activeCheckin
    ? Math.max(0, Math.min(100, (timeRemaining / (activeCheckin.duration_minutes * 60)) * 100))
    : 0;

  const quickTools = [
    { icon: Phone, label: "Fake Call", description: "Simulate an incoming call", color: "text-primary", bgColor: "bg-primary/10", action: () => setFakeCallOpen(true) },
    { icon: Flashlight, label: "Beacon", description: flashlightOn ? "Bright screen alert" : "Turn screen into a signal", color: flashlightOn ? "text-primary" : "text-muted-foreground", bgColor: flashlightOn ? "bg-primary/20" : "bg-muted", action: handleFlashlight },
    { icon: Volume2, label: "Siren", description: sirenOn ? "Loud alarm active" : "Create attention fast", color: sirenOn ? "text-sos" : "text-muted-foreground", bgColor: sirenOn ? "bg-sos/20" : "bg-muted", action: handleSiren },
    { icon: Share2, label: "Share Location", description: "Send your current map pin", color: "text-safe", bgColor: "bg-safe/10", action: handleShareLocation },
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

  const recentEvidence = useMemo(() => evidenceItems.slice(0, 5), [evidenceItems]);

  return (
    <Layout>
      {flashlightOn && <div className="pointer-events-none fixed inset-0 z-40 animate-pulse bg-white/70 mix-blend-screen" />}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Safety Tools</h1>
          <p className="text-muted-foreground">Fast actions, durable evidence capture, and timed check-ins that survive refreshes.</p>
        </div>

        {(checkinError || evidenceError) && (
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-4 text-sm text-muted-foreground">{checkinError || evidenceError}</CardContent>
          </Card>
        )}

        {activeCheckin && (
          <Card className="gradient-card border-0 border-l-4 border-l-primary shadow-card">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">{activeCheckin.title}</span>
                </div>
                <span className="text-2xl font-bold text-primary">{formatTime(timeRemaining)}</span>
              </div>
              <Progress value={activeProgress} className="mb-3" />
              <div className="flex gap-2">
                <Button onClick={completeCheckin} className="flex-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  I&apos;m Safe
                </Button>
                <Button variant="outline" onClick={cancelCheckin}>
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
                <Button key={tool.label} variant="ghost" className="h-auto flex-col items-center gap-2 rounded-xl bg-muted/50 px-4 py-4 hover:bg-muted" onClick={tool.action}>
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

        {!activeCheckin && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="gradient-card border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Timer className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Safe Walk Timer</h3>
                    <p className="text-sm text-muted-foreground">Create an automatic escalation if you miss your check-in.</p>
                  </div>
                  <Button onClick={() => setSafeWalkOpen(true)}>Start</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-safe/10">
                    <Bell className="h-7 w-7 text-safe" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Manual Check-In</h3>
                    <p className="text-sm text-muted-foreground">Schedule a quick “I’m safe” deadline for any situation.</p>
                  </div>
                  <Button variant="outline" onClick={() => setManualCheckOpen(true)}>Create</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="gradient-card border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Evidence Vault</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Button variant="outline" onClick={() => setNoteOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                New Note
              </Button>
              {!isRecording ? (
                <Button variant="outline" onClick={startRecording}>
                  <Mic className="mr-2 h-4 w-4" />
                  Record Audio
                </Button>
              ) : (
                <Button variant="destructive" onClick={stopRecording}>
                  <Square className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
              )}
              <Button variant="outline" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
                <Info className="mr-2 h-4 w-4" />
                View Vault
              </Button>
            </div>

            {recentEvidence.length === 0 ? (
              <div className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                Nothing saved yet. Notes and recordings you create here will stay in your account.
              </div>
            ) : (
              <div className="space-y-3">
                {recentEvidence.map((item) => (
                  <div key={item.id} className="rounded-xl bg-muted/50 p-4">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.item_type} • {new Date(item.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => updateEvidence.mutate({ id: item.id, updates: { pinned: !item.pinned } })}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteEvidence.mutate(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {item.note && <p className="text-sm text-muted-foreground">{item.note}</p>}
                    {item.audio_data && <audio controls className="mt-3 w-full" src={item.audio_data} />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
                  <Label className="font-medium">Auto Recording Reminder</Label>
                  <p className="text-xs text-muted-foreground">Prompt evidence capture when an SOS alert begins</p>
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
              <Button key={resource.label} variant="ghost" className="h-auto w-full justify-start rounded-xl px-3 py-3 hover:bg-muted/50" onClick={() => setResourceOpen(resource.label)}>
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
                <Button key={entry.num} variant="ghost" className="w-full justify-between" onClick={() => { window.location.href = `tel:${entry.num}`; }}>
                  <div className="flex items-center gap-2">
                    <Phone className={`h-4 w-4 ${entry.color}`} />
                    <span>{entry.num} - {entry.label}</span>
                  </div>
                  <span className={`${entry.color} font-bold`}>Call</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {checkins.length > 0 && (
          <Card className="gradient-card border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Recent Timers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checkins.slice(0, 5).map((checkin) => (
                <div key={checkin.id} className="rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{checkin.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{checkin.type.replaceAll("_", " ")} • {checkin.status}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(checkin.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
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
                  <Button key={minutes} variant={timerMinutes === minutes ? "default" : "outline"} size="sm" onClick={() => setTimerMinutes(minutes)}>
                    {minutes}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={() => startCheckin("safe_walk")} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Start {timerMinutes} Minute Timer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manualCheckOpen} onOpenChange={setManualCheckOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Check-In Timer</DialogTitle>
            <DialogDescription>Create a named timer for any situation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={checkInTitle} onChange={(event) => setCheckInTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <div className="flex flex-wrap gap-2">
                {[5, 10, 15, 30, 60].map((minutes) => (
                  <Button key={minutes} variant={timerMinutes === minutes ? "default" : "outline"} size="sm" onClick={() => setTimerMinutes(minutes)}>
                    {minutes}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={() => startCheckin("manual_check_in")} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Start Check-In Timer
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
                  <Button key={seconds} variant={callDelay === seconds ? "default" : "outline"} size="sm" onClick={() => setCallDelay(seconds)}>
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

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Evidence Note</DialogTitle>
            <DialogDescription>Save a written note to your secure evidence vault.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea rows={6} value={noteBody} onChange={(event) => setNoteBody(event.target.value)} />
            </div>
            <Button onClick={saveNote} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Note
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
            <Button onClick={() => setFakeCallActive(false)} size="lg" className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90">
              <X className="h-8 w-8" />
            </Button>
            <Button onClick={() => { setFakeCallActive(false); toast.success("Call connected"); }} size="lg" className="h-16 w-16 rounded-full bg-safe hover:bg-safe/90">
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
