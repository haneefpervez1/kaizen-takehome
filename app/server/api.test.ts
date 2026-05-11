import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { API } from "./api";
import { DiscountKind } from "./discounts";

const ALL_FILTERS = () => {
  const opts = API.getFilterOptions();
  return {
    classifications: opts.classifications,
    makes: opts.makes,
  };
};

describe("API.searchVehicles", () => {
  test("returns empty array when end <= start", () => {
    const { classifications, makes } = ALL_FILTERS();
    const result = API.searchVehicles({
      startTime: "2030-03-10T10:00:00",
      endTime: "2030-03-10T09:00:00",
      passengerCount: 1,
      classifications,
      makes,
      priceMin: 0,
      priceMax: 1000,
    });
    assert.deepEqual(result.vehicles, []);
  });

  test("returns empty array when start equals end", () => {
    const { classifications, makes } = ALL_FILTERS();
    const result = API.searchVehicles({
      startTime: "2030-03-10T10:00:00",
      endTime: "2030-03-10T10:00:00",
      passengerCount: 1,
      classifications,
      makes,
      priceMin: 0,
      priceMax: 1000,
    });
    assert.deepEqual(result.vehicles, []);
  });

  test("returns empty array on invalid date format", () => {
    const { classifications, makes } = ALL_FILTERS();
    const result = API.searchVehicles({
      startTime: "not-a-date",
      endTime: "2030-03-11T10:00:00",
      passengerCount: 1,
      classifications,
      makes,
      priceMin: 0,
      priceMax: 1000,
    });
    assert.deepEqual(result.vehicles, []);
  });

  test("returns empty array when no vehicles match (passenger count too high)", () => {
    const { classifications, makes } = ALL_FILTERS();
    const result = API.searchVehicles({
      startTime: "2030-03-10T10:00:00",
      endTime: "2030-03-11T10:00:00",
      passengerCount: 100,
      classifications,
      makes,
      priceMin: 0,
      priceMax: 1000,
    });
    assert.deepEqual(result.vehicles, []);
  });

  test("returns empty array when classifications filter excludes all vehicles", () => {
    const { makes } = ALL_FILTERS();
    const result = API.searchVehicles({
      startTime: "2030-03-10T10:00:00",
      endTime: "2030-03-11T10:00:00",
      passengerCount: 1,
      classifications: [],
      makes,
      priceMin: 0,
      priceMax: 1000,
    });
    assert.deepEqual(result.vehicles, []);
  });

  test("returns vehicles with a priceBreakdown attached to each result", () => {
    const { classifications, makes } = ALL_FILTERS();
    const result = API.searchVehicles({
      startTime: "2030-03-10T10:00:00",
      endTime: "2030-03-11T10:00:00",
      passengerCount: 1,
      classifications,
      makes,
      priceMin: 0,
      priceMax: 1000,
    });
    assert.ok(result.vehicles.length > 0);
    for (const item of result.vehicles) {
      assert.ok(item.vehicle.id);
      assert.equal(typeof item.priceBreakdown.totalPriceCents, "number");
      assert.equal(typeof item.priceBreakdown.originalTotalCents, "number");
      assert.equal(typeof item.priceBreakdown.durationInHours, "number");
    }
  });

  test("price filter respects sticker rate, not discounted rate", () => {
    const { classifications, makes } = ALL_FILTERS();
    const result = API.searchVehicles({
      startTime: "2030-04-01T10:00:00",
      endTime: "2030-04-06T10:00:00",
      passengerCount: 1,
      classifications,
      makes,
      priceMin: 0,
      priceMax: 45,
    });
    for (const item of result.vehicles) {
      assert.ok(
        item.vehicle.hourly_rate_cents <= 4500,
        `vehicle ${item.vehicle.id} has rate ${item.vehicle.hourly_rate_cents} but priceMax was 45`,
      );
    }
  });

  test("returns priceBreakdown with the holiday discount applied when applicable", () => {
    const { classifications, makes } = ALL_FILTERS();
    const result = API.searchVehicles({
      startTime: "2030-01-20T10:00:00",
      endTime: "2030-01-22T10:00:00",
      passengerCount: 1,
      classifications,
      makes,
      priceMin: 0,
      priceMax: 1000,
    });
    assert.ok(result.vehicles.length > 0);
    for (const item of result.vehicles) {
      assert.ok(item.priceBreakdown.discount);
      assert.equal(item.priceBreakdown.discount.kind, DiscountKind.Holiday);
    }
  });
});

describe("API.getQuote", () => {
  test("returns a full PriceBreakdown for a valid request", () => {
    const result = API.getQuote({
      vehicleId: "1",
      startTime: "2030-03-10T10:00:00",
      endTime: "2030-03-11T10:00:00",
    });
    assert.equal(result.hourlyRateCents, 4500);
    assert.equal(result.durationInHours, 24);
    assert.equal(result.originalTotalCents, 4500 * 24);
    assert.equal(result.totalPriceCents, 4500 * 24);
    assert.equal(result.discount, null);
  });

  test("applies the holiday discount when the range qualifies", () => {
    const result = API.getQuote({
      vehicleId: "1",
      startTime: "2030-01-20T10:00:00",
      endTime: "2030-01-22T10:00:00",
    });
    assert.ok(result.discount);
    assert.equal(result.discount.kind, DiscountKind.Holiday);
    assert.ok(result.totalPriceCents < result.originalTotalCents);
  });

  test("throws when end <= start", () => {
    assert.throws(
      () =>
        API.getQuote({
          vehicleId: "1",
          startTime: "2030-03-10T10:00:00",
          endTime: "2030-03-10T09:00:00",
        }),
      /end_time must be after start_time/,
    );
  });

  test("throws on invalid date format", () => {
    assert.throws(
      () =>
        API.getQuote({
          vehicleId: "1",
          startTime: "not-a-date",
          endTime: "2030-03-11T10:00:00",
        }),
      /Invalid date format/,
    );
  });

  test("throws when vehicle not found", () => {
    assert.throws(
      () =>
        API.getQuote({
          vehicleId: "999999",
          startTime: "2030-03-10T10:00:00",
          endTime: "2030-03-11T10:00:00",
        }),
      /Vehicle not found/,
    );
  });
});

describe("API.getFilterOptions", () => {
  test("returns expected shape with positive maxHourlyRateDollars", () => {
    const result = API.getFilterOptions();
    assert.ok(Array.isArray(result.makes));
    assert.ok(Array.isArray(result.classifications));
    assert.ok(Array.isArray(result.passengerCounts));
    assert.equal(typeof result.maxHourlyRateDollars, "number");
    assert.ok(result.maxHourlyRateDollars > 0);
  });

  test("maxHourlyRateDollars is at least as large as the most expensive vehicle's rate", () => {
    const result = API.getFilterOptions();
    // The inventory has cars at $220/hr (22000 cents)
    assert.ok(result.maxHourlyRateDollars >= 220);
  });
});
