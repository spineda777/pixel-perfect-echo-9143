import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getFeaturedCampaign, getRules } from "./campaign.functions";

export const featuredCampaignQuery = queryOptions({
  queryKey: ["campaign", "featured"],
  queryFn: () => getFeaturedCampaign(),
  staleTime: 30_000,
});

export const rulesQuery = queryOptions({
  queryKey: ["campaign", "rules"],
  queryFn: () => getRules(),
  staleTime: 30_000,
});

export function statsQuery(campaignId: string) {
  return queryOptions({
    queryKey: ["campaign", campaignId, "stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_campaign_stats", { _campaign_id: campaignId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    refetchInterval: 20_000,
  });
}

export function allowanceQuery(campaignId: string, userId: string | null) {
  return queryOptions({
    queryKey: ["campaign", campaignId, "allowance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_allowance", { _campaign_id: campaignId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function publicEntriesQuery(campaignId: string, enabled: boolean) {
  return queryOptions({
    queryKey: ["campaign", campaignId, "entries"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_entries", {
        _campaign_id: campaignId,
        _limit: 50,
        _offset: 0,
      });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}
