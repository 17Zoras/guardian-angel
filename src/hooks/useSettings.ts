import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";

export interface UserSettings {
  id: string;
  user_id: string;
  theme: string;
  language: string;
  notifications_enabled: boolean;
  shake_to_alert: boolean;
  auto_recording: boolean;
}

export const useSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return data as UserSettings;
      }

      const { data: created, error: insertError } = await supabase
        .from("user_settings")
        .insert({ user_id: user!.id })
        .select()
        .single();

      if (insertError) throw insertError;
      return created as UserSettings;
    },
    enabled: !!user,
    retry: false,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const { error } = await supabase
        .from("user_settings")
        .update(updates)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error ? getSupabaseErrorMessage(query.error, "Unable to load settings.") : null,
    updateSettings,
  };
};
