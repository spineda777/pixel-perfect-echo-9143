import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Fail = { ok: false; error: string };
const fail = (e: unknown): Fail => ({
  ok: false,
  error: e instanceof Error ? e.message : "Unexpected error",
});

/** Admin only: who currently has admin access. */
export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const s = await import("./entries.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await s.assertAdmin(context.supabase, context.userId);
      const { data, error } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (error) throw new Error(error.message);
      const admins = await Promise.all(
        (data ?? []).map(async (r) => {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
          return {
            user_id: r.user_id,
            email: u.user?.email ?? "(unknown)",
            is_me: r.user_id === context.userId,
          };
        }),
      );
      return { ok: true as const, admins };
    } catch (e) {
      return fail(e);
    }
  });

/** Admin only: give admin access to an existing account (the person must have signed up first). */
export const grantAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ email: z.string().trim().email().max(255) }))
  .handler(async ({ data, context }) => {
    try {
      const s = await import("./entries.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await s.assertAdmin(context.supabase, context.userId);
      const user = await s.findUserByEmail(data.email);
      if (!user)
        return fail(new Error("No account found with that email. The person must sign up first."));
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: user.id, role: "admin" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (error) return fail(new Error(error.message));
      await s.writeAudit({
        actorId: context.userId,
        action: "GRANT_ADMIN",
        tableName: "user_roles",
        recordId: user.id,
        newData: { email: user.email },
      });
      return { ok: true as const, email: user.email };
    } catch (e) {
      return fail(e);
    }
  });

/** Admin only: remove admin access. You cannot remove yourself or the last admin. */
export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    try {
      const s = await import("./entries.server");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await s.assertAdmin(context.supabase, context.userId);
      if (data.userId === context.userId)
        return fail(new Error("You cannot remove your own admin access."));
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) return fail(new Error("At least one admin must remain."));
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) return fail(new Error(error.message));
      await s.writeAudit({
        actorId: context.userId,
        action: "REVOKE_ADMIN",
        tableName: "user_roles",
        recordId: data.userId,
        newData: {},
      });
      return { ok: true as const };
    } catch (e) {
      return fail(e);
    }
  });
