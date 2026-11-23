import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends the order confirmation and never throws. Failures are returned and stored in the audit log so they are not silent. */
async function sendConfirmation(o: {
  userId: string;
  fallbackEmail?: string | undefined;
  recipientName?: string | undefined;
  orderId: string;
  orderCode: string;
  campaignTitle: string;
  entriesCount: number;
  first: number;
  last: number;
  amountCents: number;
  currency: string;
}): Promise<{ sent: boolean; error?: string | undefined }> {
  let error: string | undefined;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendOrderConfirmationEmail } = await import("./resend.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(o.userId);
    const to = u?.user?.email || o.fallbackEmail;
    if (!to) error = "No recipient email on the account";
    else {
      const r = await sendOrderConfirmationEmail({
        to,
        recipientName: o.recipientName || u?.user?.user_metadata?.["full_name"] || undefined,
        orderCode: o.orderCode,
        campaignTitle: o.campaignTitle,
        entriesCount: o.entriesCount,
        firstEntry: o.first,
        lastEntry: o.last,
        amountFormatted: `$${(o.amountCents / 100).toFixed(2)} ${o.currency}`,
      });
      if (!r.ok) error = typeof r.error === "string" ? r.error : JSON.stringify(r.error);
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  if (error) {
    error = error.slice(0, 400);
    try {
      const { writeAudit } = await import("./entries.server");
      await writeAudit({
        actorId: o.userId,
        action: "EMAIL_FAILED",
        tableName: "orders",
        recordId: o.orderId,
        newData: { order_code: o.orderCode, error },
      });
    } catch {
      /* audit is best-effort */
    }
    console.error("Order confirmation email failed:", error);
    return { sent: false, error };
  }
  return { sent: true };
}

export const createPaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ packageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paypal } = await import("./paypal.server");
    const { data: pkg } = await supabaseAdmin
      .from("campaign_packages")
      .select("id, entries, price_cents, is_active, campaign_id, campaigns(mode, currency)")
      .eq("id", data.packageId)
      .single();
    if (!pkg || !pkg.is_active) throw new Error("Package not available");
    const camp = pkg.campaigns as unknown as { mode: string; currency: string };
    if (camp.mode !== "production") throw new Error("Campaign is in demo mode");
    const { data: allow } = await context.supabase.rpc("get_my_allowance", {
      _campaign_id: pkg.campaign_id,
    });
    const a = allow?.[0];
    if (!a?.email_verified) throw new Error("Please verify your email first");
    if (a.remaining < pkg.entries) throw new Error("Personal entry limit exceeded");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        campaign_id: pkg.campaign_id,
        user_id: context.userId,
        package_id: pkg.id,
        entries_count: pkg.entries,
        amount_cents: pkg.price_cents,
        currency: camp.currency,
      })
      .select("id, order_code")
      .single();
    if (error || !order) throw new Error("Could not create order");
    let userEmail: string | undefined;
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
      userEmail = u?.user?.email;
    } catch {
      /* non-fatal */
    }

    const pp = await paypal<{ id: string }>("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": order.id },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: order.order_code,
            custom_id: order.id,
            description: `${pkg.entries} ${pkg.entries === 1 ? "entry" : "entries"} - Respawn Club`,
            amount: { currency_code: camp.currency, value: (pkg.price_cents / 100).toFixed(2) },
          },
        ],
        application_context: {
          brand_name: "Respawn Club",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          landing_page: "BILLING",
        },
        ...(userEmail ? { payer: { email_address: userEmail } } : {}),
      }),
    });
    await supabaseAdmin.from("orders").update({ paypal_order_id: pp.id }).eq("id", order.id);
    return { paypalOrderId: pp.id };
  });

