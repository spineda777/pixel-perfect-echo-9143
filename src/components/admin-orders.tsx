import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { exportOrders } from "@/lib/paypal.functions";
import { Button } from "@/components/ui/button";

type Row = Awaited<ReturnType<typeof exportOrders>>[number];
const pad = (n: number | null) => (n == null ? "" : "#" + String(n).padStart(5, "0"));

export function AdminOrders() {
  const load = useServerFn(exportOrders);
  const [rows, setRows] = useState<Row[] | null>(null);
  const csv = () => {
    if (!rows) return;
    const head = Object.keys(rows[0] ?? { order_code: "" });
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const text = [head.join(","), ...rows.map((r) => head.map((h) => esc((r as Record<string, unknown>)[h])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = "respawn-participants.csv";
    a.click();
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button onClick={async () => setRows(await load())}>Load participants</Button>
        <Button variant="outline" disabled={!rows?.length} onClick={csv}>Download CSV</Button>
        <Button variant="outline" disabled={!rows?.length} onClick={() => window.print()}>Print</Button>
      </div>
      {rows && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-surface-raised font-mono"><tr>{["Order", "Entries", "Qty", "Amount", "Buyer", "Account email", "PayPal email", "PayPal capture", "Date"].map((h) => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.order_code} className="border-t border-border">
                  <td className="p-2 font-mono">{r.order_code}</td>
                  <td className="p-2 font-mono">{pad(r.first)}–{pad(r.last)}</td>
                  <td className="p-2">{r.entries}</td>
                  <td className="p-2">{r.amount} {r.currency}</td>
                  <td className="p-2">{r.payer_name}</td>
                  <td className="p-2">{r.account_email}</td>
                  <td className="p-2">{r.payer_email}</td>
                  <td className="p-2 font-mono">{r.paypal_capture_id}</td>
                  <td className="p-2">{r.completed_at.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={9}>No completed purchases yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
