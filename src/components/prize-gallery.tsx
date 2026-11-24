import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { useI18n } from "@/lib/i18n";

const PHOTOS = [1, 2, 3, 4, 5].map((n) => `/gallery/prize-photo-${n}.jpg`);
const AUTOPLAY_MS = 4500;

/** Swipeable photo carousel of the prizes, with dots, autoplay (paused on hover/touch) and a full-size viewer. */
export function PrizeGallery() {
  const { t } = useI18n();
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState<number | null>(null);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || paused || zoom !== null) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [api, paused, zoom]);

  const go = useCallback((i: number) => api?.scrollTo(i), [api]);

  return (
    <section id="gallery" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
      <p className="eyebrow">{t("gallery_eyebrow")}</p>
      <h2 className="mt-2 text-4xl md:text-5xl">{t("gallery_title")}</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t("gallery_sub")}</p>

      <div
        className="relative mt-8"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => window.setTimeout(() => setPaused(false), 6000)}
      >
        <Carousel setApi={setApi} opts={{ loop: true, align: "center" }} className="w-full">
          <CarouselContent className="-ml-4">
            {PHOTOS.map((src, i) => (
              <CarouselItem key={src} className="basis-[82%] pl-4 sm:basis-1/2 lg:basis-1/3">
                <button
                  type="button"
                  onClick={() => setZoom(i)}
                  aria-label={`${t("gallery_alt")} ${i + 1} / ${PHOTOS.length}`}
                  className={`group relative block w-full overflow-hidden rounded-2xl border bg-card-gradient shadow-card transition duration-500 ${
                    i === selected ? "border-primary/60 shadow-glow" : "border-white/10 opacity-80"
                  }`}
                >
                  <img
                    src={src}
                    alt={`${t("gallery_alt")} ${i + 1}`}
                    width={1280}
                    height={1589}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="btn-glass -left-2 hidden h-11 w-11 sm:inline-flex md:-left-5" />
          <CarouselNext className="btn-glass -right-2 hidden h-11 w-11 sm:inline-flex md:-right-5" />
        </Carousel>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2" role="tablist" aria-label={t("gallery_title")}>
        {PHOTOS.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === selected}
            aria-label={`${t("gallery_alt")} ${i + 1}`}
            onClick={() => go(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === selected ? "w-8 bg-primary" : "w-2 bg-white/30 hover:bg-white/60"}`}
          />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">{t("gallery_caption")}</p>

      <Dialog open={zoom !== null} onOpenChange={(o) => { if (!o) setZoom(null); }}>
        <DialogContent className="max-h-[94vh] w-[calc(100%-1.5rem)] max-w-3xl gap-0 overflow-hidden border-white/10 bg-black p-0">
          <DialogTitle className="sr-only">{t("gallery_title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("gallery_caption")}</DialogDescription>
          {zoom !== null && (
            <img src={PHOTOS[zoom]} alt={`${t("gallery_alt")} ${zoom + 1}`} className="mx-auto max-h-[88vh] w-auto object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
