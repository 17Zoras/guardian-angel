import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";

export interface Alert {
  id: string;
  user_id: string;
  latitude: number | null;
  longitude: number | null;
  location_text: string;
  status: "active" | "resolved" | "cancelled";
  contacts_notified: number;
  response_time_min: number | null;
  created_at: string;
  resolved_at: string | null;
}

export const useAlerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["alerts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!user,
    retry: false,
  });

  const createAlert = useMutation({
    mutationFn: async (alert: { latitude?: number; longitude?: number; location_text?: string; contacts_notified?: number }) => {
      const { data, error } = await supabase.from("alerts").insert({
        ...alert,
        user_id: user!.id,
        status: "active",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateAlert = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Alert["status"] }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "resolved") {
        const existingAlert = (query.data ?? []).find((alert) => alert.id === id);
        const resolvedAt = new Date();
        updates.resolved_at = resolvedAt.toISOString();

        if (existingAlert?.created_at) {
          const createdAt = new Date(existingAlert.created_at);
          const responseMinutes = Math.max(
            1,
            Math.round((resolvedAt.getTime() - createdAt.getTime()) / 60000)
          );
          updates.response_time_min = responseMinutes;
        }
      }
      const { error } = await supabase.from("alerts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const alerts = query.data ?? [];
  const activeAlert = alerts.find((alert) => alert.status === "active") ?? null;

  return {
    alerts,
    activeAlert,
    isLoading: query.isLoading,
    error: query.error ? getSupabaseErrorMessage(query.error, "Unable to load alerts.") : null,
    createAlert,
    updateAlert,
  };
};
