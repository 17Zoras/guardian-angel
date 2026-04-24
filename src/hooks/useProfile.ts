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
      const normalizedUpdates = {
        user_id: user!.id,
        full_name: updates.full_name ?? query.data?.full_name ?? "",
        email: updates.email ?? query.data?.email ?? user?.email ?? "",
        phone: updates.phone?.trim() || null,
        avatar_url: updates.avatar_url?.trim() || null,
        blood_type: updates.blood_type?.trim() || null,
        allergies: updates.allergies?.trim() || null,
        medical_conditions: updates.medical_conditions?.trim() || null,
      };

      const { data, error } = await supabase
        .from("profiles")
        .upsert(normalizedUpdates, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["profile", user?.id] });
      const previousProfile = queryClient.getQueryData<Profile>(["profile", user?.id]);

      if (previousProfile) {
        queryClient.setQueryData<Profile>(["profile", user?.id], {
          ...previousProfile,
          ...updates,
          phone: updates.phone?.trim() || null,
          avatar_url: updates.avatar_url?.trim() || null,
          blood_type: updates.blood_type?.trim() || null,
          allergies: updates.allergies?.trim() || null,
          medical_conditions: updates.medical_conditions?.trim() || null,
        } as Profile);
      }

      return { previousProfile };
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile", user?.id], profile);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated!");
    },
    onError: (err: Error, _updates, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(["profile", user?.id], context.previousProfile);
      }
      toast.error(err.message);
    },
  });

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error ? getSupabaseErrorMessage(query.error, "Unable to load profile.") : null,
    updateProfile,
  };
};
