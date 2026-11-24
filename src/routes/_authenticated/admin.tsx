import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import { MEDIA_BUCKET, STORAGE_PREFIX } from "@/hooks/use-media-url";
import { HARD_MAX_INVENTORY, HARD_MAX_PER_USER, isValidTimeZone, utcToZonedInput, zonedInputToUtc } from "@/lib/campaign-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DrawPanel } from "@/components/admin-draw";
import { AdminOrders } from "@/components/admin-orders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Respawn Club" },
      { name: "description", content: "Respawn Club campaign administration." },
      { property: "og:title", content: "Admin — Respawn Club" },
      { property: "og:description", content: "Respawn Club campaign administration." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Tr = { en: string; es: string; pt: string };
const toTr = (v: Json): Tr => {
  const o = v && typeof v === "object" && !Array.isArray(v) ? v : {};
  const g = (k: string) => (typeof o[k] === "string" ? (o[k] as string) : "");
  return { en: g("en"), es: g("es"), pt: g("pt") };
};

function TrEdit({ label, value, onChange, multiline }: { label: string; value: Tr; onChange: (v: Tr) => void; multiline?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {(["en", "es", "pt"] as const).map((k) => (
        <div key={k} className="flex gap-2">
          <span className="w-7 pt-2 font-mono text-xs uppercase text-muted-foreground">{k}</span>
          {multiline ? (
            <Textarea rows={3} value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
          ) : (
            <Input value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} />
          )}
        </div>
      ))}
    </div>
  );
}

async function uploadImage(file: File): Promise<string> {
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return STORAGE_PREFIX + path;
}

function useAdminData() {
  return useQuery({
    queryKey: ["admin", "campaign"],
    queryFn: async () => {
      const { data: c, error } = await supabase.from("campaigns").select("*").eq("is_featured", true).limit(1).maybeSingle();
      if (error) throw error;
      if (!c) return null;
      const [pk, pr, fq, rs, au, st] = await Promise.all([
        supabase.from("campaign_packages").select("*").eq("campaign_id", c.id).order("sort_order"),
        supabase.from("prizes").select("*").eq("campaign_id", c.id).order("rank"),
        supabase.from("faqs").select("*").eq("campaign_id", c.id).order("sort_order"),
        supabase.from("rules_sections").select("*").eq("campaign_id", c.id).order("section_number"),
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.rpc("get_campaign_stats", { _campaign_id: c.id }),
      ]);
      return { c, packages: pk.data ?? [], prizes: pr.data ?? [], faqs: fq.data ?? [], rules: rs.data ?? [], audit: au.data ?? [], stats: st.data?.[0] ?? null };
    },
  });
}

function AdminPage() {
  const { isAdmin, rolesLoading, user } = useAuth();
  const qc = useQueryClient();
  const admins = useQuery({ queryKey: ["admins_exist"], queryFn: async () => (await supabase.rpc("admins_exist")).data ?? true });

  if (!user || rolesLoading) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h1 className="font-display text-2xl font-bold">Admin access required</h1>
        {admins.data === false ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">No admin exists yet. Claim the first admin role for this account.</p>
            <Button className="mt-4" onClick={async () => {
              const { data, error } = await supabase.rpc("claim_first_admin");
              if (error || !data) toast.error(error?.message ?? "Could not claim admin");
              else { toast.success("You are now admin"); await qc.invalidateQueries(); }
            }}>Claim admin</Button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Your account does not have admin permissions.</p>
        )}
        <Link to="/" className="mt-6 block text-sm text-primary">← Back to site</Link>
      </div>
    );
  }
  return <AdminDashboard />;
}

