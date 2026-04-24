import { useState, useEffect } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  error: string | null;
  loading: boolean;
}

const LocationDisplay = () => {
  const [location, setLocation] = useState<LocationData>({
    latitude: null,
    longitude: null,
    address: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false,
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: "Location captured successfully",
          error: null,
          loading: false,
        });
      },
      (error) => {
        setLocation(prev => ({
          ...prev,
          error: "Unable to retrieve your location. Please enable location services.",
          loading: false,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return (
    <Card className="gradient-card shadow-card border-0 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
            {location.loading ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : location.error ? (
              <MapPin className="w-6 h-6 text-destructive" />
            ) : (
              <Navigation className="w-6 h-6 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">Your Location</h3>
            
            {location.loading ? (
              <p className="text-sm text-muted-foreground">Detecting your location...</p>
            ) : location.error ? (
              <p className="text-sm text-destructive">{location.error}</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-safe font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
                  Location captured
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationDisplay;
