import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";
import type { Json } from "@/integrations/supabase/types";

export interface AlertEvent {
  id: string;
  alert_id: string;
  user_id: string;
  event_type:
    | "created"
    | "countdown_started"
    | "tracking_started"
    | "tracking_updated"
    | "escalated"
    | "resolved"
    | "cancelled"
    | "check_in_expired"
    | "check_in_completed";
  message: string;
  metadata: Json;
  created_at: string;
}

export const useAlertEvents = (alertId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["alert-events", user?.id, alertId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_events")
        .select("*")
        .eq("user_id", user!.id)
        .eq("alert_id", alertId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AlertEvent[];
    },
    enabled: !!user && !!alertId,
    retry: false,
  });

  const createEvent = useMutation({
    mutationFn: async (event: {
      alert_id: string;
      event_type: AlertEvent["event_type"];
      message: string;
      metadata?: Json;
    }) => {
      const { error } = await supabase.from("alert_events").insert({
        ...event,
        user_id: user!.id,
        metadata: event.metadata ?? {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-events"] });
    },
  });

  return {
    alertEvents: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? getSupabaseErrorMessage(query.error, "Unable to load alert activity.") : null,
    createEvent,
  };
};
