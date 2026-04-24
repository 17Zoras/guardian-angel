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
  ringtone_enabled: boolean;
  vibration_enabled: boolean;
  privacy_mode: "standard" | "enhanced";
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
      const normalizedUpdates = {
        user_id: user!.id,
        theme: updates.theme ?? query.data?.theme ?? "light",
        language: updates.language ?? query.data?.language ?? "en",
        notifications_enabled: updates.notifications_enabled ?? query.data?.notifications_enabled ?? true,
        ringtone_enabled: updates.ringtone_enabled ?? query.data?.ringtone_enabled ?? true,
        vibration_enabled: updates.vibration_enabled ?? query.data?.vibration_enabled ?? true,
        privacy_mode: updates.privacy_mode ?? query.data?.privacy_mode ?? "standard",
        shake_to_alert: updates.shake_to_alert ?? query.data?.shake_to_alert ?? true,
        auto_recording: updates.auto_recording ?? query.data?.auto_recording ?? false,
      };

      const { data, error } = await supabase
        .from("user_settings")
        .upsert(normalizedUpdates, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as UserSettings;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["settings", user?.id] });
      const previousSettings = queryClient.getQueryData<UserSettings>(["settings", user?.id]);

      if (previousSettings) {
        queryClient.setQueryData<UserSettings>(["settings", user?.id], {
          ...previousSettings,
          ...updates,
        } as UserSettings);
      }

      return { previousSettings };
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(["settings", user?.id], settings);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: Error, _updates, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["settings", user?.id], context.previousSettings);
      }
      toast.error(err.message);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error ? getSupabaseErrorMessage(query.error, "Unable to load settings.") : null,
    updateSettings,
  };
};
