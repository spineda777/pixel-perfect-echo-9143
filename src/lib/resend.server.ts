import type { Json } from "@/integrations/supabase/types";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = "Respawn Club <notifications@flowsights.it.com>",
}: SendEmailOptions) {
  const lk = process.env["LOVABLE_API_KEY"];
  const rk = process.env["RESEND_API_KEY"];

  const isDirectResendKey = rk && rk.startsWith("re_");
  const url = isDirectResendKey || !lk
    ? "https://api.resend.com/emails"
    : `${GATEWAY_URL}/emails`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isDirectResendKey || !lk) {
    if (!rk) {
      console.warn("RESEND_API_KEY is not configured");
      return { ok: false, error: "RESEND_API_KEY is not configured" };
    }
    headers["Authorization"] = `Bearer ${rk}`;
  } else {
    headers["Authorization"] = `Bearer ${lk}`;
    if (rk) {
      headers["X-Connection-Api-Key"] = rk;
    }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(text ? { text } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Resend API error (${res.status}):`, errText);
      return { ok: false, error: errText };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    console.error("Resend fetch exception:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface OrderConfirmationOptions {
  to: string;
  recipientName?: string;
  orderCode: string;
  campaignTitle: string;
  entriesCount: number;
  firstEntry: number | null;
  lastEntry: number | null;
  amountFormatted: string;
}

export async function sendOrderConfirmationEmail(opts: OrderConfirmationOptions) {
  const entryRangeStr =
    opts.firstEntry !== null && opts.lastEntry !== null
      ? opts.firstEntry === opts.lastEntry
        ? `#${String(opts.firstEntry).padStart(5, "0")}`
        : `#${String(opts.firstEntry).padStart(5, "0")} — #${String(opts.lastEntry).padStart(5, "0")}`
      : `${opts.entriesCount} entradas`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Orden - Respawn Club</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0c10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0c10; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #13141f; border: 1px solid #23263b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #1e2133; background: linear-gradient(180deg, #181a29 0%, #13141f 100%);">
              <div style="display: inline-block; font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">
                RESPAWN<span style="color: #00ff88;">CLUB</span>
              </div>
              <p style="margin: 8px 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #00ff88;">
                ✓ Orden Confirmada
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.2;">
                ¡Tus entradas están aseguradas!
              </h1>
              <p style="margin: 0 0 24px; font-size: 15px; color: #9ca3af; line-height: 1.5;">
                Hola ${opts.recipientName ? `<strong>${opts.recipientName}</strong>` : "Gamer"}, tu participación en el drop <strong style="color: #ffffff;">${opts.campaignTitle}</strong> ha sido registrada con éxito.
              </p>

              <!-- Order Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0c0d14; border: 1px solid #282c44; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-bottom: 12px; font-size: 13px; color: #9ca3af;">Código de orden:</td>
                        <td style="padding-bottom: 12px; font-size: 14px; font-weight: 700; font-family: monospace; color: #00ff88; text-align: right;">${opts.orderCode}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; font-size: 13px; color: #9ca3af;">Entradas asignadas:</td>
                        <td style="padding-bottom: 12px; font-size: 14px; font-weight: 700; font-family: monospace; color: #ffffff; text-align: right;">${entryRangeStr}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px; font-size: 13px; color: #9ca3af;">Cantidad de tickets:</td>
                        <td style="padding-bottom: 12px; font-size: 14px; font-weight: 600; color: #ffffff; text-align: right;">${opts.entriesCount} ${opts.entriesCount === 1 ? "entrada" : "entradas"}</td>
                      </tr>
                      <tr style="border-top: 1px solid #1e2133;">
                        <td style="padding-top: 12px; font-size: 14px; font-weight: 700; color: #ffffff;">Total pagado:</td>
                        <td style="padding-top: 12px; font-size: 16px; font-weight: 800; font-family: monospace; color: #ffffff; text-align: right;">${opts.amountFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Transparency & Fairness Banner -->
              <div style="background-color: rgba(0, 255, 136, 0.05); border: 1px solid rgba(0, 255, 136, 0.2); border-radius: 10px; padding: 16px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 13px; color: #d1d5db; line-height: 1.5;">
                  🔒 <strong>Sorteo 100% Verificable:</strong> Tus tickets ya están en la lista pública de la campaña. Al finalizar el tiempo restante, el algoritmo seleccionará a los ganadores de forma transparente y matemática.
                </p>
              </div>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="https://legendary-drop-respawnclub.lovable.app/#entries" style="display: inline-block; background-color: #00ff88; color: #0b0c10; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(0, 255, 136, 0.4);">
                      Ver mis tickets en vivo →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0e0f17; border-top: 1px solid #1e2133; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #6b7280;">
                Respawn Club · Gaming Drops & Sorteos Exclusivos
              </p>
              <p style="margin: 0; font-size: 11px; color: #4b5563;">
                Si tienes preguntas sobre tu orden, contacta a nuestro equipo en <a href="mailto:support@flowsights.it.com" style="color: #9ca3af; text-decoration: underline;">support@flowsights.it.com</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
RESPAWN CLUB — ORDEN CONFIRMADA

Hola ${opts.recipientName || "Gamer"},

Tu participación en el drop ${opts.campaignTitle} ha sido confirmada con éxito.

DETALLES DE TU ORDEN:
- Código de orden: ${opts.orderCode}
- Entradas asignadas: ${entryRangeStr}
- Cantidad de tickets: ${opts.entriesCount}
- Total pagado: ${opts.amountFormatted}

Tus tickets están registrados en el sistema y son visibles en la lista pública. El sorteo se realizará de forma pública y verificable al finalizar la campaña.

Puedes consultar la campaña aquí: https://legendary-drop-respawnclub.lovable.app/#entries

Respawn Club · Soporte: support@flowsights.it.com
  `.trim();

  return sendEmail({
    to: opts.to,
    subject: `🎮 ¡Tus entradas para el GTA VI Legendary Drop están confirmadas! (#${opts.orderCode})`,
    html,
    text,
  });
}