function AdminDashboard() {
  const q = useAdminData();
  const qc = useQueryClient();
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin"] }), qc.invalidateQueries({ queryKey: ["campaign"] })]);
  if (q.isLoading) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!q.data) return <p className="p-10 text-center">No featured campaign.</p>;
  const d = q.data;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <p className="font-display font-bold">RESPAWN<span className="text-signal">CLUB</span> · Admin</p>
          <Link to="/" className="text-sm text-primary">View site →</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Mode", d.c.mode.toUpperCase()],
            ["Entries sold", String(d.stats?.entries_sold ?? 0)],
            ["Remaining", String(d.stats?.remaining ?? 0)],
            ["Revenue (est.)", `$${(((d.stats?.entries_sold ?? 0) * d.c.unit_price_cents) / 100).toFixed(2)}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-surface p-4">
              <p className="font-mono text-xs text-muted-foreground">{k}</p>
              <p className="mt-1 font-display text-xl font-bold">{v}</p>
            </div>
          ))}
        </div>
        {d.stats?.is_demo && <p className="mt-2 font-mono text-xs text-warning">Demo mode: figures are demonstration data.</p>}
        <Tabs defaultValue="settings" className="mt-8">
          <TabsList className="flex-wrap">
            {["settings", "packages", "prizes", "faq", "rules", "draw", "orders", "audit"].map((v) => <TabsTrigger key={v} value={v} className="capitalize">{v}</TabsTrigger>)}
          </TabsList>
          <TabsContent value="settings"><Settings c={d.c} onSaved={refresh} /></TabsContent>
          <TabsContent value="packages"><Packages rows={d.packages} onSaved={refresh} /></TabsContent>
          <TabsContent value="prizes" className="space-y-6">{d.prizes.map((p) => <PrizeEdit key={p.id} p={p} onSaved={refresh} />)}</TabsContent>
          <TabsContent value="faq" className="space-y-6">{d.faqs.map((f) => <FaqEdit key={f.id} f={f} onSaved={refresh} />)}</TabsContent>
          <TabsContent value="rules" className="space-y-6">
            <RulesStatus c={d.c} onSaved={refresh} />
            {d.rules.map((r) => <RuleEdit key={r.id} r={r} onSaved={refresh} />)}
          </TabsContent>
          <TabsContent value="draw"><DrawPanel c={d.c} /></TabsContent>
          <TabsContent value="orders"><AdminOrders /></TabsContent>
          <TabsContent value="audit">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface font-mono text-xs text-muted-foreground"><tr><th className="p-2 text-left">When</th><th className="p-2 text-left">Table</th><th className="p-2 text-left">Action</th><th className="p-2 text-left">Actor</th></tr></thead>
                <tbody>
                  {d.audit.map((a) => (
                    <tr key={a.id} className="border-t border-border"><td className="p-2 font-mono text-xs">{new Date(a.created_at).toLocaleString()}</td><td className="p-2">{a.table_name}</td><td className="p-2">{a.action}</td><td className="p-2 font-mono text-xs">{a.actor_id?.slice(0, 8) ?? "system"}</td></tr>
                  ))}
                  {d.audit.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No changes yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return <div className="mt-4 grid gap-4 rounded-lg border border-border bg-surface p-5">{title && <h3 className="font-display font-bold">{title}</h3>}{children}</div>;
}

async function run(fn: () => PromiseLike<{ error: { message: string } | null }>, onSaved: () => unknown) {
  const { error } = await fn();
  if (error) toast.error(error.message);
  else { toast.success("Saved"); await onSaved(); }
}

function Settings({ c, onSaved }: { c: Tables<"campaigns">; onSaved: () => unknown }) {
  const [f, setF] = useState({
    title: toTr(c.title), tagline: toTr(c.tagline), mode: c.mode, timezone: c.timezone,
    ends: utcToZonedInput(c.ends_at, c.timezone), demo: c.demo_entries_sold, price: c.unit_price_cents,
    inv: c.max_inventory, per: c.max_per_user, hero: c.hero_image_url,
  });
  async function save(): Promise<void> {
    if (!isValidTimeZone(f.timezone)) { toast.error("Invalid time zone (e.g. America/New_York)"); return; }
    if (f.inv < 1 || f.inv > HARD_MAX_INVENTORY) { toast.error(`Inventory must be 1–${HARD_MAX_INVENTORY}`); return; }
    if (f.per < 1 || f.per > HARD_MAX_PER_USER) { toast.error(`Per-account limit must be 1–${HARD_MAX_PER_USER}`); return; }
    const ends = f.ends ? zonedInputToUtc(f.ends, f.timezone) : null;
    if (f.ends && !ends) { toast.error("Invalid end date"); return; }
    await run(() => supabase.from("campaigns").update({
      title: f.title, tagline: f.tagline, mode: f.mode, timezone: f.timezone, ends_at: ends?.toISOString() ?? null,
      demo_entries_sold: f.demo, unit_price_cents: f.price, max_inventory: f.inv, max_per_user: f.per, hero_image_url: f.hero,
    }).eq("id", c.id), onSaved);
  }
  const num = (k: "demo" | "price" | "inv" | "per", label: string) => (
    <div className="grid gap-1.5"><Label>{label}</Label><Input type="number" min={0} value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} /></div>
  );
  return (
    <Card title="Campaign settings">
      <TrEdit label="Title" value={f.title} onChange={(v) => setF({ ...f, title: v })} />
      <TrEdit label="Tagline" value={f.tagline} onChange={(v) => setF({ ...f, tagline: v })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div><Label>Production mode</Label><p className="text-xs text-muted-foreground">Off = demo (no entries can be created).</p></div>
          <Switch checked={f.mode === "production"} onCheckedChange={(v) => setF({ ...f, mode: v ? "production" : "demo" })} />
        </div>
        <div className="grid gap-1.5"><Label>Time zone (IANA)</Label><Input value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></div>
        <div className="grid gap-1.5"><Label>Ends at (in campaign time zone) — empty = Coming soon</Label><Input type="datetime-local" value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} /></div>
        {num("demo", "Demo entries sold (display only)")}
        {num("price", "Unit price (cents)")}
        {num("inv", `Max inventory (≤ ${HARD_MAX_INVENTORY})`)}
        {num("per", `Max per account (≤ ${HARD_MAX_PER_USER})`)}
        <div className="grid gap-1.5"><Label>Hero image</Label><Input type="file" accept="image/*" onChange={async (e) => {
          const file = e.target.files?.[0]; if (!file) return;
          try { setF({ ...f, hero: await uploadImage(file) }); toast.success("Uploaded — click Save"); } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
        }} /></div>
      </div>
      <Button onClick={save} className="w-fit">Save settings</Button>
    </Card>
  );
}

function Packages({ rows, onSaved }: { rows: Tables<"campaign_packages">[]; onSaved: () => unknown }) {
  return (
    <Card title="Packages">
      {rows.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-4 border-b border-border pb-3">
          <span className="w-28 font-display font-bold">{p.entries} entries</span>
          <span className="font-mono text-sm">${(p.price_cents / 100).toFixed(2)}</span>
          <label className="flex items-center gap-2 text-sm"><Switch checked={p.is_active} onCheckedChange={(v) => run(() => supabase.from("campaign_packages").update({ is_active: v }).eq("id", p.id), onSaved)} />Active</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={p.is_recommended} onCheckedChange={(v) => run(() => supabase.from("campaign_packages").update({ is_recommended: v }).eq("id", p.id), onSaved)} />Recommended</label>
        </div>
      ))}
    </Card>
  );
}

function PrizeEdit({ p, onSaved }: { p: Tables<"prizes">; onSaved: () => unknown }) {
  const [title, setTitle] = useState(toTr(p.title));
  const [desc, setDesc] = useState(toTr(p.description));
  const [value, setValue] = useState(p.approx_value_cents ?? 0);
  const [img, setImg] = useState(p.image_url);
  return (
    <Card title={`Prize #${p.rank}`}>
      <TrEdit label="Title" value={title} onChange={setTitle} />
      <TrEdit label="Description" value={desc} onChange={setDesc} multiline />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label>Approx. value (cents)</Label><Input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} /></div>
        <div className="grid gap-1.5"><Label>Image</Label><Input type="file" accept="image/*" onChange={async (e) => {
          const file = e.target.files?.[0]; if (!file) return;
          try { setImg(await uploadImage(file)); toast.success("Uploaded — click Save"); } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
        }} /></div>
      </div>
      <Button className="w-fit" onClick={() => run(() => supabase.from("prizes").update({ title, description: desc, approx_value_cents: value, image_url: img }).eq("id", p.id), onSaved)}>Save prize</Button>
    </Card>
  );
}

