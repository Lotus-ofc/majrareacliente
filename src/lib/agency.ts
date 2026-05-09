import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export async function getClientAgencyId(clientId: string): Promise<string> {
  const cached = cache.get(clientId);
  if (cached) return cached;
  const { data, error } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", clientId)
    .maybeSingle();
  if (error || !data?.agency_id) {
    throw new Error("Não foi possível identificar a agência do cliente.");
  }
  cache.set(clientId, data.agency_id);
  return data.agency_id;
}
