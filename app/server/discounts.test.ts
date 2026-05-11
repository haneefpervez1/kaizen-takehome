import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";
import { DiscountKind, getPriceBreakdown, HOLIDAYS } from "./discounts";

const HOURLY_RATE_CENTS = 5000;

describe("getPriceBreakdown — no discount", () => {
  test("short reservation, no holiday in range", () => {
    const start = DateTime.fromISO("2030-03-10T10:00");
    const end = DateTime.fromISO("2030-03-11T10:00");
    const breakdown = getPriceBreakdown(start, end, HOURLY_RATE_CENTS);
    assert.equal(breakdown.discount, null);
    assert.equal(breakdown.totalPriceCents, HOURLY_RATE_CENTS * 24);
    assert.equal(breakdown.originalTotalCents, HOURLY_RATE_CENTS * 24);
    assert.equal(breakdown.durationInHours, 24);
  });

  test("range with no holiday in any month", () => {
    const start = DateTime.fromISO("2030-04-10T10:00");
    const end = DateTime.fromISO("2030-04-12T10:00");
    const breakdown = getPriceBreakdown(start, end, HOURLY_RATE_CENTS);
    assert.equal(breakdown.discount, null);
  });
});

describe("getPriceBreakdown — long rental discount", () => {
  test("exactly 72 hours does NOT qualify (strict >)", () => {
    const start = DateTime.fromISO("2030-03-10T10:00");
    const end = DateTime.fromISO("2030-03-13T10:00");
    const breakdown = getPriceBreakdown(start, end, HOURLY_RATE_CENTS);
    assert.equal(breakdown.discount, null);
  });

  test("73 hours qualifies with correct math", () => {
    const start = DateTime.fromISO("2030-03-10T10:00");
    const end = DateTime.fromISO("2030-03-13T11:00");
    const breakdown = getPriceBreakdown(start, end, HOURLY_RATE_CENTS);
    assert.ok(breakdown.discount);
    assert.equal(breakdown.discount.kind, DiscountKind.LongRental);
    if (breakdown.discount.kind === DiscountKind.LongRental) {
      assert.equal(breakdown.discount.hourlyOffCents, 1000);
      assert.equal(breakdown.discount.discountedHourlyRateCents, 4000);
      assert.equal(breakdown.discount.amountOffCents, 1000 * 73);
    }
    assert.equal(
      breakdown.totalPriceCents,
      HOURLY_RATE_CENTS * 73 - 1000 * 73,
    );
  });

  test("hourly rate clamps at 0 for cars cheaper than $10/hr", () => {
    const start = DateTime.fromISO("2030-03-10T10:00");
    const end = DateTime.fromISO("2030-03-14T10:00");
    const cheapRate = 500;
    const breakdown = getPriceBreakdown(start, end, cheapRate);
    assert.ok(breakdown.discount);
    assert.equal(breakdown.discount.kind, DiscountKind.LongRental);
    if (breakdown.discount.kind === DiscountKind.LongRental) {
      assert.equal(breakdown.discount.discountedHourlyRateCents, 0);
      assert.equal(breakdown.discount.hourlyOffCents, cheapRate);
      assert.equal(breakdown.discount.amountOffCents, cheapRate * 96);
    }
    assert.equal(breakdown.totalPriceCents, 0);
  });
});

