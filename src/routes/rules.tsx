import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { rulesQuery } from "@/lib/campaign-queries";
import { tr, useI18n } from "@/lib/i18n";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Official Rules — GTA VI Legendary Drop | Respawn Club" },
      { name: "description", content: "Official rules and regulations for the Respawn Club GTA VI Legendary Drop (draft, subject to legal review)." },
      { property: "og:title", content: "Official Rules — Respawn Club" },
      { property: "og:description", content: "Official rules and regulations for the GTA VI Legendary Drop." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(rulesQuery),
  component: RulesPage,
  errorComponent: ({ error }) => <div role="alert" className="p-10 text-center text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-10 text-center">Rules not found.</div>,
});

function RulesPage() {
  const { data } = useSuspenseQuery(rulesQuery);
  const { t, lang } = useI18n();
  const isDraft = (data?.campaign.rules_status ?? "draft") !== "approved";
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-14">
        <Link to="/" className="text-sm text-primary hover:underline">← {t("rules_back")}</Link>
        <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">{t("rules_title")}</h1>
        {data && <p className="mt-2 text-muted-foreground">{tr(data.campaign.title, lang)}</p>}
        {isDraft && (
          <div className="mt-6 rounded-lg border border-warning/50 bg-warning/10 p-4">
            <p className="font-mono text-sm font-bold text-warning">{t("rules_draft")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("rules_draft_body")}</p>
          </div>
        )}
        <nav className="mt-8 rounded-lg border border-border bg-surface p-5">
          <p className="eyebrow">{t("rules_toc")}</p>
          <ol className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
            {data?.sections.map((s) => (
              <li key={s.id}><a href={`#s${s.section_number}`} className="text-muted-foreground hover:text-foreground">{s.section_number}. {tr(s.title, lang)}</a></li>
            ))}
          </ol>
        </nav>
        <div className="mt-10 space-y-10">
          {data?.sections.map((s) => (
            <section key={s.id} id={`s${s.section_number}`} className="scroll-mt-20">
              <h2 className="font-display text-xl font-bold">{s.section_number}. {tr(s.title, lang)}</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{tr(s.body, lang)}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
