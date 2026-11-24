/** Lightweight static background with zero CPU/GPU overhead. */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Hardware-accelerated static radial glow with no blurs or animations */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 75% 15%, oklch(0.5 0.22 296 / 35%) 0%, transparent 50%), radial-gradient(circle at 25% 85%, oklch(0.48 0.2 335 / 25%) 0%, transparent 50%)",
        }}
      />
      <div className="grid-noise absolute inset-0 opacity-30" />
    </div>
  );
}
