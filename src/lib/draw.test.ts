import { describe, expect, it } from "vitest";
import { pickWinners, secureRandomInt, type DrawEntry, type DrawPrize } from "./draw";

const prizes: DrawPrize[] = [
  { id: "p3", rank: 3, winner_count: 1 },
  { id: "p1", rank: 1, winner_count: 1 },
  { id: "p2", rank: 2, winner_count: 1 },
];
const mk = (n: number, user: string): DrawEntry => ({
  id: `e${n}`,
  entry_number: n,
  user_id: user,
});

describe("pickWinners", () => {
  it("draws one winner per prize, rank 1 first", () => {
    const entries = [mk(1, "a"), mk(2, "b"), mk(3, "c"), mk(4, "d")];
    const w = pickWinners(entries, prizes, () => 0);
    expect(w.map((x) => x.prize_rank)).toEqual([1, 2, 3]);
  });

  it("never gives two prizes to the same account", () => {
    const entries = [mk(1, "a"), mk(2, "a"), mk(3, "a"), mk(4, "b"), mk(5, "c")];
    for (let i = 0; i < 200; i++) {
      const w = pickWinners(entries, prizes);
      expect(new Set(w.map((x) => x.user_id)).size).toBe(w.length);
    }
  });

  it("returns fewer winners when there are not enough accounts", () => {
    const w = pickWinners([mk(1, "a"), mk(2, "b")], prizes, () => 0);
    expect(w).toHaveLength(2);
  });

  it("returns nothing for an empty pool", () => {
    expect(pickWinners([], prizes)).toEqual([]);
  });

  it("only picks from the provided entries", () => {
    const entries = [mk(10, "a"), mk(11, "b"), mk(12, "c")];
    const w = pickWinners(entries, prizes);
    for (const x of w) expect([10, 11, 12]).toContain(x.entry_number);
  });
});

describe("secureRandomInt", () => {
  it("stays within range and covers all values", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const n = secureRandomInt(5);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(5);
      seen.add(n);
    }
    expect(seen.size).toBe(5);
  });
  it("rejects invalid max", () => {
    expect(() => secureRandomInt(0)).toThrow();
  });
});
