import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Lock, Maximize2, ShieldCheck, Trophy, Users } from "lucide-react";
import heroAsset from "@/assets/hero-drop.jpg.asset.json";
import { allowanceQuery, drawResultQuery, featuredCampaignQuery, publicEntriesQuery, statsQuery } from "@/lib/campaign-queries";
import { formatMoney, formatNumber, getCountdown, packageAvailability, percentSold } from "@/lib/campaign-rules";
import { tr, useI18n, type TKey } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { useMediaUrl } from "@/hooks/use-media-url";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { PayPalButton } from "@/components/paypal-button";
import { simulateDemoOrder } from "@/lib/paypal.functions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    packageId: typeof search.packageId === "string" ? search.packageId : undefined,
    checkout: search.checkout === true || search.checkout === "true",
  }),
  head: () => ({
    meta: [
      { title: "GTA VI Legendary Drop — Respawn Club" },
      { name: "description", content: "Three prizes, three winners: PS5 Pro, GTA VI and a $50 gift card. Max 15,000 entries, 100 per account." },
      { property: "og:title", content: "GTA VI Legendary Drop — Respawn Club" },
      { property: "og:description", content: "Three prizes, three winners. Max 15,000 entries, 100 per account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredCampaignQuery),
  component: CampaignPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-destructive">{error instanceof Error ? error.message : String(error)}</div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Campaign not found.</div>,
});

const GRAND_PRIZE_IMAGE = "/prize-grand.jpg";
const PRIZE_FALLBACK = [GRAND_PRIZE_IMAGE, "/prize-2-gta.jpg", "/prize-3-giftcard.jpg"];

function CampaignPage() {
  const { data } = useSuspenseQuery(featuredCampaignQuery);
  const { t, lang } = useI18n();
  const [openPrizeId, setOpenPrizeId] = useState<string | null>(null);
  if (!data) {
    return (
      <div className="min-h-screen bg-background"><SiteHeader /><p className="p-16 text-center text-muted-foreground">{t("loading")}</p></div>
    );
  }
  const { campaign, prizes, packages, faqs } = data;
  const isDemo = campaign.mode === "demo";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <PrizeDialog />
      <main>
        <PackagesSection />
        <HowSection />
        <PrizesSection />
        <EntriesSection />
        <WinnersSection />
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20">
          <p className="eyebrow">{t("faq_eyebrow")}</p>
          <h2 className="mt-2 font-display text-3xl font-bold">{t("faq_title")}</h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-left">{tr(f.question, lang)}</AccordionTrigger>
                <AccordionContent className="whitespace-pre-line text-muted-foreground">{tr(f.answer, lang)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-8 text-sm">
            <Link to="/rules" className="inline-block text-primary hover:underline">{t("rules_link_cta")} →</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );

  function Hero() {
    const heroUrl = useMediaUrl(campaign.hero_image_url, heroAsset.url);
    const grand = prizes.find((p) => p.rank === 1) ?? prizes[0];
    const grandImg = useMediaUrl(grand?.image_url ?? null, PRIZE_FALLBACK[0] ?? heroAsset.url);
    const { locale } = useI18n();
    return (
      <section className="relative overflow-hidden border-b border-border">
        <img src={heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-fade-left" />
        <div className="absolute inset-0 bg-fade-bottom" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow">{t("hero_eyebrow")}</span>
                {!isDemo && (
                  <span className="rounded bg-success px-2 py-0.5 font-mono text-[10px] font-semibold text-background">{t("status_live")}</span>
                )}
              </div>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">{tr(campaign.title, lang)}</h1>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">{tr(campaign.tagline, lang)}</p>
              {grand && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 font-mono text-xs font-semibold uppercase text-gold">
                  <Trophy className="h-4 w-4" />
                  {t("hero_grand_prize")}: {tr(grand.title, lang)}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-4 font-mono text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-gold" />{t("hero_winners")}</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" />{formatNumber(campaign.max_inventory, "en-US")} {t("hero_max_entries")}</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" />{campaign.max_per_user} {t("hero_per_account")}</span>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-signal shadow-glow"><a href="#packages">{t("hero_cta_packages")}</a></Button>
                <Button asChild size="lg" variant="outline"><a href="#prizes">{t("hero_cta_prizes")}</a></Button>
              </div>
            </div>
            {grand && (
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-primary/30 blur-3xl" aria-hidden />
                <article role="button" tabIndex={0} onClick={() => setOpenPrizeId(grand.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenPrizeId(grand.id); } }} className="relative cursor-pointer overflow-hidden rounded-2xl border border-primary/50 bg-card-gradient shadow-glow transition hover:border-primary">
                  <span className="absolute left-4 top-4 z-10 rounded bg-signal px-3 py-1 font-mono text-xs font-bold uppercase text-primary-foreground">{t("hero_grand_prize")}</span>
                  <img src={grandImg} alt={tr(grand.title, lang)} className="aspect-[3/2] w-full object-cover" />
                  <div className="p-5">
                    <h2 className="font-display text-2xl font-bold">{tr(grand.title, lang)}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{tr(grand.description, lang)}</p>
                    {grand.approx_value_cents != null && (
                      <p className="mt-3 font-mono text-xs text-muted-foreground">{t("prize_value")}: {formatMoney(grand.approx_value_cents, campaign.currency, locale)}</p>
                    )}
                  </div>
                </article>
                <div className="relative mt-4">
                  <ProgressCard />
                </div>
              </div>
            )}
          </div>
          <div className={`mt-10 grid gap-4 ${grand ? "" : "md:grid-cols-2"}`}>
            <CountdownCard />
            {!grand && <ProgressCard />}
          </div>
        </div>
      </section>
    );
  }

  function CountdownCard() {
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
      setNow(Date.now());
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }, []);
    const cd = now === null ? { state: "none" as const } : getCountdown(campaign.ends_at, now);
    const units: [number, TKey][] =
      cd.state === "running" ? [[cd.days, "countdown_days"], [cd.hours, "countdown_hours"], [cd.minutes, "countdown_minutes"], [cd.seconds, "countdown_seconds"]] : [];
    return (
      <div className="rounded-xl border border-border bg-card-gradient p-5 shadow-card">
        {cd.state === "running" ? (
          <>
            <p className="eyebrow">{t("countdown_ends_in")}</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {units.map(([v, k]) => (
                <div key={k} className="rounded-lg bg-surface-raised p-3 text-center">
                  <p className="font-display text-2xl font-bold tabular-nums">{String(v).padStart(2, "0")}</p>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground">{t(k)}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              {t("countdown_tz")}: {new Date(campaign.ends_at!).toLocaleString(undefined, { timeZone: campaign.timezone, dateStyle: "medium", timeStyle: "short", timeZoneName: "short" })}
            </p>
          </>
        ) : cd.state === "ended" ? (
          <p className="font-display text-2xl font-bold">{t("countdown_ended")}</p>
        ) : (
          <>
            <p className="font-display text-2xl font-bold uppercase text-signal">{t("countdown_coming_soon")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("countdown_coming_soon_hint")}</p>
          </>
        )}
      </div>
    );
  }

  function ProgressCard() {
    const stats = useQuery({ ...statsQuery(campaign.id), initialData: data!.stats }).data;
    const sold = stats?.entries_sold ?? 0;
    const total = stats?.max_inventory ?? campaign.max_inventory;
    const pct = percentSold(sold, total);
    return (
      <div className="rounded-xl border border-border bg-card-gradient p-5 shadow-card">
        <div className="flex items-end justify-between">
          <p className="eyebrow">{t("progress_sold")}</p>
          <p className="font-display text-2xl font-bold">{pct}% <span className="text-sm font-normal text-muted-foreground">{t("progress_sold_pct")}</span></p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-signal" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs">
          <div><p className="text-muted-foreground">{t("progress_sold")}</p><p className="text-sm font-semibold">{formatNumber(sold, "en-US")}</p></div>
          <div><p className="text-muted-foreground">{t("progress_total")}</p><p className="text-sm font-semibold">{formatNumber(total, "en-US")}</p></div>
          <div><p className="text-muted-foreground">{t("progress_remaining")}</p><p className="text-sm font-semibold">{formatNumber(Math.max(0, total - sold), "en-US")}</p></div>
        </div>
      </div>
    );
  }

  function PackagesSection() {
    const search = Route.useSearch();
    const { locale } = useI18n();
    const { user, isAdmin } = useAuth();
    const stats = useQuery({ ...statsQuery(campaign.id), initialData: data!.stats }).data;
    const allowance = useQuery(allowanceQuery(campaign.id, user?.id ?? null)).data;
    const [selected, setSelected] = useState<string | null>(
      search.packageId || packages.find((p) => p.is_recommended)?.id ?? null
    );
    const [open, setOpen] = useState(Boolean(search.checkout && search.packageId));

    useEffect(() => {
      const storedPkg = sessionStorage.getItem("respawn_checkout_package");
      const shouldOpen = sessionStorage.getItem("respawn_checkout_open") === "true";
      if (storedPkg) {
        setSelected(storedPkg);
        sessionStorage.removeItem("respawn_checkout_package");
      }
      if (shouldOpen || (search.checkout && (search.packageId || storedPkg))) {
        sessionStorage.removeItem("respawn_checkout_open");
        setOpen(true);
      }
    }, [search]);
    const [done, setDone] = useState<{ orderCode: string; first: number | null; last: number | null } | null>(null);
    const simulate = useServerFn(simulateDemoOrder);
    const [isSimulating, setIsSimulating] = useState(false);
    const qc = useQueryClient();
    const campaignRemaining = stats?.remaining ?? campaign.max_inventory;
    const personalRemaining = allowance?.remaining ?? campaign.max_per_user;
    const sel = packages.find((p) => p.id === selected) ?? null;
    const selAvail = sel ? packageAvailability(sel.entries, { campaignRemaining, personalRemaining }) : null;

    return (
      <section id="packages" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20">
        <p className="eyebrow">{t("packages_eyebrow")}</p>
        <h2 className="mt-2 font-display text-3xl font-bold">{t("packages_title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("packages_sub")}</p>
        <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs text-muted-foreground">
          <span>{t("packages_max_account")}: {campaign.max_per_user}</span>
          <span>{user && allowance ? `${t("packages_your_allowance")}: ${allowance.remaining}` : !user ? t("packages_signin_allowance") : ""}</span>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {packages.map((p) => {
              const av = packageAvailability(p.entries, { campaignRemaining, personalRemaining });
              const active = selected === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!av.available}
                  onClick={() => setSelected(p.id)}
                  aria-pressed={active}
                  className={`relative rounded-xl border p-5 text-left transition ${active ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-card-gradient hover:border-primary/60"} disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {p.is_recommended && <span className="absolute -top-2.5 left-4 rounded bg-signal px-2 py-0.5 font-mono text-[10px] font-semibold text-primary-foreground">{t("packages_recommended")}</span>}
                  <p className="font-display text-3xl font-bold">{p.entries}</p>
                  <p className="text-sm text-muted-foreground">{p.entries === 1 ? t("packages_entry") : t("packages_entries")}</p>
                  <p className="mt-3 font-mono text-lg font-semibold">{formatMoney(p.price_cents, campaign.currency, locale)}</p>
                  {!av.available && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-destructive"><Lock className="h-3 w-3" />{av.reason === "campaign_inventory" ? t("packages_blocked_inventory") : t("packages_blocked_personal")}</p>
                  )}
                  {active && <Check className="absolute right-3 top-3 h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
          <aside className="h-fit rounded-xl border border-border bg-card-gradient p-5 shadow-card lg:sticky lg:top-20">
            <h3 className="font-display text-lg font-bold">{t("summary_title")}</h3>
            {sel ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">{t("summary_package")}</dt><dd>{sel.entries} {sel.entries === 1 ? t("packages_entry") : t("packages_entries")}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">{t("summary_unit")}</dt><dd className="font-mono">{formatMoney(campaign.unit_price_cents, campaign.currency, locale)}</dd></div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>{t("summary_total")}</dt><dd className="font-mono">{formatMoney(sel.price_cents, campaign.currency, locale)}</dd></div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">{t("summary_none")}</p>
            )}
            <Button className="mt-5 w-full bg-signal" size="lg" disabled={!sel || !selAvail?.available} onClick={() => setOpen(true)}>{t("summary_confirm")}</Button>
            <p className="mt-3 text-xs text-muted-foreground">{t(isDemo ? "summary_demo_note" : "summary_live_note")}</p>
          </aside>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t(isDemo ? "confirm_title" : "confirm_title_live")}</DialogTitle>
              <DialogDescription>{t(isDemo ? "confirm_body" : "confirm_body_live")}</DialogDescription>
            </DialogHeader>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{t("confirm_eligible")}</li>
              <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" />{t("confirm_verify")}</li>
            </ul>
            {!user && sel && !done && (
              <Button
                asChild
                className="w-full"
                onClick={() => {
                  if (sel) {
                    sessionStorage.setItem("respawn_checkout_package", sel.id);
                    sessionStorage.setItem("respawn_checkout_open", "true");
                  }
                }}
              >
                <Link to="/auth" search={{ packageId: sel?.id, checkout: true }}>
                  {t("nav_signin")}
                </Link>
              </Button>
            )}

            {user && sel && !done && (() => {
              const canSimulate = isDemo || isAdmin || user.email === "spineda2014.123@gmail.com";
              return (
                <div className="space-y-4 pt-2">
                  {canSimulate && (
                    <div className="rounded-lg border border-signal/40 bg-signal/10 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono text-signal">
                        <span>{isAdmin || user.email === "spineda2014.123@gmail.com" ? "MODO TEST ADMIN" : "MODO DEMO"}</span>
                        <span>$0.00</span>
                      </div>
                      <Button
                        className="w-full bg-signal shadow-glow hover:bg-signal/90"
                        size="lg"
                        disabled={isSimulating}
                        onClick={async () => {
                          try {
                            setIsSimulating(true);
                            const r = await simulate({ data: { packageId: sel.id } });
                            setDone(r);
                            qc.invalidateQueries({ queryKey: ["campaign", campaign.id] });
                            toast.success(t("confirm_demo_success"));
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Error al procesar compra de prueba");
                          } finally {
                            setIsSimulating(false);
                          }
                        }}
                      >
                        {isSimulating ? "Procesando..." : t("confirm_demo_cta")}
                      </Button>
                      <p className="text-center font-mono text-xs text-muted-foreground">
                        {t("confirm_demo_hint")}
                      </p>
                    </div>
                  )}

                  {!isDemo && (
                    <div className="space-y-2">
                      {canSimulate && (
                        <div className="relative flex py-1 items-center">
                          <div className="flex-grow border-t border-border"></div>
                          <span className="flex-shrink mx-3 text-xs text-muted-foreground uppercase">o pagar con PayPal real</span>
                          <div className="flex-grow border-t border-border"></div>
                        </div>
                      )}
                      <PayPalButton
                        packageId={sel.id}
                        currency={campaign.currency}
                        onDone={(r) => {
                          if (r.ok) {
                            setDone(r);
                            qc.invalidateQueries({ queryKey: ["campaign", campaign.id] });
                            toast.success(r.orderCode);
                          } else {
                            toast.error(r.error);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
            {done && (
              <div className="rounded-lg border border-primary bg-primary/10 p-4 font-mono text-sm">
                <p className="font-semibold text-primary">✓ {done.orderCode}</p>
                <p className="mt-1">#{String(done.first).padStart(5, "0")} – #{String(done.last).padStart(5, "0")}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t("confirm_email_sent")}</p>
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => { setOpen(false); setDone(null); }}>{t("confirm_close")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  function HowSection() {
    const steps: [TKey, TKey][] = [["how_1_title", "how_1_body"], ["how_2_title", "how_2_body"], ["how_3_title", "how_3_body"]];
    return (
      <section id="how" className="scroll-mt-20 border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <p className="eyebrow">{t("how_eyebrow")}</p>
          <h2 className="mt-2 font-display text-3xl font-bold">{t("how_title")}</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map(([h, b], i) => (
              <li key={h} className="rounded-xl border border-border bg-card-gradient p-6">
                <span className="font-display text-4xl font-extrabold text-signal">0{i + 1}</span>
                <h3 className="mt-3 font-display text-lg font-bold">{t(h)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(b)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  function PrizesSection() {
    return (
      <section id="prizes" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20">
        <p className="eyebrow">{t("prizes_eyebrow")}</p>
        <h2 className="mt-2 font-display text-3xl font-bold">{t("prizes_title")}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {prizes.map((p, i) => <PrizeCard key={p.id} prize={p} featured={i === 0} />)}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">{t("prizes_conditions")}</p>
      </section>
    );
  }

  function PrizeDialog() {
    const prize = prizes.find((p) => p.id === openPrizeId) ?? null;
    return (
      <Dialog open={!!prize} onOpenChange={(o) => { if (!o) setOpenPrizeId(null); }}>
        {prize && <PrizeDetail prize={prize} />}
      </Dialog>
    );
  }

  function PrizeDetail({ prize }: { prize: (typeof prizes)[number] }) {
    const { locale } = useI18n();
    const img = useMediaUrl(prize.image_url, PRIZE_FALLBACK[prize.rank - 1] ?? heroAsset.url);
    const n = Math.min(3, Math.max(1, prize.rank));
    const rankKey = `prize_rank_${n}` as TKey;
    const detailKey = `prize_detail_${n}` as TKey;
    const tone = prize.rank === 1 ? "text-gold" : prize.rank === 2 ? "text-silver" : "text-bronze";
    return (
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl gap-0 overflow-y-auto p-0">
        <div className="bg-black">
          <img src={img} alt={tr(prize.title, lang)} className="mx-auto max-h-[55vh] w-full object-contain" />
        </div>
        <div className="p-6">
          <DialogHeader className="text-left">
            <p className={`font-mono text-xs font-semibold uppercase ${tone}`}>{t(rankKey)}</p>
            <DialogTitle className="font-display text-2xl">{tr(prize.title, lang)}</DialogTitle>
            <DialogDescription className="text-base">{tr(prize.description, lang)}</DialogDescription>
          </DialogHeader>
          <div className="mt-5 grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-muted-foreground">{prize.winner_count === 1 ? t("prize_winners") : t("prize_winners_plural")}</p>
              <p className="mt-1 text-lg font-bold">{prize.winner_count}</p>
            </div>
            {prize.approx_value_cents != null && (
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-muted-foreground">{t("prize_value")}</p>
                <p className="mt-1 text-lg font-bold">{formatMoney(prize.approx_value_cents, campaign.currency, locale)}</p>
              </div>
            )}
          </div>
          <div className="mt-5">
            <p className="font-mono text-xs font-semibold uppercase text-primary">{t("prize_includes")}</p>
            <p className="mt-2 flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t(detailKey)}</p>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">{t("prize_details_note")}</p>
          <Link to="/rules" className="mt-2 inline-block text-sm text-primary hover:underline">{t("rules_link_cta")} →</Link>
        </div>
      </DialogContent>
    );
  }

  function PrizeCard({ prize, featured }: { prize: (typeof prizes)[number]; featured?: boolean }) {
    const { locale } = useI18n();
    const img = useMediaUrl(prize.image_url, PRIZE_FALLBACK[prize.rank - 1] ?? heroAsset.url);
    const rankKey = (`prize_rank_${Math.min(3, Math.max(1, prize.rank))}`) as TKey;
    const tone = prize.rank === 1 ? "text-gold" : prize.rank === 2 ? "text-silver" : "text-bronze";
    return (
      <article role="button" tabIndex={0} onClick={() => setOpenPrizeId(prize.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenPrizeId(prize.id); } }} className={`cursor-pointer overflow-hidden rounded-xl border bg-card-gradient shadow-card transition hover:-translate-y-0.5 hover:border-primary/70 ${featured ? "border-primary/50 shadow-glow md:col-span-2 md:grid md:grid-cols-[1.1fr_1fr]" : "border-border"}`}>
        <img src={img} alt={tr(prize.title, lang)} loading="lazy" className={`w-full object-cover ${featured ? "aspect-[4/3] md:aspect-auto md:h-full" : "aspect-[4/3]"}`} />
        <div className={featured ? "flex flex-col justify-center p-6 md:p-10" : "p-5"}>
          <p className={`font-mono text-xs font-semibold uppercase ${tone}`}>{t(rankKey)}</p>
          <h3 className={`mt-1 font-display font-bold ${featured ? "text-3xl" : "text-xl"}`}>{tr(prize.title, lang)}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{tr(prize.description, lang)}</p>
          <div className="mt-4 flex justify-between font-mono text-xs text-muted-foreground">
            <span>{prize.winner_count} {prize.winner_count === 1 ? t("prize_winners") : t("prize_winners_plural")}</span>
            {prize.approx_value_cents != null && <span>{t("prize_value")}: {formatMoney(prize.approx_value_cents, campaign.currency, locale)}</span>}
          </div>
          <p className="mt-3 flex items-center gap-1.5 font-mono text-xs font-semibold text-primary"><Maximize2 className="h-3.5 w-3.5" />{t("prize_view_details")}</p>
        </div>
      </article>
    );
  }

  function EntriesSection() {
    const real = useQuery(publicEntriesQuery(campaign.id, !isDemo)).data ?? [];
    const rows = real;
    const [showAll, setShowAll] = useState(false);
    const visible = showAll ? rows : rows.slice(0, 5);
    return (
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <p className="eyebrow">{t("entries_eyebrow")}</p>
          <h2 className="mt-2 font-display text-3xl font-bold">{t("entries_title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("entries_sub")}</p>
          {rows.length === 0 ? (
            <p className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("entries_empty")}</p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-raised font-mono text-xs text-muted-foreground">
                  <tr><th className="p-3 text-left">{t("entries_col_number")}</th><th className="p-3 text-left">ID</th><th className="p-3 text-left">{t("entries_col_player")}</th><th className="p-3 text-right">{t("entries_col_status")}</th></tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.entry_number} className="border-t border-border">
                      <td className="p-3 font-mono">#{String(r.entry_number).padStart(5, "0")}</td>
                      <td className="p-3 font-mono text-xs">{r.order_code ?? "—"}</td>
                      <td className="p-3">{r.public_handle}</td>
                      <td className="p-3 text-right font-mono text-xs">{r.status === "sample" ? t("entries_status_sample") : t("entries_status_valid")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > 5 && (
            <Button variant="ghost" className="mt-3" onClick={() => setShowAll(!showAll)}>
              <ChevronDown className={`mr-1 h-4 w-4 transition ${showAll ? "rotate-180" : ""}`} />{showAll ? "−" : `+${rows.length - 5}`}
            </Button>
          )}
        </div>
      </section>
    );
  }
  function WinnersSection() {
    const { locale } = useI18n();
    const draw = useQuery(drawResultQuery(campaign.id)).data;
    if (!draw) return null;
    return (
      <section id="winners" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-20">
        <p className="eyebrow">{t("winners_eyebrow")}</p>
        <h2 className="mt-2 font-display text-3xl font-bold">{t("winners_title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("winners_sub")}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {t("winners_drawn")} {new Date(draw.drawn_at).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" })}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {draw.winners.map((w) => {
            const prize = prizes.find((p) => p.rank === w.prize_rank);
            const rankKey = `prize_rank_${Math.min(3, Math.max(1, w.prize_rank))}` as TKey;
            const tone = w.prize_rank === 1 ? "text-gold" : w.prize_rank === 2 ? "text-silver" : "text-bronze";
            return (
              <article key={`${w.prize_rank}-${w.entry_number}`} className="rounded-xl border border-border bg-card-gradient p-5 shadow-card">
                <p className={`font-mono text-xs font-semibold uppercase ${tone}`}>{t(rankKey)}</p>
                <h3 className="mt-1 font-display text-lg font-bold">{tr(prize?.title ?? null, lang)}</h3>
                <p className="mt-3 font-mono text-sm">#{String(w.entry_number).padStart(5, "0")}</p>
                <p className="text-sm text-muted-foreground">{w.public_handle}</p>
              </article>
            );
          })}
        </div>
      </section>
    );
  }
}
