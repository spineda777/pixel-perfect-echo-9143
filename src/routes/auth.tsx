import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LangSwitch } from "@/components/site-chrome";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Respawn Club" },
      { name: "description", content: "Sign in or create your verified Respawn Club account." },
      { property: "og:title", content: "Sign in — Respawn Club" },
      { property: "og:description", content: "Sign in or create your verified Respawn Club account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const GoogleLogo = () => (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error_generic"));
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (res.error) toast.error(t("error_generic"));
    else if (!res.redirected) navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-void">
      <div className="flex items-center justify-between p-4">
        <Link to="/" className="font-display font-bold">RESPAWN<span className="text-signal">CLUB</span></Link>
        <LangSwitch />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card-gradient p-6 shadow-card">
          <h1 className="font-display text-2xl font-bold">{mode === "in" ? t("auth_title_in") : t("auth_title_up")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth_sub")}</p>
          {sent ? (
            <p className="mt-6 rounded-md border border-primary/40 bg-primary/10 p-4 text-sm">{t("auth_check_email")}</p>
          ) : (
            <>
              <div className="mt-6 grid gap-2">
                <button type="button" onClick={() => oauth("google")} className="flex h-10 items-center justify-center gap-[10px] rounded-md border border-[#8E918F] bg-[#131314] px-3 text-sm font-medium text-[#E3E3E3]">
                  <GoogleLogo />{t("auth_google")}
                </button>
                <Button type="button" variant="outline" onClick={() => oauth("lovable")}>{t("auth_lovable")}</Button>
              </div>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />{t("auth_or")}<span className="h-px flex-1 bg-border" /></div>
              <form onSubmit={submit} className="grid gap-4">
                <div className="grid gap-1.5"><Label htmlFor="email">{t("auth_email")}</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label htmlFor="pw">{t("auth_password")}</Label><Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={busy}>{mode === "in" ? t("auth_submit_in") : t("auth_submit_up")}</Button>
              </form>
              <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-center text-sm text-primary hover:underline">
                {mode === "in" ? t("auth_switch_up") : t("auth_switch_in")}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
