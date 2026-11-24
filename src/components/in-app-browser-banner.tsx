import { useEffect, useState } from "react";
import { Compass, X, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function detectInAppBrowser(): "Instagram" | "TikTok" | "Facebook" | null {
  if (typeof window === "undefined" || !navigator?.userAgent) return null;
  const ua = navigator.userAgent || (window as any).opera || "";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/TikTok|musical_ly|trill/i.test(ua)) return "TikTok";
  if (/FBAN|FBAV|FB_IAB|FB4A|Messenger/i.test(ua)) return "Facebook";
  return null;
}

export function InAppBrowserBanner() {
  const { lang } = useI18n();
  const [appName, setAppName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const detected = detectInAppBrowser();
    if (detected) {
      const isDismissed = sessionStorage.getItem("respawn_dismiss_webview_banner") === "true";
      if (!isDismissed) {
        setAppName(detected);
        setDismissed(false);
      }
    }
  }, []);

  if (dismissed || !appName) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("respawn_dismiss_webview_banner", "true");
  };

  const texts = {
    es: {
      alert: `Estás navegando desde ${appName}`,
      tip: "Para evitar bloqueos al pagar con PayPal o tarjeta, toca los tres puntos (•••) y selecciona 'Abrir en el navegador' (Safari o Chrome).",
    },
    pt: {
      alert: `Você está navegando pelo ${appName}`,
      tip: "Para evitar erros no PayPal ou cartão, toque nos três pontos (•••) e selecione 'Abrir no navegador' (Safari ou Chrome).",
    },
    en: {
      alert: `You are browsing inside ${appName}`,
      tip: "To prevent checkout popups from being blocked, tap the menu (•••) and select 'Open in browser' (Safari or Chrome).",
    },
  }[lang] || {
    alert: `Estás navegando desde ${appName}`,
    tip: "Para evitar bloqueos al pagar con PayPal o tarjeta, toca los tres puntos (•••) y selecciona 'Abrir en el navegador' (Safari o Chrome).",
  };

  return (
    <aside
      aria-label="Aviso de navegador interno"
      className="relative z-50 border-b border-warning/40 bg-warning/15 px-4 py-2.5 text-xs text-foreground backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/25 text-warning-foreground">
            <Compass className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs leading-snug">
            <span className="font-semibold text-warning-foreground">{texts.alert}: </span>
            <span className="text-muted-foreground">{texts.tip}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded p-1 text-muted-foreground transition hover:bg-warning/20 hover:text-foreground"
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
