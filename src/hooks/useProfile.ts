import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  blood_type: string;
  allergies: string;
  medical_conditions: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return data as Profile;
      }

      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({
          user_id: user!.id,
          full_name: user?.user_metadata?.full_name ?? "",
          email: user?.email ?? "",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return created as Profile;
    },
    enabled: !!user,
    retry: false,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error ? getSupabaseErrorMessage(query.error, "Unable to load profile.") : null,
    updateProfile,
  };
};
