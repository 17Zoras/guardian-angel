import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
}

export const useContacts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!user,
    retry: false,
  });

  const addContact = useMutation({
    mutationFn: async (contact: { name: string; phone: string; relationship: string; is_primary?: boolean }) => {
      const { error } = await supabase.from("emergency_contacts").insert({
        ...contact,
        user_id: user!.id,
        is_primary: contact.is_primary ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact added!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const setPrimary = useMutation({
    mutationFn: async (id: string) => {
      // Unset all primary first
      await supabase.from("emergency_contacts").update({ is_primary: false }).eq("user_id", user!.id);
      const { error } = await supabase.from("emergency_contacts").update({ is_primary: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Primary contact updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? getSupabaseErrorMessage(query.error, "Unable to load contacts.") : null,
    addContact,
    deleteContact,
    setPrimary,
  };
};
