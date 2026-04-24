import { useMemo } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  MapPin,
  Route,
  Shield,
  Timer,
  XCircle,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlerts, type Alert } from "@/hooks/useAlerts";
import { useNotifications } from "@/hooks/useNotifications";
import { useSafetyCheckins } from "@/hooks/useSafetyCheckins";

type ActivityItem =
  | {
      id: string;
      kind: "alert";
      title: string;
      description: string;
      timestamp: string;
      status: string;
      alert: Alert;
    }
  | {
      id: string;
      kind: "checkin";
      title: string;
      description: string;
      timestamp: string;
      status: string;
    }
  | {
      id: string;
      kind: "notification";
      title: string;
      description: string;
      timestamp: string;
      status: string;
    };

const getAlertBadge = (status: Alert["status"]) => {
  switch (status) {
    case "resolved":
      return (
        <Badge className="border-safe/20 bg-safe/10 text-safe">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Resolved
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="secondary">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
    case "active":
      return (
        <Badge className="border-sos/20 bg-sos/10 text-sos">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Active
        </Badge>
      );
  }
};

const getActivityBadge = (item: ActivityItem) => {
  if (item.kind === "alert") {
    return getAlertBadge(item.alert.status);
  }

  if (item.kind === "checkin") {
    return (
      <Badge className="border-primary/20 bg-primary/10 text-primary capitalize">
        <Timer className="mr-1 h-3 w-3" />
        {item.status.replaceAll("_", " ")}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="capitalize">
      <Bell className="mr-1 h-3 w-3" />
      {item.status}
    </Badge>
  );
};

const AlertCard = ({ alert, onResolve, onCancel }: { alert: Alert; onResolve: () => void; onCancel: () => void }) => (
  <Card className="gradient-card border-0 shadow-card">
    <CardContent className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
        </div>
        {getAlertBadge(alert.status)}
      </div>

      <div className="mb-2 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium text-foreground">{alert.location_text || "Location captured"}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {alert.contacts_notified} contacts notified
          {alert.response_time_min ? ` • ${alert.response_time_min} min response` : ""}
        </p>

        <div className="flex flex-wrap gap-2">
          {(alert.latitude !== null || alert.longitude !== null || alert.status === "active") && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/track/${alert.id}`}>
                <Route className="mr-1 h-4 w-4" />
                Track
              </Link>
            </Button>
          )}
          {alert.status === "active" && (
            <>
              <Button size="sm" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={onResolve}>
                Resolve
              </Button>
            </>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

const ActivityCard = ({ item }: { item: ActivityItem }) => (
  <Card className="gradient-card border-0 shadow-card">
    <CardContent className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {item.kind === "alert" ? <Shield className="h-4 w-4" /> : item.kind === "checkin" ? <Timer className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
        </div>
        {getActivityBadge(item)}
      </div>
      <p className="font-medium text-foreground">{item.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      {item.kind === "alert" && (
        <Button asChild size="sm" variant="outline" className="mt-3">
          <Link to={`/track/${item.alert.id}`}>
            <Route className="mr-1 h-4 w-4" />
            Open Alert
          </Link>
        </Button>
      )}
    </CardContent>
  </Card>
);

const EmptyState = ({ label }: { label: string }) => (
  <Card className="gradient-card border-0 shadow-card">
    <CardContent className="py-12 text-center">
      <Clock className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground">{label}</p>
    </CardContent>
  </Card>
);

const History = () => {
  const { alerts, isLoading: alertsLoading, error: alertsError, updateAlert } = useAlerts();
  const { notifications, isLoading: notificationsLoading, error: notificationsError } = useNotifications();
  const { checkins, isLoading: checkinsLoading, error: checkinsError } = useSafetyCheckins();

  const active = alerts.filter((a) => a.status === "active");
  const resolved = alerts.filter((a) => a.status === "resolved");
  const cancelled = alerts.filter((a) => a.status === "cancelled");
  const responseAlerts = resolved.filter((a) => a.response_time_min);
  const avgResponse =
    responseAlerts.reduce((sum, alert) => sum + (alert.response_time_min ?? 0), 0) / (responseAlerts.length || 1);

  const activityFeed = useMemo<ActivityItem[]>(() => {
    const alertItems: ActivityItem[] = alerts.map((alert) => ({
      id: `alert-${alert.id}`,
      kind: "alert",
      title: `SOS ${alert.status}`,
      description: alert.location_text || "Emergency alert activity recorded.",
      timestamp: alert.updated_at || alert.created_at,
      status: alert.status,
      alert,
    }));

    const checkinItems: ActivityItem[] = checkins.map((checkin) => ({
      id: `checkin-${checkin.id}`,
      kind: "checkin",
      title: checkin.title,
      description: `${checkin.type.replaceAll("_", " ")} timer ${checkin.status}.`,
      timestamp: checkin.updated_at || checkin.created_at,
      status: checkin.status,
    }));

    const notificationItems: ActivityItem[] = notifications.map((notification) => ({
      id: `notification-${notification.id}`,
      kind: "notification",
      title: notification.title,
      description: notification.message,
      timestamp: notification.created_at,
      status: notification.type,
    }));

    return [...alertItems, ...checkinItems, ...notificationItems].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [alerts, checkins, notifications]);

  if (alertsLoading || notificationsLoading || checkinsLoading) {
    return (
      <Layout>
        <div className="space-y-4 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      </Layout>
    );
  }

  const combinedError = alertsError || notificationsError || checkinsError;

  if (combinedError) {
    return (
      <Layout>
        <Card className="gradient-card border-0 shadow-card">
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold text-foreground">History is not ready yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">{combinedError}</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const renderAlerts = (list: Alert[], emptyLabel: string) =>
    list.length === 0 ? (
      <EmptyState label={emptyLabel} />
    ) : (
      list.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onResolve={() => updateAlert.mutate({ id: alert.id, status: "resolved" })}
          onCancel={() => updateAlert.mutate({ id: alert.id, status: "cancelled" })}
        />
      ))
    );

  const renderActivity = (items: ActivityItem[], emptyLabel: string) =>
    items.length === 0 ? <EmptyState label={emptyLabel} /> : items.map((item) => <ActivityCard key={item.id} item={item} />);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Safety History</h1>
          <p className="text-muted-foreground">Track SOS alerts, fake-call events, safety timers, and your in-app notification history.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
              <p className="text-xs text-muted-foreground">Total Alerts</p>
            </CardContent>
          </Card>
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{checkins.length}</p>
              <p className="text-xs text-muted-foreground">Timers</p>
            </CardContent>
          </Card>
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-safe">{notifications.length}</p>
              <p className="text-xs text-muted-foreground">Notifications</p>
            </CardContent>
          </Card>
          <Card className="gradient-card border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-sos">{avgResponse > 0 ? `~${Math.round(avgResponse)}m` : "—"}</p>
              <p className="text-xs text-muted-foreground">Avg Response</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="timers">Timers</TabsTrigger>
            <TabsTrigger value="updates">Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-4 space-y-3">
            {renderActivity(activityFeed, "No history yet")}
          </TabsContent>

          <TabsContent value="alerts" className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="gradient-card border-0 shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-sos">{active.length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </CardContent>
              </Card>
              <Card className="gradient-card border-0 shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-safe">{resolved.length}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </CardContent>
              </Card>
              <Card className="gradient-card border-0 shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{cancelled.length}</p>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                </CardContent>
              </Card>
            </div>
            {renderAlerts(alerts, "No alerts yet")}
          </TabsContent>

          <TabsContent value="timers" className="mt-4 space-y-3">
            {renderActivity(activityFeed.filter((item) => item.kind === "checkin"), "No safety timers yet")}
          </TabsContent>

          <TabsContent value="updates" className="mt-4 space-y-3">
            {renderActivity(activityFeed.filter((item) => item.kind === "notification"), "No notifications yet")}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default History;
