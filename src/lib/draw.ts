/** Pure, testable winner-selection logic. Randomness is injected so tests are deterministic. */

export type DrawEntry = {
  id: string;
  entry_number: number;
  /** Account id, or null for guest purchases. */
  user_id: string | null;
  order_id?: string | null;
  /** Who counts as the same person: account id, or the buyer's email for guests. One prize per identity. */
  identity: string;
};
export type DrawPrize = { id: string; rank: number; winner_count: number };
export type DrawWinner = {
  prize_id: string;
  prize_rank: number;
  entry_id: string;
  entry_number: number;
  user_id: string | null;
  order_id: string | null;
  identity: string;
};

/** Unbiased random integer in [0, max) using rejection sampling over crypto randomness. */
export function secureRandomInt(max: number): number {
  if (!Number.isInteger(max) || max < 1) throw new Error("max must be a positive integer");
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0]! >= limit);
  return buf[0]! % max;
}

/**
 * Picks winners prize by prize (rank 1 first). Every valid entry has the same chance,
 * and one account can win at most one prize. Returns fewer winners only if there are
 * not enough distinct accounts.
 */
export function pickWinners(
  entries: DrawEntry[],
  prizes: DrawPrize[],
  randomInt: (maxExclusive: number) => number = secureRandomInt,
): DrawWinner[] {
  const winners: DrawWinner[] = [];
  const won = new Set<string>();
  for (const prize of [...prizes].sort((a, b) => a.rank - b.rank)) {
    for (let i = 0; i < prize.winner_count; i++) {
      const candidates = entries.filter((e) => !won.has(e.identity));
      if (candidates.length === 0) return winners;
      const pick = candidates[randomInt(candidates.length)]!;
      won.add(pick.identity);
      winners.push({
        prize_id: prize.id,
        prize_rank: prize.rank,
        entry_id: pick.id,
        entry_number: pick.entry_number,
        user_id: pick.user_id,
        order_id: pick.order_id ?? null,
        identity: pick.identity,
      });
    }
  }
  return winners;
}

/** Orders created by the admin test simulation carry this capture id; their entries never take part in the draw. */
export const TEST_ORDER_MARKER = "DEMO_SIMULATION";

export function isTestEntry(entry: {
  orders?: { paypal_capture_id: string | null } | null;
}): boolean {
  return entry.orders?.paypal_capture_id === TEST_ORDER_MARKER;
}

/** Identity used for the "one prize per person" rule: account id, else the guest's email, else the order. */
export function entryIdentity(e: {
  user_id: string | null;
  order_id?: string | null;
  orders?: { payer_email?: string | null } | null;
  id: string;
}): string {
  if (e.user_id) return `user:${e.user_id}`;
  const email = e.orders?.payer_email?.trim().toLowerCase();
  if (email) return `guest:${email}`;
  return `order:${e.order_id ?? e.id}`;
}
