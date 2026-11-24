import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { statsQuery } from "@/lib/campaign-queries";
import { canDrawFromSales } from "@/lib/campaign-rules";
import { drawWinners, getAdminDraw, grantEntries } from "@/lib/entries.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 grid gap-4 rounded-lg border border-border bg-surface p-5">
      <h3 className="font-display font-bold">{title}</h3>
      {children}
    </div>
  );
}

export function DrawPanel({ c }: { c: Tables<"campaigns"> }) {
  const qc = useQueryClient();
  const live = c.mode === "production";
  const sales = useQuery(statsQuery(c.id)).data;
  const meetsMinimum = canDrawFromSales(sales?.entries_sold ?? 0, c.max_inventory);
  const ended = !!c.ends_at && Date.now() > new Date(c.ends_at).getTime();

  // Grant entries
  const [email, setEmail] = useState("");
  const [qty, setQty] = useState(1);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);

  async function grant() {
    setBusy(true);
    try {
      const r = await grantEntries({
        data: { campaignId: c.id, email, quantity: qty, reference: ref || undefined },
      });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`${r.granted} entries added (#${r.first}–#${r.last})`);
        setEmail("");
        setRef("");
        await qc.invalidateQueries();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  // Draw
  const [early, setEarly] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const stored = useQuery({
    queryKey: ["admin", "draw", c.id],
    queryFn: async () => {
      const r = await getAdminDraw({ data: { campaignId: c.id } });
      if (!r.ok) throw new Error(r.error);
      return r.draw;
    },
  });

  async function runDraw() {
    setBusy(true);
    try {
      const r = await drawWinners({ data: { campaignId: c.id, allowEarly: early } });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Draw completed");
        await qc.invalidateQueries();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  const draw = stored.data;

  return (
    <>
      {!live && (
        <p className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          The campaign is in demo mode. Switch it to production in Settings to add entries and run
          the draw.
        </p>
      )}

      <Box title="Add entries to an account">
        <p className="text-sm text-muted-foreground">
          Use this after you confirm a payment. The account must exist and have a verified email.
          Per-account and campaign limits are enforced by the database.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Account email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Entries (1–100)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Payment reference (optional)</Label>
            <Input value={ref} onChange={(e) => setRef(e.target.value)} />
          </div>
        </div>
        <Button className="w-fit" disabled={!live || busy || !email || qty < 1} onClick={grant}>
          Add entries
        </Button>
      </Box>

      <Box title="Draw winners">
        {draw ? (
          <>
            <p className="text-sm text-muted-foreground">
              Drawn on {new Date(draw.drawn_at).toLocaleString()} from {draw.total_entries} valid
              entries across {draw.total_participants} accounts. Winners cannot be drawn twice.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface font-mono text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Prize</th>
                    <th className="p-2 text-left">Entry #</th>
                    <th className="p-2 text-left">Winner email (private)</th>
                  </tr>
                </thead>
                <tbody>
                  {draw.winners.map((w) => (
                    <tr
                      key={`${w.prize_rank}-${w.entry_number}`}
                      className="border-t border-border"
                    >
                      <td className="p-2">#{w.prize_rank}</td>
                      <td className="p-2 font-mono">#{String(w.entry_number).padStart(5, "0")}</td>
                      <td className="p-2">{w.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Picks one winner per prize at random from all valid entries. One account can win only
              one prize. The result is stored in the audit log and shown publicly with privacy-safe
              identifiers.
            </p>
            <p className="text-sm font-semibold text-warning">Draw requires 60% sold ({Math.ceil(c.max_inventory * 0.6).toLocaleString()} paid entries). Test purchases do not count.</p>
            {live && !ended && (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={early} onCheckedChange={setEarly} />
                The campaign has not ended — allow an early draw
              </label>
            )}
            <Button
              className="w-fit"
              disabled={!live || !meetsMinimum || busy || stored.isLoading || (!ended && !early)}
              onClick={() => setConfirmOpen(true)}
            >
              Draw winners
            </Button>
          </>
        )}
      </Box>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run the draw now?</AlertDialogTitle>
            <AlertDialogDescription>
              This is final. The winners are recorded and the draw cannot be repeated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={runDraw}>
              Draw winners
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
