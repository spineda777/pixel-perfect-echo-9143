const GATEWAY_URL = "https://connector-gateway.lovable.dev/paypal";

export async function paypal<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const lk = process.env["LOVABLE_API_KEY"];
  const pk = process.env["PAYPAL_API_KEY"];
  if (!lk || !pk) throw new Error("PayPal is not configured");
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lk}`,
      "X-Connection-Api-Key": pk,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`PayPal ${res.status}: ${body}`);
    throw new Error(`PayPal error ${res.status}`);
  }
  return res.json() as Promise<T>;
}
