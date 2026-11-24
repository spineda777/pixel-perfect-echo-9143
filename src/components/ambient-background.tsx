/** Slow-moving light blobs + floating sparks behind the page. Pure CSS, no JS per frame. */
const SPARKS = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 53 + 7) % 100}%`,
  size: 2 + (i % 3),
  delay: `${(i % 9) * 0.7}s`,
  duration: `${5 + (i % 6)}s`,
}));

export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="ambient-blob" style={{ left: "-10%", top: "-10%", height: "55vmax", width: "55vmax", background: "oklch(0.5 0.24 296 / 40%)", animation: "drift-a 22s ease-in-out infinite" }} />
      <div className="ambient-blob" style={{ right: "-15%", top: "20%", height: "50vmax", width: "50vmax", background: "oklch(0.55 0.25 335 / 30%)", animation: "drift-b 28s ease-in-out infinite" }} />
      <div className="ambient-blob" style={{ left: "20%", bottom: "-20%", height: "45vmax", width: "45vmax", background: "oklch(0.45 0.2 265 / 35%)", animation: "drift-c 32s ease-in-out infinite" }} />
      <div className="grid-noise absolute inset-0 opacity-60" />
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: s.left, top: s.top, height: s.size, width: s.size, animation: `twinkle ${s.duration} ease-in-out ${s.delay} infinite` }}
        />
      ))}
    </div>
  );
}
