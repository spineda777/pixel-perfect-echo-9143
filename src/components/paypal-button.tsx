import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createPaypalOrder, capturePaypalOrder } from "@/lib/paypal.functions";

declare global { interface Window { paypal?: any } }

let sdkPromise: Promise<void> | null = null;
function loadSdk(currency: string) {
  if (window.paypal) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  const id = import.meta.env['VITE_LOVABLE_CONNECTOR_PAYPAL_CLIENT_ID'];
  sdkPromise = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${id}&currency=${currency}&intent=capture`;
    s.onload = () => res();
    s.onerror = () => rej(new Error("PayPal failed to load"));
    document.body.appendChild(s);
  });
  return sdkPromise;
}

export function PayPalButton({ packageId, currency, onDone }: {
  packageId: string; currency: string;
  onDone: (r: { ok: true; orderCode: string; first: number | null; last: number | null } | { ok: false; error: string }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const create = useServerFn(createPaypalOrder);
  const capture = useServerFn(capturePaypalOrder);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let buttons: any;
    loadSdk(currency).then(() => {
      if (!ref.current) return;
      ref.current.innerHTML = "";
      buttons = window.paypal.Buttons({
        style: { layout: "vertical", shape: "rect", label: "pay" },
        createOrder: async () => (await create({ data: { packageId } })).paypalOrderId,
        onApprove: async (d: { orderID: string }) => {
          const r = await capture({ data: { paypalOrderId: d.orderID } });
          onDone({ ok: true, ...r });
        },
        onError: (e: unknown) => onDone({ ok: false, error: e instanceof Error ? e.message : "Payment failed" }),
      });
      buttons.render(ref.current);
    }).catch((e) => setErr(e.message));
    return () => { try { buttons?.close?.(); } catch { /* noop */ } };
  }, [packageId, currency]);
  return <div>{err && <p className="text-sm text-destructive">{err}</p>}<div ref={ref} /></div>;
}
