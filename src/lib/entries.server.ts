// Server-only helpers. Import dynamically from *.functions.ts handlers.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database, Json } from "@/integrations/supabase/types";
import { entryIdentity, isTestEntry } from "./draw";

export async function assertAdmin(sb: SupabaseClient<Database>, userId: string): Promise<void> {
  const { data, error } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Admin permissions required");
}

export async function findUserByEmail(
  email: string,
): Promise<{ id: string; email: string } | null> {
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return { id: hit.id, email: hit.email! };
    if (data.users.length < 1000) break;
  }
  return null;
}

/**
 * The single entry point that creates entries. Limits and verification are enforced
 * atomically in the database (allocate_entries + trigger). A future payment webhook
 * should call this after confirming a successful payment.
 */
export async function allocateEntriesForUser(
  campaignId: string,
  userId: string | null,
  quantity: number,
) {
  const { data, error } = await supabaseAdmin.rpc("allocate_entries", {
    _campaign_id: campaignId,
    // The database function accepts NULL for guest purchases (migration 0006); generated types still say string.
    _user_id: userId as string,
    _quantity: quantity,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function writeAudit(row: {
  actorId: string | null;
  action: string;
  tableName: string;
  recordId: string;
  newData: Json;
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .insert({
      actor_id: row.actorId,
      action: row.action,
      table_name: row.tableName,
      record_id: row.recordId,
      new_data: row.newData,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function loadAllValidEntries(campaignId: string) {
  const out: {
    id: string;
    entry_number: number;
    user_id: string | null;
    order_id: string | null;
    identity: string;
  }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("entries")
      .select("id, entry_number, user_id, order_id, orders(paypal_capture_id, payer_email)")
      .eq("campaign_id", campaignId)
      .eq("status", "valid")
      .order("entry_number")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    // Entries from admin test simulations are never eligible for the draw.
    for (const e of data ?? []) {
      if (isTestEntry(e as unknown as Parameters<typeof isTestEntry>[0])) continue;
      const order = e.orders as unknown as { payer_email?: string | null } | null;
      out.push({
        id: e.id,
        entry_number: e.entry_number,
        user_id: e.user_id,
        order_id: e.order_id,
        identity: entryIdentity({
          id: e.id,
          user_id: e.user_id,
          order_id: e.order_id,
          orders: order,
        }),
      });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function findDrawRecord(campaignId: string) {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("id, created_at, new_data")
    .eq("action", "DRAW")
    .eq("record_id", campaignId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function enrichForAdmin(stored: {
  drawn_at: string;
  total_entries: number;
  total_participants: number;
  winners: {
    prize_rank: number;
    entry_number: number;
    user_id: string | null;
    order_id?: string | null;
  }[];
}) {
  const winners = await Promise.all(
    stored.winners.map(async (w) => {
      let email = "(unknown)";
      let name: string | undefined;
      if (w.user_id) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(w.user_id);
        email = data.user?.email ?? email;
      }
      if (w.order_id) {
        const { data: o } = await supabaseAdmin
          .from("orders")
          .select("payer_email, payer_name")
          .eq("id", w.order_id)
          .maybeSingle();
        if (o) {
          if (email === "(unknown)" && o.payer_email) email = o.payer_email;
          name = o.payer_name ?? undefined;
        }
      }
      return {
        prize_rank: w.prize_rank,
        entry_number: w.entry_number,
        email,
        ...(name ? { name } : {}),
      };
    }),
  );
  return {
    drawn_at: stored.drawn_at,
    total_entries: stored.total_entries,
    total_participants: stored.total_participants,
    winners: winners.sort((a, b) => a.prize_rank - b.prize_rank),
  };
}
