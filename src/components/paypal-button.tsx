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

/**
 * Preload the PayPal SDK immediately so that buttons render instantaneously
 * when the checkout dialog is opened, without network delay.
 */
export function preloadPayPalSdk(currency = "USD"): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (window.paypal?.Buttons) {
    return Promise.resolve();
  }

  if (sdkPromise) return sdkPromise;

  const id =
    import.meta.env["VITE_LOVABLE_CONNECTOR_PAYPAL_CLIENT_ID"] ||
    LIVE_PAYPAL_CLIENT_ID;

  const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
  if (existingScript) {
    sdkPromise = new Promise((resolve) => {
      if (window.paypal?.Buttons) return resolve();
      existingScript.addEventListener("load", () => resolve());
    });
    return sdkPromise;
  }

  sdkPromise = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${id}&currency=${currency}&intent=capture&enable-funding=card&disable-funding=paylater,venmo`;
    s.async = true;
    s.onload = () => res();
    s.onerror = () => {
      sdkPromise = null;
      rej(new Error("No se pudo cargar la pasarela de pago. Revisa tu conexión."));
    };
    document.head.appendChild(s);
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
  const containerRef = useRef<HTMLDivElement>(null);
  const create = useServerFn(createPaypalOrder);
  const capture = useServerFn(capturePaypalOrder);
  
  // Track loading state (if already in window, it will mount immediately)
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Keep latest user inputs in refs so that typing in the form NEVER triggers
  // unmounting/re-rendering of the PayPal iframe.
  const packageIdRef = useRef(packageId);
  packageIdRef.current = packageId;

  const guestNameRef = useRef(guestName);
  guestNameRef.current = guestName;

  const guestEmailRef = useRef(guestEmail);
  guestEmailRef.current = guestEmail;

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let isCancelled = false;
    let buttonsInstance: any = null;

    setLoading(true);
    setErr(null);

    preloadPayPalSdk(currency)
      .then(() => {
        if (isCancelled || !containerRef.current) return;
        if (!window.paypal?.Buttons) {
          throw new Error("SDK de PayPal no disponible");
        }

        // Clean container before mounting
        containerRef.current.innerHTML = "";

        buttonsInstance = window.paypal.Buttons({
          style: {
            layout: "vertical",
            shape: "rect",
            color: "gold",
            label: "pay",
            tagline: false,
            height: 48,
          },
          onClick: (_data: any, actions: any) => {
            const name = guestNameRef.current.trim();
            const email = guestEmailRef.current.trim();

            if (name.length < 2) {
              setErr("Por favor ingresa tu nombre o alias para continuar.");
              return actions.reject();
            }
            if (!email || !email.includes("@") || !email.includes(".")) {
              setErr("Por favor ingresa un correo electrónico válido para recibir tus boletos.");
              return actions.reject();
            }
            setErr(null);
            return actions.resolve();
          },
          createOrder: async () => {
            const name = guestNameRef.current.trim();
            const email = guestEmailRef.current.trim().toLowerCase();

            if (!name || !email) {
              throw new Error("Nombre y correo requeridos");
            }

            const res = await create({
              data: {
                packageId: packageIdRef.current,
                guestName: name,
                guestEmail: email,
              },
            });
            return res.paypalOrderId;
          },
          onApprove: async (d: { orderID: string }) => {
            try {
              const r = await capture({ data: { paypalOrderId: d.orderID } });
              onDoneRef.current({ ok: true, ...r });
            } catch (error: any) {
              onDoneRef.current({
                ok: false,
                error: error instanceof Error ? error.message : "Error al confirmar el pago en el servidor",
              });
            }
          },
          onError: (e: unknown) => {
            console.error("PayPal Error:", e);
            onDoneRef.current({
              ok: false,
              error: e instanceof Error ? e.message : "Error durante el procesamiento del pago",
            });
          },
          onCancel: () => {
            setErr("Operación cancelada. Puedes volver a intentarlo cuando desees.");
          },
        });

        if (containerRef.current) {
          buttonsInstance
            .render(containerRef.current)
            .then(() => {
              if (!isCancelled) setLoading(false);
            })
            .catch((renderErr: any) => {
              console.error("PayPal render error:", renderErr);
              if (!isCancelled) {
                setLoading(false);
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
        buttonsInstance?.close?.();
      } catch {
        /* noop */
      }
    };
  }, [currency]); // Only re-mount if currency changes, never on typing!

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
        className={`w-full transition-opacity duration-150 ${
          disabled ? "opacity-50 pointer-events-none" : "opacity-100"
        } ${loading ? "hidden" : "block"}`}
      >
        <div ref={containerRef} className="min-h-[105px] w-full" />
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
