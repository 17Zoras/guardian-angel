import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const INTERVAL_MS = 5000;

interface UseLiveLocationReturn {
  isTracking: boolean;
  error: string | null;
  startTracking: (alertId: string) => void;
  stopTracking: () => void;
}

export const useLiveLocation = (): UseLiveLocationReturn => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertIdRef = useRef<string | null>(null);
  const latestPositionRef = useRef<GeolocationPosition | null>(null);

  const insertLocation = useCallback(
    async (position: GeolocationPosition) => {
      if (!user || !alertIdRef.current) {
        return;
      }

      const { error: dbError } = await supabase.from("locations").insert({
        alert_id: alertIdRef.current,
        user_id: user.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (dbError) {
        console.error("Location insert error:", dbError.message);
        return;
      }

      const { error: alertError } = await supabase
        .from("alerts")
        .update({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          location_text: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
        })
        .eq("id", alertIdRef.current);

      if (alertError) {
        console.error("Alert location update error:", alertError.message);
      }
    },
    [user]
  );

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    alertIdRef.current = null;
    latestPositionRef.current = null;
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(
    (alertId: string) => {
      if (watchIdRef.current !== null || intervalRef.current !== null) {
        return;
      }

      if (!navigator.geolocation) {
        setError("Geolocation not supported");
        toast.error("Geolocation not supported");
        return;
      }

      if (!user) {
        return;
      }

      setError(null);
      alertIdRef.current = alertId;
      setIsTracking(true);

      // WATCH GPS
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          latestPositionRef.current = position;

          // Insert immediately
          insertLocation(position);
        },
        (err) => {
          setError(err.message);
          toast.error("Unable to update your live location", {
            description: err.message,
          });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      // INSERT EVERY 5 SECONDS
      intervalRef.current = setInterval(() => {
        if (latestPositionRef.current) {
          insertLocation(latestPositionRef.current);
        }
      }, INTERVAL_MS);
    },
    [insertLocation, user]
  );

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  return { isTracking, error, startTracking, stopTracking };
};
