import { DateTime } from "luxon";

export const HOLIDAYS: ReadonlyArray<{ month: number; day: number }> = [
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

const LONG_RENTAL_THRESHOLD_HOURS = 72;
const LONG_RENTAL_DISCOUNT_PER_HOUR_CENTS = 1000;
const HOLIDAY_DISCOUNT_FRACTION = 0.17;

export type Discount =
  | {
      kind: "holiday";
      percentOff: number;
      amountOffCents: number;
    }
  | {
      kind: "long_rental";
      hourlyOffCents: number;
      discountedHourlyRateCents: number;
      amountOffCents: number;
    };

export interface PriceBreakdown {
  hourlyRateCents: number;
  durationInHours: number;
  originalTotalCents: number;
  totalPriceCents: number;
  discount: Discount | null;
}

function isHoliday(date: DateTime): boolean {
  return HOLIDAYS.some(
    (h) => h.month === date.month && h.day === date.day,
  );
}

function reservationQualifiesForHolidayDiscount(
  start: DateTime,
  end: DateTime,
): boolean {
  const startDate = start.startOf("day");
  const endDate = end.startOf("day");

  for (
    let cursor = startDate.plus({ days: 1 });
    cursor < endDate;
    cursor = cursor.plus({ days: 1 })
  ) {
    if (isHoliday(cursor)) {
      return true;
    }
  }
  return false;
}

function getHolidayDiscount(
  start: DateTime,
  end: DateTime,
  originalTotalCents: number,
): Discount | null {
  if (!reservationQualifiesForHolidayDiscount(start, end)) {
    return null;
  }
  const amountOffCents = Math.round(
    originalTotalCents * HOLIDAY_DISCOUNT_FRACTION,
  );
  return {
    kind: "holiday",
    percentOff: HOLIDAY_DISCOUNT_FRACTION,
    amountOffCents,
  };
}

function getLongRentalDiscount(
  durationInHours: number,
  hourlyRateCents: number,
): Discount | null {
  if (durationInHours <= LONG_RENTAL_THRESHOLD_HOURS) {
    return null;
  }
  const discountedHourlyRateCents = Math.max(
    0,
    hourlyRateCents - LONG_RENTAL_DISCOUNT_PER_HOUR_CENTS,
  );
  const amountOffCents =
    (hourlyRateCents - discountedHourlyRateCents) * durationInHours;
  return {
    kind: "long_rental",
    hourlyOffCents: hourlyRateCents - discountedHourlyRateCents,
    discountedHourlyRateCents,
    amountOffCents,
  };
}

export function getPriceBreakdown(
  start: DateTime,
  end: DateTime,
  hourlyRateCents: number,
): PriceBreakdown {
  const durationInHours = end.diff(start, "hours").hours || 0;
  const originalTotalCents = hourlyRateCents * durationInHours;

  const candidates = [
    getHolidayDiscount(start, end, originalTotalCents),
    getLongRentalDiscount(durationInHours, hourlyRateCents),
  ].filter((d): d is Discount => d !== null);

  const bestDiscount =
    candidates.length === 0
      ? null
      : candidates.reduce((best, d) =>
          d.amountOffCents > best.amountOffCents ? d : best,
        );

  const totalPriceCents =
    originalTotalCents - (bestDiscount?.amountOffCents ?? 0);

  return {
    hourlyRateCents,
    durationInHours,
    originalTotalCents,
    totalPriceCents,
    discount: bestDiscount,
  };
}
