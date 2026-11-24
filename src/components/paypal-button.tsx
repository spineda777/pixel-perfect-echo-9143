import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createPaypalOrder, capturePaypalOrder } from "@/lib/paypal.functions";
import { Loader2, ShieldCheck, CreditCard } from "lucide-react";

declare global {
  interface Window {
    paypal?: any;
  }
}

const LIVE_PAYPAL_CLIENT_ID =
  "BAAHvn5bqy47Fo2zw5_5dxjoYnLO8hIxMpRjgWEYAwkVM5Wei6y1fFK1ArWl52UGjBfguqXp1ZCcOYM8jU";

let sdkPromise: Promise<void> | null = null;

function loadSdk(currency: string) {
  const id =
    import.meta.env["VITE_LOVABLE_CONNECTOR_PAYPAL_CLIENT_ID"] ||
    LIVE_PAYPAL_CLIENT_ID;

  const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
  if (window.paypal && existingScript && existingScript.getAttribute("src")?.includes(id)) {
    return Promise.resolve();
  }

  if (existingScript && !existingScript.getAttribute("src")?.includes(id)) {
    existingScript.remove();
    delete window.paypal;
    sdkPromise = null;
  }

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((res, rej) => {
    const s = document.createElement("script");
    // Enable direct debit and credit card funding, disable venmo and paylater
    s.src = `https://www.paypal.com/sdk/js?client-id=${id}&currency=${currency}&intent=capture&enable-funding=card&disable-funding=paylater,venmo`;
    s.async = true;
    s.onload = () => res();
    s.onerror = () => {
      sdkPromise = null;
      rej(new Error("No se pudo cargar la pasarela de pago. Revisa tu conexión."));
    };
    document.body.appendChild(s);
  });
  return sdkPromise;
}

export interface PayPalDoneResult {
  ok: true;
  orderCode: string;
  first: number | null;
  last: number | null;
  entriesCount: number;
  payerName: string | null;
  payerEmail: string | null;
  emailSent?: boolean;
  emailError?: string | undefined;
}

export function PayPalButton({
  packageId,
  currency,
  guestName,
  guestEmail,
  disabled = false,
  onDone,
}: {
  packageId: string;
  currency: string;
  guestName: string;
  guestEmail: string;
  disabled?: boolean;
  onDone: (r: PayPalDoneResult | { ok: false; error: string }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const create = useServerFn(createPaypalOrder);
  const capture = useServerFn(capturePaypalOrder);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const isValidInput = Boolean(
    guestName.trim().length >= 2 &&
    guestEmail.trim().includes("@") &&
    guestEmail.trim().includes(".")
  );

  useEffect(() => {
    let buttons: any;
    let isCancelled = false;
    setLoading(true);
    setErr(null);

    loadSdk(currency)
      .then(() => {
        if (isCancelled || !ref.current) return;
        ref.current.innerHTML = "";
        setLoading(false);

        buttons = window.paypal.Buttons({
          style: {
            layout: "vertical",
            shape: "rect",
            color: "gold",
            label: "pay",
            tagline: false,
            height: 48,
          },
          onClick: (_data: any, actions: any) => {
            if (!isValidInput) {
              setErr("Por favor ingresa tu nombre y correo electrónico para continuar con el pago.");
              return actions.reject();
            }
            setErr(null);
            return actions.resolve();
          },
          createOrder: async () => {
            if (!guestName.trim() || !guestEmail.trim()) {
              throw new Error("Nombre y correo requeridos");
            }
            const res = await create({
              data: {
                packageId,
                guestName: guestName.trim(),
                guestEmail: guestEmail.trim().toLowerCase(),
              },
            });
            return res.paypalOrderId;
          },
          onApprove: async (d: { orderID: string }) => {
            try {
              const r = await capture({ data: { paypalOrderId: d.orderID } });
              onDone({ ok: true, ...r });
            } catch (error: any) {
              onDone({
                ok: false,
                error: error instanceof Error ? error.message : "Error al confirmar el pago en el servidor",
              });
            }
          },
          onError: (e: unknown) => {
            console.error("PayPal Error:", e);
            onDone({
              ok: false,
              error: e instanceof Error ? e.message : "Error durante el procesamiento del pago",
            });
          },
          onCancel: () => {
            setErr("Cancelaste la operación de pago. Puedes volver a intentarlo.");
          },
        });

        if (ref.current) {
          buttons.render(ref.current).catch((renderErr: any) => {
            console.error("PayPal render error:", renderErr);
            if (!isCancelled) {
              setErr("Hubo un problema al inicializar las opciones de pago.");
            }
          });
        }
      })
      .catch((e) => {
        if (!isCancelled) {
          setLoading(false);
          setErr(e.message || "Error al conectar con la pasarela de pago");
        }
      });

    return () => {
      isCancelled = true;
      try {
        buttons?.close?.();
      } catch {
        /* noop */
      }
    };
  }, [packageId, currency, guestName, guestEmail, isValidInput]);

  return (
    <div className="w-full space-y-3">
      {loading && (
        <div className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border border-border/50 bg-surface/50 text-muted-foreground animate-pulse">
          <Loader2 className="h-5 w-5 animate-spin text-signal" />
          <span className="text-xs">Cargando métodos de pago seguros...</span>
        </div>
      )}

      {err && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
          {err}
        </div>
      )}

      <div
        className={`w-full transition-opacity duration-200 ${
          disabled ? "opacity-50 pointer-events-none" : "opacity-100"
        } ${loading ? "hidden" : "block"}`}
      >
        <div ref={ref} className="min-h-[105px] w-full" />
      </div>

      <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-signal" />
          Conexión encriptada SSL
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <CreditCard className="h-3.5 w-3.5 text-signal" />
          PayPal y Tarjetas Internacionales
        </span>
      </div>
    </div>
  );
}
