import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Copy, Check, Ticket, Sparkles, Mail, Calendar, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { PayPalDoneResult } from "@/components/paypal-button";

interface OrderConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PayPalDoneResult | null;
}

export function OrderConfirmationDialog({ open, onOpenChange, data }: OrderConfirmationProps) {
  const { lang, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!data) return null;

  const { orderCode, first, last, entriesCount, payerName, payerEmail } = data;
  const count = entriesCount || (first && last ? last - first + 1 : 1);

  // Generate list of numbers
  const ticketNumbers: number[] = [];
  if (first !== null && last !== null) {
    for (let n = first; n <= last; n++) {
      ticketNumbers.push(n);
    }
  }

  const formatTicketNumber = (n: number) => `#${String(n).padStart(5, "0")}`;

  const copyNumbers = async () => {
    const rangeText =
      first === last
        ? formatTicketNumber(first ?? 1)
        : `${formatTicketNumber(first ?? 1)} al ${formatTicketNumber(last ?? count)}`;
    const textToCopy = `🎟️ RESPAWN CLUB - GTA VI LEGENDARY DROP\nOrden: ${orderCode}\nParticipante: ${payerName || "Participante"}\nBoletos: ${rangeText} (${count} boletos)\nSorteo: Enero-Febrero 2027 (al 60% de inventario)`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success(
        lang === "es"
          ? "¡Números copiados al portapapeles!"
          : lang === "pt"
          ? "Números copiados para a área de transferência!"
          : "Ticket numbers copied to clipboard!"
      );
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar automáticamente");
    }
  };

  const downloadTicketGraphic = () => {
    setIsDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 960;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas context not available");
      }

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 800, 960);
      bgGrad.addColorStop(0, "#0a0d14");
      bgGrad.addColorStop(0.5, "#101622");
      bgGrad.addColorStop(1, "#07090e");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 800, 960);

      // Cyber grid lines
      ctx.strokeStyle = "rgba(255, 51, 102, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= 800; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 960);
        ctx.stroke();
      }
      for (let y = 0; y <= 960; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }

      // Border glow
      ctx.strokeStyle = "#ff3366";
      ctx.lineWidth = 4;
      ctx.strokeRect(24, 24, 752, 912);

      // Inner subtle border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(32, 32, 736, 896);

      // Corner gaming accents
      ctx.fillStyle = "#ff3366";
      const cornerSize = 16;
      ctx.fillRect(20, 20, cornerSize, 6);
      ctx.fillRect(20, 20, 6, cornerSize);
      ctx.fillRect(780 - cornerSize, 20, cornerSize, 6);
      ctx.fillRect(774, 20, 6, cornerSize);
      ctx.fillRect(20, 934, cornerSize, 6);
      ctx.fillRect(20, 934 - cornerSize + 6, 6, cornerSize);
      ctx.fillRect(780 - cornerSize, 934, cornerSize, 6);
      ctx.fillRect(774, 934 - cornerSize + 6, 6, cornerSize);

      // Brand Title
      ctx.font = "bold 32px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("RESPAWN", 355, 95);
      ctx.fillStyle = "#ff3366";
      ctx.fillText("CLUB", 450, 95);

      // Subtitle
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = "#94a3b8";
      ctx.letterSpacing = "2px";
      ctx.fillText("COMPROBANTE OFICIAL DE PARTICIPACIÓN", 400, 125);

      // Campaign Card Box
      ctx.fillStyle = "rgba(255, 51, 102, 0.08)";
      ctx.fillRect(60, 155, 680, 110);
      ctx.strokeStyle = "rgba(255, 51, 102, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(60, 155, 680, 110);

      ctx.font = "bold 24px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("GTA VI LEGENDARY DROP", 400, 200);

      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#facc15";
      ctx.fillText("★ 1er Premio: PS5 Pro + GTA VI | 2do: GTA VI | 3ro: $50 Card ★", 400, 235);

      // Big Ticket Numbers Box
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(60, 290, 680, 210);
      ctx.strokeStyle = "rgba(0, 229, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 290, 680, 210);

      ctx.font = "bold 14px monospace";
      ctx.fillStyle = "#00e5ff";
      ctx.fillText("TUS NÚMEROS DE BOLETO ASIGNADOS", 400, 330);

      const rangeLabel =
        first === last
          ? formatTicketNumber(first ?? 1)
          : `${formatTicketNumber(first ?? 1)}  –  ${formatTicketNumber(last ?? count)}`;

      ctx.font = "bold 44px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(rangeLabel, 400, 395);

      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = "#ff3366";
      ctx.fillText(`TOTAL: ${count} ${count === 1 ? "BOLETO" : "BOLETOS"} OFICIALES`, 400, 445);

      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("Registrados permanentemente en blockchain / base de datos certificada", 400, 475);

      // Participant & Order Info Section
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(60, 525, 680, 260);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(60, 525, 680, 260);

      ctx.textAlign = "left";
      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("CÓDIGO DE ORDEN:", 90, 570);
      ctx.font = "bold 16px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(orderCode, 300, 570);

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("PARTICIPANTE:", 90, 615);
      ctx.font = "bold 15px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(payerName || "Invitado Registrado", 300, 615);

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("CORREO NOTIFICACIÓN:", 90, 660);
      ctx.font = "bold 15px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(payerEmail || "Registrado en pasarela de pago", 300, 660);

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("FECHA DE EMISIÓN:", 90, 705);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(new Date().toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" }), 300, 705);

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("SORTEO ESTIMADO:", 90, 750);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("Enero – Febrero 2027 (requiere 60% vendido)", 300, 750);

      // Footer disclaimer & verification
      ctx.textAlign = "center";
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("Guarda esta imagen como comprobante digital de tu participación.", 400, 830);
      ctx.fillText("Sorteo 100% público, aleatorio y certificado. Bases oficiales en respawnclub.com", 400, 855);

      ctx.font = "bold 11px monospace";
      ctx.fillStyle = "#475569";
      ctx.fillText(`HASH VERIFICADOR: RC-${orderCode}-${Date.now().toString(36).toUpperCase()}`, 400, 895);

      // Trigger download
      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Could not create image blob");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `comprobante-rifa-gta6-${orderCode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
        toast.success(
          lang === "es"
            ? "¡Comprobante guardado en tus descargas!"
            : lang === "pt"
            ? "Comprovante salvo nos seus downloads!"
            : "Ticket confirmation downloaded!"
        );
      }, "image/png");
    } catch (e) {
      console.error("Canvas export error:", e);
      setIsDownloading(false);
      toast.error("Hubo un error al generar la imagen. Puedes tomar una captura de pantalla.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh] border-signal/30 bg-background/95 p-6 backdrop-blur-xl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-signal/15 text-signal ring-8 ring-signal/10">
            <CheckCircle2 className="h-8 w-8 text-signal animate-in zoom-in" />
          </div>
          <DialogTitle className="font-display text-2xl font-bold tracking-tight">
            {lang === "es"
              ? "¡Compra confirmada con éxito!"
              : lang === "pt"
              ? "Compra confirmada com sucesso!"
              : "Purchase Confirmed!"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {lang === "es"
              ? "Tus boletos han sido asignados y registrados para el sorteo de GTA VI."
              : lang === "pt"
              ? "Seus bilhetes foram atribuídos e registrados para o sorteio do GTA VI."
              : "Your tickets have been registered for the GTA VI Legendary Drop."}
          </DialogDescription>
        </DialogHeader>

        {/* Digital Ticket Presentation */}
        <div className="relative mt-4 space-y-4 rounded-xl border border-border/80 bg-surface/70 p-5 shadow-2xl">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <p className="font-mono text-xs font-semibold text-signal uppercase tracking-wider">
                Respawn Club
              </p>
              <h4 className="font-display text-base font-bold text-foreground">
                GTA VI Legendary Drop
              </h4>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-md bg-signal/15 px-2.5 py-1 font-mono text-xs font-bold text-signal">
                {orderCode}
              </span>
            </div>
          </div>

          {/* Big Ticket Numbers Display */}
          <div className="rounded-lg border border-signal/30 bg-background/80 p-4 text-center">
            <p className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
              {lang === "es" ? "Tus números asignados" : "Your assigned numbers"}
            </p>
            <div className="mt-1 font-mono text-3xl font-extrabold tracking-tight text-foreground">
              {first === last
                ? formatTicketNumber(first ?? 1)
                : `${formatTicketNumber(first ?? 1)} – ${formatTicketNumber(last ?? count)}`}
            </div>
            <p className="mt-1 text-xs font-semibold text-signal">
              {count} {count === 1 ? (lang === "es" ? "boleto registrado" : "ticket registered") : (lang === "es" ? "boletos registrados" : "tickets registered")}
            </p>

            {/* Individual badges chips if count <= 50 */}
            {ticketNumbers.length > 1 && ticketNumbers.length <= 50 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-h-28 overflow-y-auto p-1">
                {ticketNumbers.map((num) => (
                  <span
                    key={num}
                    className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-foreground"
                  >
                    {formatTicketNumber(num)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Details summary */}
          <div className="space-y-2 text-xs text-muted-foreground pt-1">
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span>{lang === "es" ? "Participante" : "Participant"}:</span>
              <span className="font-semibold text-foreground">{payerName || "Invitado"}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span>{lang === "es" ? "Correo de confirmación" : "Confirmation email"}:</span>
              <span className="font-semibold text-foreground">{payerEmail || "Registrado en el pago"}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1.5">
              <span>{lang === "es" ? "Fecha del sorteo" : "Estimated draw"}:</span>
              <span className="font-semibold text-primary">Enero – Febrero 2027 (al 60% vendido)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 pt-1">
              <Mail className="h-3.5 w-3.5 text-signal shrink-0" />
              <span>
                {lang === "es"
                  ? "Te enviamos una copia a tu correo. Revisa también tu bandeja de spam."
                  : "A confirmation email was sent. Check your spam folder if needed."}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <Button
            type="button"
            className="flex-1 gap-2 bg-signal text-signal-foreground hover:bg-signal/90 font-semibold"
            onClick={downloadTicketGraphic}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4" />
            {isDownloading
              ? (lang === "es" ? "Generando comprobante..." : "Generating image...")
              : (lang === "es" ? "Guardar comprobante (PNG)" : "Save Ticket Image")}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
            onClick={copyNumbers}
          >
            {copied ? <Check className="h-4 w-4 text-signal" /> : <Copy className="h-4 w-4" />}
            {copied
              ? (lang === "es" ? "¡Copiados!" : "Copied!")
              : (lang === "es" ? "Copiar mis números" : "Copy numbers")}
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onOpenChange(false)}
        >
          {lang === "es" ? "Volver a la página principal" : "Back to homepage"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
