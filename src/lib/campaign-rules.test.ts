import { describe, expect, it } from "vitest";
import {
  canDrawFromSales,
  getCountdown,
  packageAvailability,
  percentSold,
  utcToZonedInput,
  zonedInputToUtc,
} from "./campaign-rules";

describe("campaign rules", () => {
  it("shows thousandths for 16 of 15,000 entries", () => {
    expect(percentSold(16, 15000)).toBe(0.106);
    expect(percentSold(1, 15000)).toBe(0.006);
  });

  it("requires 60% of inventory sold before drawing", () => {
    expect(canDrawFromSales(8999, 15000)).toBe(false);
    expect(canDrawFromSales(9000, 15000)).toBe(true);
    expect(canDrawFromSales(0, 0)).toBe(false);
  });
  it("shows 71% when 10,650 of 15,000 entries are sold", () => {
    expect(percentSold(10650, 15000)).toBe(71);
  });

  it("never rounds progress up to 100% before the last entry is gone", () => {
    expect(percentSold(14999, 15000)).toBe(99.993);
  });

  it("blocks a package larger than the remaining campaign inventory", () => {
    expect(packageAvailability(20, { campaignRemaining: 10, personalRemaining: 100 })).toEqual({
      available: false,
      reason: "campaign_inventory",
    });
  });

  it("blocks a package that would take an account past 100 entries", () => {
    expect(packageAvailability(50, { campaignRemaining: 15000, personalRemaining: 40 })).toEqual({
      available: false,
      reason: "personal_limit",
    });
  });

  it("allows a 100-entry package for a fresh account", () => {
    expect(packageAvailability(100, { campaignRemaining: 15000, personalRemaining: 100 }).available).toBe(true);
  });

  it("shows COMING SOON (no countdown) when no end date is set", () => {
    expect(getCountdown(null, Date.now())).toEqual({ state: "none" });
  });

  it("converts the configured end time using the campaign time zone", () => {
    // 23:59 in New York on Dec 24 2026 (EST, UTC-5) is 04:59 UTC on Dec 25.
    expect(zonedInputToUtc("2026-12-24T23:59", "America/New_York")?.toISOString()).toBe(
      "2026-12-25T04:59:00.000Z",
    );
    expect(utcToZonedInput("2026-12-25T04:59:00.000Z", "America/New_York")).toBe("2026-12-24T23:59");
  });
});
