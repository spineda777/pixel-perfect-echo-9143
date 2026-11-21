/** Pure campaign rules shared by the page and admin. The database enforces the same limits. */

export const HARD_MAX_INVENTORY = 15000;
export const HARD_MAX_PER_USER = 100;

export function percentSold(sold: number, total: number): number {
  if (!Number.isFinite(sold) || !Number.isFinite(total) || total <= 0) return 0;
  // Floor so the bar never overstates sales.
  return Math.min(100, Math.max(0, Math.floor((sold / total) * 100)));
}

export type PackageBlockReason = "campaign_inventory" | "personal_limit" | null;

export function packageAvailability(
  entries: number,
  limits: { campaignRemaining: number; personalRemaining: number },
): { available: boolean; reason: PackageBlockReason } {
  if (entries > limits.campaignRemaining) return { available: false, reason: "campaign_inventory" };
  if (entries > limits.personalRemaining) return { available: false, reason: "personal_limit" };
  return { available: true, reason: null };
}

export function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(
    cents / 100,
  );
}

export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function tzOffsetMs(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-12-24T23:59" in `tz` → UTC Date. */
export function zonedInputToUtc(local: string, tz: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m || !isValidTimeZone(tz)) return null;
  const [, y, mo, d, h, mi] = m;
  const asUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  const first = tzOffsetMs(new Date(asUtc), tz);
  let result = asUtc - first;
  const second = tzOffsetMs(new Date(result), tz);
  if (second !== first) result = asUtc - second;
  return new Date(result);
}

/** UTC ISO → "yyyy-MM-ddTHH:mm" wall time in `tz` (for datetime-local inputs). */
export function utcToZonedInput(iso: string | null, tz: string): string {
  if (!iso || !isValidTimeZone(tz)) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() + tzOffsetMs(date, tz));
  return shifted.toISOString().slice(0, 16);
}

export type Countdown =
  | { state: "none" }
  | { state: "ended" }
  | { state: "running"; days: number; hours: number; minutes: number; seconds: number };

export function getCountdown(endsAt: string | null, now: number): Countdown {
  if (!endsAt) return { state: "none" };
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return { state: "none" };
  const diff = end - now;
  if (diff <= 0) return { state: "ended" };
  const s = Math.floor(diff / 1000);
  return {
    state: "running",
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}