export const capturePaypalOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paypalOrderId: z.string().min(5).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paypal } = await import("./paypal.server");
    const { allocateEntriesForUser } = await import("./entries.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("paypal_order_id", data.paypalOrderId)
      .eq("user_id", context.userId)
      .single();
    if (!order) throw new Error("Order not found");
    if (order.status === "completed")
      return {
        orderCode: order.order_code,
        first: order.first_entry_number,
        last: order.last_entry_number,
      };

    const cap = await paypal<any>(`/v2/checkout/orders/${data.paypalOrderId}/capture`, {
      method: "POST",
      headers: { "PayPal-Request-Id": `cap-${order.id}` },
    });
    const capture = cap?.purchase_units?.[0]?.payments?.captures?.[0];
    const paid =
      cap?.status === "COMPLETED" &&
      capture?.status === "COMPLETED" &&
      Math.round(Number(capture.amount?.value) * 100) === order.amount_cents;
    if (!paid) {
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
      throw new Error("Payment was not completed");
    }
    const payerName = [cap.payer?.name?.given_name, cap.payer?.name?.surname]
      .filter(Boolean)
      .join(" ");
    const entries = await allocateEntriesForUser(
      order.campaign_id,
      order.user_id,
      order.entries_count,
    );
    const ids = entries.map((e: { id: string }) => e.id);
    const nums = entries.map((e: { entry_number: number }) => e.entry_number);
    await supabaseAdmin.from("entries").update({ order_id: order.id }).in("id", ids);
    const first = Math.min(...nums),
      last = Math.max(...nums);
    await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        paypal_capture_id: capture.id,
        payer_email: cap.payer?.email_address ?? null,
        payer_name: payerName || null,
        first_entry_number: first,
        last_entry_number: last,
        completed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const mail = await sendConfirmation({
      userId: order.user_id,
      fallbackEmail: cap.payer?.email_address,
      recipientName: payerName || undefined,
      orderId: order.id,
      orderCode: order.order_code,
      campaignTitle: "GTA VI Legendary Drop",
      entriesCount: order.entries_count,
      first,
      last,
      amountCents: order.amount_cents,
      currency: order.currency,
    });

    return {
      orderCode: order.order_code,
      first,
      last,
      emailSent: mail.sent,
      emailError: mail.error,
    };
  });

export const simulateDemoOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ packageId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { allocateEntriesForUser } = await import("./entries.server");
    // Server-side guard: simulated orders create real entries, so only admins may run them.
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: pkg } = await supabaseAdmin
      .from("campaign_packages")
      .select("id, entries, price_cents, is_active, campaign_id, campaigns(mode, currency)")
      .eq("id", data.packageId)
      .single();
    if (!pkg || !pkg.is_active) throw new Error("Package not available");
    const camp = pkg.campaigns as unknown as { mode: string; currency: string };

    const { data: allow } = await context.supabase.rpc("get_my_allowance", {
      _campaign_id: pkg.campaign_id,
    });
    const a = allow?.[0];
    if (a && a.remaining < pkg.entries) throw new Error("Personal entry limit exceeded");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        campaign_id: pkg.campaign_id,
        user_id: context.userId,
        package_id: pkg.id,
        entries_count: pkg.entries,
        amount_cents: pkg.price_cents,
        currency: camp.currency,
        paypal_capture_id: "DEMO_SIMULATION",
        payer_name: "Demo Tester",
      })
      .select("id, order_code")
      .single();
    if (error || !order) throw new Error("Could not create demo order");

    const entries = await allocateEntriesForUser(pkg.campaign_id, context.userId, pkg.entries);
    const ids = entries.map((e: { id: string }) => e.id);
    const nums = entries.map((e: { entry_number: number }) => e.entry_number);
    await supabaseAdmin.from("entries").update({ order_id: order.id }).in("id", ids);
    const first = nums.length ? Math.min(...nums) : 1;
    const last = nums.length ? Math.max(...nums) : pkg.entries;

    await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        first_entry_number: first,
        last_entry_number: last,
        completed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const mail = await sendConfirmation({
      userId: context.userId,
      orderId: order.id,
      orderCode: order.order_code,
      campaignTitle: "GTA VI Legendary Drop (Demo)",
      entriesCount: pkg.entries,
      first,
      last,
      amountCents: pkg.price_cents,
      currency: camp.currency,
    });

    return {
      orderCode: order.order_code,
      first,
      last,
      emailSent: mail.sent,
      emailError: mail.error,
    };
  });

export const exportOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("status", "completed")
      .order("first_entry_number");
    const rows = [];
    for (const o of data ?? []) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(o.user_id);
      rows.push({
        order_code: o.order_code,
        first: o.first_entry_number,
        last: o.last_entry_number,
        entries: o.entries_count,
        amount: (o.amount_cents / 100).toFixed(2),
        currency: o.currency,
        account_email: u.user?.email ?? "",
        payer_name: o.payer_name ?? "",
        payer_email: o.payer_email ?? "",
        paypal_capture_id: o.paypal_capture_id ?? "",
        completed_at: o.completed_at ?? "",
      });
    }
    return rows;
  });
