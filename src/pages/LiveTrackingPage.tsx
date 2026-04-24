import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNowStrict, format } from "date-fns";
import { ArrowLeft, ExternalLink, MapPin, Clock, Loader2, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAlertEvents } from "@/hooks/useAlertEvents";

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

const LiveTrackingPage = () => {
  const { alertId } = useParams<{ alertId: string }>();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const { alertEvents } = useAlertEvents(alertId);

  useEffect(() => {
    if (!alertId) {
      return;
    }

    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, latitude, longitude, created_at")
        .eq("alert_id", alertId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error) {
        setLocation(data ?? null);
      }

      setLoading(false);
    };

    fetchLatest();

    const channel = supabase
      .channel(`live-locations-${alertId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "locations",
          filter: `alert_id=eq.${alertId}`,
        },
        (payload) => {
          setLocation(payload.new as Location);
          setLoading(false);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [alertId]);

  if (!alertId) {
    return <div className="p-4">Invalid alert ID</div>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl space-y-4 bg-background p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/history">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Live Tracking</h1>
          <p className="font-mono text-xs text-muted-foreground">Alert: {alertId.slice(0, 8)}...</p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Fetching location...</span>
          </CardContent>
        </Card>
      ) : !location ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No location data available for this alert yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="gradient-card border-0 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                Current Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Latitude</p>
                  <p className="font-mono font-semibold text-foreground">{location.latitude.toFixed(6)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Longitude</p>
                  <p className="font-mono font-semibold text-foreground">{location.longitude.toFixed(6)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Updated {formatDistanceToNowStrict(new Date(location.created_at), { addSuffix: true })}
                </span>
                <span>{format(new Date(location.created_at), "MMM d, yyyy h:mm:ss a")}</span>
              </div>

              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Google Maps
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <iframe
              title="Live Location Map"
              width="100%"
              height="380"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${location.latitude},${location.longitude}&output=embed`}
            />
          </Card>

          <Card className="gradient-card border-0 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Alert Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No alert events yet.</p>
              ) : (
                alertEvents.slice(0, 8).map((event) => (
                  <div key={event.id} className="rounded-xl bg-muted/50 p-3">
                    <p className="font-medium text-foreground">{event.message}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(event.created_at), "MMM d, yyyy h:mm:ss a")}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default LiveTrackingPage;
