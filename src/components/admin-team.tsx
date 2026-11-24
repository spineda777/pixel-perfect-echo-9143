import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { grantAdmin, listAdmins, revokeAdmin } from "@/lib/team.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 grid gap-4 rounded-lg border border-border bg-surface p-5">
      <h3 className="font-bold">{title}</h3>
      {children}
    </div>
  );
}

export function TeamPanel() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const admins = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: async () => {
      const r = await listAdmins();
      if (!r.ok) throw new Error(r.error);
      return r.admins;
    },
  });

  async function add() {
    setBusy(true);
    try {
      const r = await grantAdmin({ data: { email } });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`${r.email} is now an admin`);
        setEmail("");
        await qc.invalidateQueries({ queryKey: ["admin", "admins"] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    setBusy(true);
    try {
      const r = await revokeAdmin({ data: { userId } });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Admin access removed");
        await qc.invalidateQueries({ queryKey: ["admin", "admins"] });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box title="Team (admins)">
      <p className="text-sm text-muted-foreground">
        Admins can change prices and texts, add entries, run test purchases, run the draw and see
        winners' emails. Only give this access to people you fully trust. The person must already
        have an account.
      </p>
      <div className="grid gap-2">
        {admins.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {admins.error && (
          <p className="text-sm text-destructive">{(admins.error as Error).message}</p>
        )}
        {admins.data?.map((a) => (
          <div
            key={a.user_id}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
          >
            <span className="break-all">
              {a.email}
              {a.is_me ? " (you)" : ""}
            </span>
            {!a.is_me && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => remove(a.user_id)}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-1.5 sm:max-w-md">
        <Label>Give admin access to (account email)</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@gmail.com"
        />
      </div>
      <Button className="w-fit" disabled={busy || !email} onClick={add}>
        Make admin
      </Button>
    </Box>
  );
}
