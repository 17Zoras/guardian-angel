import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";

export interface SafetyCheckin {
  id: string;
  user_id: string;
  type: "safe_walk" | "manual_check_in";
  status: "active" | "completed" | "expired" | "cancelled";
  title: string;
  duration_minutes: number;
  started_at: string;
  expires_at: string;
  completed_at: string | null;
  notes: string | null;
  created_alert_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useSafetyCheckins = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["safety-checkins", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("safety_checkins")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SafetyCheckin[];
    },
    enabled: !!user,
    retry: false,
  });

  const createCheckin = useMutation({
    mutationFn: async (checkin: {
      type: SafetyCheckin["type"];
      title: string;
      duration_minutes: number;
      expires_at: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("safety_checkins")
        .insert({
          ...checkin,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SafetyCheckin;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety-checkins"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCheckin = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SafetyCheckin> }) => {
      const { error } = await supabase
        .from("safety_checkins")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety-checkins"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const activeCheckin = (query.data ?? []).find((checkin) => checkin.status === "active") ?? null;

  return {
    checkins: query.data ?? [],
    activeCheckin,
    isLoading: query.isLoading,
    error: query.error ? getSupabaseErrorMessage(query.error, "Unable to load safety timers.") : null,
    createCheckin,
    updateCheckin,
  };
};
