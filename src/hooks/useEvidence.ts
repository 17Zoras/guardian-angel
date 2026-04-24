import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getSupabaseErrorMessage } from "@/lib/supabase-errors";

export interface EvidenceItem {
  id: string;
  user_id: string;
  title: string;
  item_type: "note" | "audio";
  note: string | null;
  audio_data: string | null;
  mime_type: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const useEvidence = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["evidence", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evidence_items")
        .select("*")
        .eq("user_id", user!.id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EvidenceItem[];
    },
    enabled: !!user,
    retry: false,
  });

  const addEvidence = useMutation({
    mutationFn: async (item: {
      title: string;
      item_type: "note" | "audio";
      note?: string;
      audio_data?: string;
      mime_type?: string;
    }) => {
      const { error } = await supabase.from("evidence_items").insert({
        ...item,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      toast.success("Saved to Evidence Vault");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateEvidence = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<EvidenceItem>;
    }) => {
      const { error } = await supabase
        .from("evidence_items")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      toast.success("Evidence updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteEvidence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("evidence_items")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      toast.success("Evidence removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    evidenceItems: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? getSupabaseErrorMessage(query.error, "Unable to load evidence vault.") : null,
    addEvidence,
    updateEvidence,
    deleteEvidence,
  };
};
