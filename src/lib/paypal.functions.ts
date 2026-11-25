import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getOptionalUserId(): Promise<string | null> {
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const authHeader = getRequestHeader("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.getUser(token);
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function sendConfirmation(o: {
  userId?: string | null | undefined;
  fallbackEmail?: string | null | undefined;
  recipientName?: string | null | undefined;
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
    let to = o.fallbackEmail ?? undefined;
    if (o.userId) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(o.userId);
        if (u?.user?.email) to = u.user.email;
      } catch {
        /* fallback to fallbackEmail */
      }
    }
    if (!to) error = "No recipient email available for confirmation";
    else {
      const r = await sendOrderConfirmationEmail({
        to,
        ...(o.recipientName ? { recipientName: o.recipientName } : {}),
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
        actorId: o.userId ?? null,
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
  .validator((d) =>
    z
      .object({
        packageId: z.string().uuid(),
        guestName: z.string().trim().min(1, "Ingresa tu nombre o alias").max(100),
        guestEmail: z.string().trim().email("Ingresa un correo electrónico válido"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paypal } = await import("./paypal.server");
    const optionalUserId = await getOptionalUserId();

    const { data: pkg } = await supabaseAdmin
      .from("campaign_packages")
      .select("id, entries, price_cents, is_active, campaign_id, campaigns(mode, currency, max_inventory, max_per_user)")
      .eq("id", data.packageId)
      .single();
    if (!pkg || !pkg.is_active) throw new Error("Package not available");
    const camp = pkg.campaigns as unknown as {
      mode: string;
      currency: string;
      max_inventory: number;
      max_per_user: number;
    };
    if (camp.mode !== "production") throw new Error("Campaign is in demo mode");

    // Per-person limit: logged-in users are capped by the database; guests are capped by email here.
    const buyerEmail = data.guestEmail.trim().toLowerCase();
    const { data: prevOrders } = await supabaseAdmin
      .from("orders")
      .select("entries_count")
      .eq("campaign_id", pkg.campaign_id)
      .eq("status", "completed")
      .ilike("payer_email", buyerEmail.replace(/[\\%_]/g, "\\$&"));
    const alreadyBought = (prevOrders ?? []).reduce((n, o) => n + o.entries_count, 0);
    if (alreadyBought + pkg.entries > camp.max_per_user) {
      throw new Error(
        `Per-person limit: maximum ${camp.max_per_user} entries per buyer (you already have ${alreadyBought}).`,
      );
    }

    // Check remaining inventory
    const { count: validCount } = await supabaseAdmin
      .from("entries")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", pkg.campaign_id)
      .eq("status", "valid");
    if ((validCount ?? 0) + pkg.entries > camp.max_inventory) {
      throw new Error("No hay suficiente inventario disponible para este paquete");
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        campaign_id: pkg.campaign_id,
        user_id: optionalUserId,
        package_id: pkg.id,
        entries_count: pkg.entries,
        amount_cents: pkg.price_cents,
        currency: camp.currency,
        payer_name: data.guestName,
        payer_email: data.guestEmail,
        status: "created",
      })
      .select("id, order_code")
      .single();
    if (error || !order) {
      console.error("Order creation error:", error);
      throw new Error("Could not create order: " + (error?.message || "unknown"));
    }

    const nameParts = data.guestName.split(" ").filter(Boolean);
    const givenName = nameParts[0] || data.guestName;
    const surname = nameParts.slice(1).join(" ") || undefined;

    const pp = await paypal<{ id: string }>("/v2/checkout/orders", {
      method: "POST",
      headers: { "PayPal-Request-Id": order.id },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: order.order_code,
            custom_id: order.id,
            description: `${pkg.entries} ${pkg.entries === 1 ? "boleto" : "boletos"} - Respawn Club`,
            amount: { currency_code: camp.currency, value: (pkg.price_cents / 100).toFixed(2) },
          },
        ],
        application_context: {
          brand_name: "Respawn Club",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          landing_page: "BILLING",
        },
        payer: {
          email_address: data.guestEmail,
          name: {
            given_name: givenName,
            ...(surname ? { surname } : {}),
          },
        },
      }),
    });
    await supabaseAdmin.from("orders").update({ paypal_order_id: pp.id }).eq("id", order.id);
    return { paypalOrderId: pp.id, orderCode: order.order_code };
  });

export const capturePaypalOrder = createServerFn({ method: "POST" })
  .validator((d) => z.object({ paypalOrderId: z.string().min(5).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paypal } = await import("./paypal.server");
    const { allocateEntriesForUser } = await import("./entries.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("paypal_order_id", data.paypalOrderId)
      .single();
    if (!order) throw new Error("Order not found");
    if (order.status === "completed") {
      return {
        orderCode: order.order_code,
        first: order.first_entry_number,
        last: order.last_entry_number,
        entriesCount: order.entries_count,
        payerName: order.payer_name,
        payerEmail: order.payer_email,
        emailSent: true,
      };
    }

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
    const paypalPayerName = [cap.payer?.name?.given_name, cap.payer?.name?.surname]
      .filter(Boolean)
      .join(" ");
    const finalPayerName = order.payer_name || paypalPayerName || "Participante";
    const finalPayerEmail = order.payer_email || cap.payer?.email_address;

    const entries = await allocateEntriesForUser(
      order.campaign_id,
      order.user_id,
      order.entries_count,
    );
    const ids = entries.map((e: { id: string }) => e.id);
    const nums = entries.map((e: { entry_number: number }) => e.entry_number);
    await supabaseAdmin.from("entries").update({ order_id: order.id }).in("id", ids);
    const first = nums.length ? Math.min(...nums) : 1;
    const last = nums.length ? Math.max(...nums) : order.entries_count;

    await supabaseAdmin
      .from("orders")
      .update({
        status: "completed",
        paypal_capture_id: capture.id,
        payer_email: finalPayerEmail ?? null,
        payer_name: finalPayerName || null,
        first_entry_number: first,
        last_entry_number: last,
        completed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const mail = await sendConfirmation({
      userId: order.user_id,
      fallbackEmail: finalPayerEmail,
      recipientName: finalPayerName || undefined,
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
      entriesCount: order.entries_count,
      payerName: finalPayerName,
      payerEmail: finalPayerEmail,
      emailSent: mail.sent,
      emailError: mail.error,
    };
  });

export const simulateDemoOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        packageId: z.string().uuid(),
        guestName: z.string().optional(),
        guestEmail: z.string().optional(),
      })
      .parse(d),
  )
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

    const payerName = data.guestName || "Demo Tester";
    const payerEmail = data.guestEmail || undefined;

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
        payer_name: payerName,
        payer_email: payerEmail ?? null,
        status: "completed",
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
        first_entry_number: first,
        last_entry_number: last,
        completed_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const mail = await sendConfirmation({
      userId: context.userId,
      fallbackEmail: payerEmail,
      recipientName: payerName,
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
      entriesCount: pkg.entries,
      payerName,
      payerEmail: payerEmail ?? null,
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
      let accountEmail = "";
      if (o.user_id) {
        try {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(o.user_id);
          accountEmail = u.user?.email ?? "";
        } catch {
          // guest
        }
      }
      rows.push({
        order_code: o.order_code,
        first: o.first_entry_number,
        last: o.last_entry_number,
        entries: o.entries_count,
        amount: (o.amount_cents / 100).toFixed(2),
        currency: o.currency,
        account_email: accountEmail || o.payer_email || "(Invitado)",
        payer_name: o.payer_name ?? "",
        payer_email: o.payer_email ?? "",
        paypal_capture_id: o.paypal_capture_id ?? "",
        completed_at: o.completed_at ?? "",
      });
    }
    return rows;
  });