function FaqEdit({ f, onSaved }: { f: Tables<"faqs">; onSaved: () => unknown }) {
  const [q, setQ] = useState(toTr(f.question));
  const [a, setA] = useState(toTr(f.answer));
  const [pub, setPub] = useState(f.is_published);
  return (
    <Card>
      <TrEdit label="Question" value={q} onChange={setQ} />
      <TrEdit label="Answer" value={a} onChange={setA} multiline />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><Switch checked={pub} onCheckedChange={setPub} />Published</label>
        <Button onClick={() => run(() => supabase.from("faqs").update({ question: q, answer: a, is_published: pub }).eq("id", f.id), onSaved)}>Save</Button>
      </div>
    </Card>
  );
}

function RulesStatus({ c, onSaved }: { c: Tables<"campaigns">; onSaved: () => unknown }) {
  const published = c.rules_status === "approved";
  return (
    <Card>
      <label className="flex items-center gap-3 text-sm">
        <Switch checked={published} onCheckedChange={(v) => run(() => supabase.from("campaigns").update({ rules_status: v ? "approved" : "draft" }).eq("id", c.id), onSaved)} />
        Rules approved by legal (removes the DRAFT label)
      </label>
    </Card>
  );
}

function RuleEdit({ r, onSaved }: { r: Tables<"rules_sections">; onSaved: () => unknown }) {
  const [title, setTitle] = useState(toTr(r.title));
  const [body, setBody] = useState(toTr(r.body));
  return (
    <Card title={`Section ${r.section_number}`}>
      <TrEdit label="Title" value={title} onChange={setTitle} />
      <TrEdit label="Body" value={body} onChange={setBody} multiline />
      <Button className="w-fit" onClick={() => run(() => supabase.from("rules_sections").update({ title, body }).eq("id", r.id), onSaved)}>Save section</Button>
    </Card>
  );
}
