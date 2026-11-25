import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DrawWinner } from "./draw";
import { canDrawFromSales } from "./campaign-rules";

// Server functions return { ok: false, error } instead of throwing, so the UI can show a clean message.
type Fail = { ok: false; error: string };
const fail = (e: unknown): Fail => ({
  ok: false,
  error: e instanceof Error ? e.message : "Unexpected error",
});

type StoredDraw = {
  drawn_at: string;
  total_entries: number;
  total_participants: number;
  winners: DrawWinner[];
};

const uuid = z.string().uuid();

/** Admin only: add entries to a verified account (e.g. after confirming a payment by hand). */
export const grantEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      campaignId: uuid,
      email: z.string().trim().email().max(255),
      quantity: z.number().int().min(1).max(100),
      reference: z.string().trim().max(200).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    try {
      const s = await import("./entries.server");
      await s.assertAdmin(context.supabase, context.userId);
      const user = await s.findUserByEmail(data.email);
      if (!user) return fail(new Error("No account found with that email"));
      const rows = await s.allocateEntriesForUser(data.campaignId, user.id, data.quantity);
      const numbers = rows.map((r) => r.entry_number).sort((a, b) => a - b);
      await s.writeAudit({
        actorId: context.userId,
        action: "GRANT_ENTRIES",
        tableName: "entries",
        recordId: data.campaignId,
        newData: {
          user_id: user.id,
          quantity: rows.length,
          reference: data.reference ?? null,
          first_entry: numbers[0] ?? null,
          last_entry: numbers[numbers.length - 1] ?? null,
        },
      });
      return {
        ok: true as const,
        granted: rows.length,
        first: numbers[0] ?? null,
        last: numbers[numbers.length - 1] ?? null,
      };
    } catch (e) {
      return fail(e);
    }
  });

/** Admin only: runs the draw once. A second call returns the stored result instead of drawing again. */
export const drawWinners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ campaignId: uuid, allowEarly: z.boolean().default(false) }))
  .handler(async ({ data, context }) => {
    try {
      const s = await import("./entries.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { pickWinners } = await import("./draw");
      await s.assertAdmin(context.supabase, context.userId);

      const existing = await s.findDrawRecord(data.campaignId);
      if (existing)
        return fail(new Error("This campaign was already drawn. Winners cannot be drawn twice."));

      const { data: c, error } = await supabaseAdmin
        .from("campaigns")
        .select("id, mode, ends_at, max_inventory")
        .eq("id", data.campaignId)
        .maybeSingle();
      if (error || !c) return fail(new Error("Campaign not found"));
      if (c.mode !== "production") return fail(new Error("The draw only runs in production mode"));
      const { count: paidEntries, error: paidError } = await supabaseAdmin
        .from("entries")
        .select("id, orders!inner(status, paypal_capture_id)", { count: "exact", head: true })
        .eq("campaign_id", data.campaignId)
        .eq("status", "valid")
        .eq("orders.status", "completed")
        .neq("orders.paypal_capture_id", "DEMO_SIMULATION");
      if (paidError) return fail(paidError);
      if (!canDrawFromSales(paidEntries ?? 0, c.max_inventory)) {
        return fail(
          new Error(
            "At least 60% of inventory must be sold before the draw. Test entries do not count.",
          ),
        );
      }
      const ended = !!c.ends_at && Date.now() > new Date(c.ends_at).getTime();
      if (!ended && !data.allowEarly) {
        return fail(
          new Error("The campaign has not ended yet. Confirm the early draw to continue."),
        );
      }

      const [entries, prizes] = await Promise.all([
        s.loadAllValidEntries(data.campaignId),
        supabaseAdmin
          .from("prizes")
          .select("id, rank, winner_count")
          .eq("campaign_id", data.campaignId),
      ]);
      if (prizes.error) return fail(prizes.error);
      if (entries.length === 0) return fail(new Error("There are no valid entries to draw from"));

      const winners = pickWinners(entries, prizes.data ?? []);
      const stored: StoredDraw = {
        drawn_at: new Date().toISOString(),
        total_entries: entries.length,
        total_participants: new Set(entries.map((e) => e.identity)).size,
        winners,
      };
      const myId = await s.writeAudit({
        actorId: context.userId,
        action: "DRAW",
        tableName: "campaigns",
        recordId: data.campaignId,
        newData: stored as unknown as import("@/integrations/supabase/types").Json,
      });
      // Guard against a double click: if another draw record is older than ours, keep that one.
      const first = await s.findDrawRecord(data.campaignId);
      if (first && first.id !== myId) {
        await supabaseAdmin.from("audit_logs").delete().eq("id", myId);
        return fail(new Error("A draw was already recorded for this campaign"));
      }
      return { ok: true as const, ...(await s.enrichForAdmin(stored)) };
    } catch (e) {
      return fail(e);
    }
  });

/** Admin only: the stored draw, including winner emails so they can be contacted. */
export const getAdminDraw = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ campaignId: uuid }))
  .handler(async ({ data, context }) => {
    try {
      const s = await import("./entries.server");
      await s.assertAdmin(context.supabase, context.userId);
      const rec = await s.findDrawRecord(data.campaignId);
      if (!rec) return { ok: true as const, draw: null };
      return {
        ok: true as const,
        draw: await s.enrichForAdmin(rec.new_data as unknown as StoredDraw),
      };
    } catch (e) {
      return fail(e);
    }
  });

/** Public: winners with privacy-safe identifiers only. */
export const getDrawResult = createServerFn({ method: "GET" })
  .inputValidator(z.object({ campaignId: uuid }))
  .handler(async ({ data }) => {
    const s = await import("./entries.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rec = await s.findDrawRecord(data.campaignId);
    if (!rec) return null;
    const stored = rec.new_data as unknown as StoredDraw;
    const userIds = stored.winners.map((w) => w.user_id).filter((id): id is string => !!id);
    const orderIds = stored.winners.map((w) => w.order_id).filter((id): id is string => !!id);
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, public_handle").in("id", userIds)
      : { data: [] as { id: string; public_handle: string }[] };
    const { data: orders } = orderIds.length
      ? await supabaseAdmin.from("orders").select("id, payer_name").in("id", orderIds)
      : { data: [] as { id: string; payer_name: string | null }[] };
    const handle = new Map((profiles ?? []).map((p) => [p.id, p.public_handle]));
    const guestName = new Map((orders ?? []).map((o) => [o.id, o.payer_name]));
    return {
      drawn_at: stored.drawn_at,
      total_entries: stored.total_entries,
      winners: stored.winners
        .map((w) => ({
          prize_rank: w.prize_rank,
          entry_number: w.entry_number,
          public_handle:
            (w.user_id ? handle.get(w.user_id) : undefined) ??
            (w.order_id ? guestName.get(w.order_id) : undefined) ??
            "RSP-GUEST",
        }))
        .sort((a, b) => a.prize_rank - b.prize_rank),
    };
  });
