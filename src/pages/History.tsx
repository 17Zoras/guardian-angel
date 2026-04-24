import { Clock, MapPin, CheckCircle2, XCircle, AlertTriangle, Route } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";
import { useAlerts, Alert } from "@/hooks/useAlerts";
import { formatDistanceToNow } from "date-fns";

const getStatusBadge = (status: Alert["status"]) => {
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

const AlertCard = ({ alert, onResolve, onCancel }: { alert: Alert; onResolve: () => void; onCancel: () => void }) => (
  <Card className="gradient-card border-0 shadow-card">
    <CardContent className="p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
        </div>
        {getStatusBadge(alert.status)}
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

const History = () => {
  const { alerts, isLoading, error, updateAlert } = useAlerts();

  const active = alerts.filter((a) => a.status === "active");
  const resolved = alerts.filter((a) => a.status === "resolved");
  const cancelled = alerts.filter((a) => a.status === "cancelled");
  const responseAlerts = resolved.filter((a) => a.response_time_min);
  const avgResponse =
    responseAlerts.reduce((sum, alert) => sum + (alert.response_time_min ?? 0), 0) / (responseAlerts.length || 1);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Card className="gradient-card border-0 shadow-card">
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
            <h2 className="text-lg font-semibold text-foreground">History is not ready yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const renderAlerts = (list: Alert[], emptyLabel: string) =>
    list.length === 0 ? (
      <Card className="gradient-card border-0 shadow-card">
        <CardContent className="py-12 text-center">
          <Clock className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alert History</h1>
          <p className="text-muted-foreground">View and manage every SOS event you have created.</p>
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
              <p className="text-2xl font-bold text-primary">{avgResponse > 0 ? `~${Math.round(avgResponse)}m` : "—"}</p>
              <p className="text-xs text-muted-foreground">Avg Response</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4 space-y-3">{renderAlerts(alerts, "No alerts yet")}</TabsContent>
          <TabsContent value="active" className="mt-4 space-y-3">{renderAlerts(active, "No active alerts")}</TabsContent>
          <TabsContent value="resolved" className="mt-4 space-y-3">{renderAlerts(resolved, "No resolved alerts")}</TabsContent>
          <TabsContent value="cancelled" className="mt-4 space-y-3">{renderAlerts(cancelled, "No cancelled alerts")}</TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default History;