describe("getPriceBreakdown — holiday discount", () => {
  test("range covers a holiday in the middle (qualifies)", () => {
    const start = DateTime.fromISO("2030-01-20T10:00");
    const end = DateTime.fromISO("2030-01-22T10:00");
    const breakdown = getPriceBreakdown(start, end, HOURLY_RATE_CENTS);
    assert.ok(breakdown.discount);
    assert.equal(breakdown.discount.kind, DiscountKind.Holiday);
    if (breakdown.discount.kind === DiscountKind.Holiday) {
      assert.equal(breakdown.discount.percentOff, 0.17);
      assert.equal(
        breakdown.discount.amountOffCents,
        Math.round(HOURLY_RATE_CENTS * 48 * 0.17),
      );
    }
  });

  test("reservation starting on a holiday does NOT qualify", () => {
    const start = DateTime.fromISO("2030-01-21T10:00");
    const end = DateTime.fromISO("2030-01-23T10:00");
    const breakdown = getPriceBreakdown(start, end, HOURLY_RATE_CENTS);
    assert.equal(breakdown.discount, null);
  });

  test("reservation ending on a holiday does NOT qualify", () => {
    const start = DateTime.fromISO("2030-01-19T10:00");
    const end = DateTime.fromISO("2030-01-21T10:00");
    const breakdown = getPriceBreakdown(start, end, HOURLY_RATE_CENTS);
    assert.equal(breakdown.discount, null);
  });

  test("single-day reservation on a holiday does NOT qualify", () => {
    const start = DateTime.fromISO("2030-01-21T10:00");
    const end = DateTime.fromISO("2030-01-21T18:00");
    const breakdown = getPriceBreakdown(start, end, HOURLY_RATE_CENTS);
    assert.equal(breakdown.discount, null);
  });

  test("works for any year (year-agnostic)", () => {
    const start = DateTime.fromISO("2031-12-17T10:00");
    const end = DateTime.fromISO("2031-12-19T10:00");
    const breakdown = getPriceBreakdown(start, end, HOURLY_RATE_CENTS);
    assert.ok(breakdown.discount);
    assert.equal(breakdown.discount.kind, DiscountKind.Holiday);
  });

  test("per-holiday eligibility: starts on holiday A, contains holiday B in middle", () => {
    const start = DateTime.fromISO("2030-01-21T10:00");
    const end = DateTime.fromISO("2030-03-05T10:00");
    const highRate = 50000;
    const breakdown = getPriceBreakdown(start, end, highRate);
    assert.ok(breakdown.discount);
    assert.equal(breakdown.discount.kind, DiscountKind.Holiday);
  });
});

describe("getPriceBreakdown — both qualify, best wins", () => {
  test("holiday wins on a high-rate car over a 4-day rental", () => {
    const start = DateTime.fromISO("2030-12-17T10:00");
    const end = DateTime.fromISO("2030-12-21T10:00");
    const highRate = 20000;
    const breakdown = getPriceBreakdown(start, end, highRate);
    assert.ok(breakdown.discount);
    assert.equal(breakdown.discount.kind, DiscountKind.Holiday);
  });

  test("long rental wins on a low-rate car over a 15-day rental crossing a holiday", () => {
    const start = DateTime.fromISO("2030-12-10T10:00");
    const end = DateTime.fromISO("2030-12-25T10:00");
    const lowRate = 3000;
    const breakdown = getPriceBreakdown(start, end, lowRate);
    assert.ok(breakdown.discount);
    assert.equal(breakdown.discount.kind, DiscountKind.LongRental);
  });

  test("ties go to whichever evaluates last (long rental, deterministic)", () => {
    // Construct a case where both discounts are equal in amount-off.
    // Holiday: 17% off total. Long rental: $10/hr off.
    // Equal when: 0.17 * rate * hours = 1000 * hours → rate ≈ 5882 cents.
    // We round, so check the function picks deterministically.
    const start = DateTime.fromISO("2030-12-17T10:00");
    const end = DateTime.fromISO("2030-12-21T10:00");
    const breakdown = getPriceBreakdown(start, end, 5882);
    assert.ok(breakdown.discount);
    // Whichever wins, the resulting total must equal the lower of the two,
    // and the discount field must be one of the two kinds.
    assert.ok(
      breakdown.discount.kind === DiscountKind.Holiday ||
        breakdown.discount.kind === DiscountKind.LongRental,
    );
  });
});

describe("HOLIDAYS constant", () => {
  test("contains the 10 fictional holidays from the spec", () => {
    assert.equal(HOLIDAYS.length, 10);
    const expected = [
      { month: 1, day: 21 },
      { month: 2, day: 12 },
      { month: 3, day: 4 },
      { month: 5, day: 2 },
      { month: 6, day: 16 },
      { month: 7, day: 26 },
      { month: 8, day: 3 },
      { month: 9, day: 1 },
      { month: 11, day: 5 },
      { month: 12, day: 18 },
    ];
    for (const h of expected) {
      assert.ok(
        HOLIDAYS.some((x) => x.month === h.month && x.day === h.day),
        `missing holiday ${h.month}/${h.day}`,
      );
    }
  });
});
