import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend is not configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const getFeaturedCampaign = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data: campaign, error } = await sb
    .from("campaigns")
    .select("*")
    .eq("is_featured", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!campaign) return null;

  const [prizes, packages, faqs, stats] = await Promise.all([
    sb.from("prizes").select("*").eq("campaign_id", campaign.id).order("rank"),
    sb.from("campaign_packages").select("*").eq("campaign_id", campaign.id).eq("is_active", true).order("sort_order"),
    sb.from("faqs").select("*").eq("campaign_id", campaign.id).eq("is_published", true).order("sort_order"),
    sb.rpc("get_campaign_stats", { _campaign_id: campaign.id }),
  ]);
  for (const r of [prizes, packages, faqs, stats]) if (r.error) throw new Error(r.error.message);

  return {
    campaign,
    prizes: prizes.data ?? [],
    packages: packages.data ?? [],
    faqs: faqs.data ?? [],
    stats: stats.data?.[0] ?? null,
  };
});

export const getRules = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data: campaign, error } = await sb
    .from("campaigns")
    .select("id, title, rules_status, updated_at")
    .eq("is_featured", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!campaign) return null;
  const sections = await sb
    .from("rules_sections")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("section_number");
  if (sections.error) throw new Error(sections.error.message);
  return { campaign, sections: sections.data ?? [] };
});
