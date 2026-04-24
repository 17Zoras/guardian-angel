import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Bell,
  Moon,
  Globe,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Heart,
  Check,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useContacts } from "@/hooks/useContacts";

const Profile = () => {
  const { theme, setTheme } = useTheme();
  const { profile, isLoading: profileLoading, error: profileError, updateProfile } = useProfile();
  const { settings, isLoading: settingsLoading, error: settingsError, updateSettings } = useSettings();
  const { contacts, error: contactsError } = useContacts();
  const { signOut, updateAccount, user } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isMedicalEditing, setIsMedicalEditing] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");

  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "" });
  const [medicalForm, setMedicalForm] = useState({ blood_type: "", allergies: "", medical_conditions: "" });

  const startEditProfile = () => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
      });
    }
    setIsEditing(true);
  };

  const startEditMedical = () => {
    if (profile) {
      setMedicalForm({
        blood_type: profile.blood_type ?? "",
        allergies: profile.allergies ?? "",
        medical_conditions: profile.medical_conditions ?? "",
      });
    }
    setIsMedicalEditing(true);
  };

  const handleSave = () => {
    if (editForm.email.trim() && editForm.email.trim() !== user?.email) {
      updateAccount({ email: editForm.email.trim() }).then(({ error }) => {
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Account email update requested. Check your inbox if confirmation is required.");
        }
      });
    }

    updateProfile.mutate({
      full_name: editForm.full_name.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
    });
    setIsEditing(false);
  };

  const handleMedicalSave = () => {
    updateProfile.mutate({
      blood_type: medicalForm.blood_type,
      allergies: medicalForm.allergies.trim(),
      medical_conditions: medicalForm.medical_conditions.trim(),
    });
    setIsMedicalEditing(false);
  };

  const handleDarkModeChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
    updateSettings.mutate({ theme: checked ? "dark" : "light" });
  };

  const handleNotificationsChange = (checked: boolean) => {
    updateSettings.mutate({ notifications_enabled: checked });
    toast.success(checked ? "Notifications enabled" : "Notifications disabled");
  };

  const handleLanguageChange = (language: string) => {
    updateSettings.mutate({ language });
    const languageNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      hi: "Hindi",
    };
    toast.success(`Language changed to ${languageNames[language]}`);
    setLanguageDialogOpen(false);
  };

  const handleLogout = async () => {
    setLogoutDialogOpen(false);
    await signOut();
    navigate("/auth");
  };

  const handlePasswordUpdate = async () => {
    if (accountPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    const { error } = await updateAccount({ password: accountPassword });
    if (error) {
      toast.error(error.message);
      return;
    }

    setAccountPassword("");
    toast.success("Password updated");
  };

  const languages = [
    { code: "en", name: "English (US)" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
    { code: "hi", name: "Hindi" },
  ];

  const helpTopics = [
    { title: "How to use SOS", description: "Tap the SOS button to start an alert, save the event, and begin live tracking." },
    { title: "Adding contacts", description: "Go to Contacts and add the people you trust most so they are ready when you need them." },
    { title: "Safe Walk Timer", description: "Set a timer while traveling. If you miss your check-in, the app records it so you can act fast." },
    { title: "Privacy & Data", description: "Your location only becomes visible during active alerts or when you manually share it." },
  ];

  if (profileLoading || settingsLoading) {
    return (
      <Layout>
        <div className="space-y-4 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
      </Layout>
    );
  }

  if (profileError || settingsError) {
    return (
      <Layout>
        <Card className="gradient-card border-0 shadow-card">
          <CardContent className="p-6 text-center">
            <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold text-foreground">Profile setup is incomplete</h2>
            <p className="mt-2 text-sm text-muted-foreground">{profileError || settingsError}</p>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Account Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={profile?.email ?? user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={accountPassword}
                onChange={(event) => setAccountPassword(event.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handlePasswordUpdate} disabled={!accountPassword}>
              Update Password
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const readinessScore = [
    profile?.full_name,
    profile?.phone,
    contacts.length > 0 ? "contacts" : "",
    profile?.blood_type,
  ].filter(Boolean).length * 25;

  return (
    <Layout>
      <div className="space-y-6">
        <Card className="gradient-card overflow-hidden border-0 shadow-card">
          <div className="h-24 bg-gradient-to-r from-primary/20 via-accent/30 to-safe/20" />
          <CardContent className="relative pt-0 pb-6">
            <div className="-mt-12 flex flex-col items-center">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                  {profile?.full_name?.split(" ").map((name) => name[0]).join("") || "U"}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-xl font-bold text-foreground">{profile?.full_name || "User"}</h2>
              <p className="text-muted-foreground">{profile?.email}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => (isEditing ? setIsEditing(false) : startEditProfile())}>
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-muted/50 p-4 text-center">
                <p className="text-xs text-muted-foreground">Readiness</p>
                <p className="text-2xl font-bold text-primary">{readinessScore}%</p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4 text-center">
                <p className="text-xs text-muted-foreground">Contacts</p>
                <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4 text-center">
                <p className="text-xs text-muted-foreground">Theme</p>
                <p className="text-2xl font-bold text-foreground capitalize">{theme}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {contactsError && (
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-4 text-sm text-muted-foreground">{contactsError}</CardContent>
          </Card>
        )}

        {isEditing && (
          <Card className="gradient-card border-0 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={editForm.full_name} onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={updateProfile.isPending}>
                <Check className="mr-2 h-4 w-4" />
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="gradient-card border-0 shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Heart className="h-5 w-5 text-sos" />
                Medical Information
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => (isMedicalEditing ? setIsMedicalEditing(false) : startEditMedical())}>
                {isMedicalEditing ? "Cancel" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isMedicalEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Blood Type</Label>
                  <Select value={medicalForm.blood_type} onValueChange={(value) => setMedicalForm({ ...medicalForm, blood_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Allergies</Label>
                  <Input value={medicalForm.allergies} onChange={(event) => setMedicalForm({ ...medicalForm, allergies: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Medical Conditions</Label>
                  <Input
                    value={medicalForm.medical_conditions}
                    onChange={(event) => setMedicalForm({ ...medicalForm, medical_conditions: event.target.value })}
                  />
                </div>
                <Button onClick={handleMedicalSave} className="w-full" disabled={updateProfile.isPending}>
                  <Check className="mr-2 h-4 w-4" />
                  Save Medical Info
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Blood Type</p>
                    <p className="font-semibold text-foreground">{profile?.blood_type || "Not set"}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Allergies</p>
                    <p className="font-semibold text-foreground">{profile?.allergies || "None listed"}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Medical Conditions</p>
                  <p className="font-semibold text-foreground">{profile?.medical_conditions || "None listed"}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Safety Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Profile name added", done: Boolean(profile?.full_name) },
              { label: "Phone number saved", done: Boolean(profile?.phone) },
              { label: "Emergency contact added", done: contacts.length > 0 },
              { label: "Medical blood type set", done: Boolean(profile?.blood_type) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.done ? "bg-safe/10" : "bg-muted"}`}>
                    {item.done ? <Check className="h-4 w-4 text-safe" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <p className="font-medium text-foreground">{item.label}</p>
                </div>
                <span className={`text-sm font-semibold ${item.done ? "text-safe" : "text-muted-foreground"}`}>
                  {item.done ? "Done" : "Pending"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Notifications</p>
                  <p className="text-xs text-muted-foreground">App alert reminders and updates</p>
                </div>
              </div>
              <Switch checked={settings?.notifications_enabled ?? true} onCheckedChange={handleNotificationsChange} />
            </div>
            <Separator />
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Moon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Reduce eye strain</p>
                </div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={handleDarkModeChange} />
            </div>
            <Separator />
            <button className="flex w-full items-center justify-between rounded-lg py-3 transition-colors hover:bg-muted/30" onClick={() => setLanguageDialogOpen(true)}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Language</p>
                  <p className="text-xs text-muted-foreground">{languages.find((language) => language.code === (settings?.language ?? "en"))?.name}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <Separator />
            <button className="flex w-full items-center justify-between rounded-lg py-3 transition-colors hover:bg-muted/30" onClick={() => setPrivacyDialogOpen(true)}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Privacy</p>
                  <p className="text-xs text-muted-foreground">Manage your data</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        <Card className="gradient-card border-0 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <button className="flex w-full items-center justify-between rounded-lg py-3 transition-colors hover:bg-muted/30" onClick={() => setHelpDialogOpen(true)}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Help Center</p>
                  <p className="text-xs text-muted-foreground">FAQs and guides</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setLogoutDialogOpen(true)}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>

        <p className="pb-4 text-center text-xs text-muted-foreground">SafeHer v1.0.0 • Built to help you move with more confidence.</p>
      </div>

      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help Center</DialogTitle>
            <DialogDescription>Frequently asked questions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {helpTopics.map((topic) => (
              <div key={topic.title} className="rounded-xl bg-muted/50 p-3">
                <p className="font-medium text-foreground">{topic.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{topic.description}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={languageDialogOpen} onOpenChange={setLanguageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Language</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`flex w-full items-center justify-between rounded-xl p-3 transition-colors ${
                  (settings?.language ?? "en") === language.code ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                }`}
              >
                <span className="font-medium">{language.name}</span>
                {(settings?.language ?? "en") === language.code && <Check className="h-5 w-5" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacy Settings</DialogTitle>
            <DialogDescription>Control how your data is used</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="font-medium text-foreground">Location Data</p>
              <p className="text-sm text-muted-foreground">Your location is only shared during active SOS alerts or manual sharing.</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="font-medium text-foreground">Contact Information</p>
              <p className="text-sm text-muted-foreground">Stored for your use inside the app and not shown publicly.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>Are you sure you want to sign out?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Profile;
