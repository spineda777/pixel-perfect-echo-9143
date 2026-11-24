import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LANGS, useI18n } from "@/lib/i18n";
import { Instagram, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  const { t } = useI18n();
  return (
    <div className="bg-warning px-4 py-2 text-center font-mono text-xs font-semibold tracking-wide text-warning-foreground">
      {t("demo_banner")}
    </div>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex rounded-md border border-border p-0.5" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <Button
            variant="ghost"
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          className={`h-auto rounded px-2 py-1 font-mono text-xs ${lang === l.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {l.label}
        </Button>
      ))}
    </div>
  );
}

export function SocialLinks() {
  return <div className="flex items-center gap-1">
    <Button asChild variant="glass" size="icon"><a href="https://www.instagram.com/rickyrespawn06/" target="_blank" rel="noopener noreferrer" aria-label="Instagram @rickyrespawn06" title="Instagram @rickyrespawn06"><Instagram /></a></Button>
    <Button asChild variant="glass" size="icon"><a href="https://www.tiktok.com/@rickyrespawn06" target="_blank" rel="noopener noreferrer" aria-label="TikTok @rickyrespawn06" title="TikTok @rickyrespawn06"><Music2 /></a></Button>
  </div>;
}

export function SiteHeader() {
  const { t } = useI18n();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link to="/" className="font-display text-lg font-bold tracking-tight">
          RESPAWN<span className="text-signal">CLUB</span>
        </Link>
        <nav className="ml-6 hidden items-center gap-5 text-sm text-muted-foreground lg:flex">
          <a href="/#packages" className="hover:text-foreground">{t("nav_packages")}</a>
          <a href="/#how" className="hover:text-foreground">{t("nav_how")}</a>
          <a href="/#prizes" className="hover:text-foreground">{t("nav_prizes")}</a>
          <a href="/#faq" className="hover:text-foreground">{t("nav_faq")}</a>
          <Link to="/rules" className="hover:text-foreground">{t("nav_rules")}</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden xl:block"><SocialLinks /></div>
          <LangSwitch />
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">{t("nav_admin")}</Link>
            </Button>
          )}
          {user ? (
            <Button variant="outline" size="sm" onClick={signOut}>{t("nav_signout")}</Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">{t("nav_signin")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-display text-base font-bold">RESPAWN<span className="text-signal">CLUB</span></p>
          <p className="mt-1 text-sm text-muted-foreground">{t("footer_tagline")}</p>
          <div className="mt-4"><SocialLinks /></div>
          <p className="mt-4 max-w-2xl text-xs text-muted-foreground">{t("footer_disclaimer")}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm md:items-end">
          <Link to="/rules" className="text-primary hover:underline">{t("nav_rules")}</Link>
          <p className="text-xs text-muted-foreground">© 2026 Respawn Club. {t("footer_rights")}</p>
        </div>
      </div>
    </footer>
  );
}
