import { formatCents } from "@/lib/formatters";
import { Vehicle } from "@/server/data";
import { DiscountKind, PriceBreakdown } from "@/server/discounts";
import { useBase64Image } from "@/util/useBase64Image";
import Link from "next/link";
import { Button } from "@/components/shared/ui/button";
import { Card, CardTitle } from "@/components/shared/ui/card";

export function VehicleListItem({
  vehicle,
  priceBreakdown,
  startDateTime,
  endDateTime,
}: {
  vehicle: Vehicle;
  priceBreakdown: PriceBreakdown;
  startDateTime: Date;
  endDateTime: Date;
}) {
  const bookNowParams = new URLSearchParams({
    id: vehicle.id,
    start: startDateTime.toISOString(),
    end: endDateTime.toISOString(),
  });

  const imgData = useBase64Image(vehicle.thumbnail_url);

  return (
    <Card
      key={vehicle.id}
      className="flex flex-col md:flex-row gap-6 md:gap-8 px-4 md:px-6 py-6"
    >
      <div className="max-w-[8rem] flex items-center mx-auto md:mx-0">
        <img src={imgData} alt={vehicle.make} className="w-full" />
      </div>
      <div className="w-full flex flex-col justify-center gap-2 lg:gap-4">
        <CardTitle className="text-lg font-semibold text-center md:text-left">
          {vehicle.make} {vehicle.model}
        </CardTitle>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-center md:text-left">
          <div className="flex flex-col">
            <dt className="text-sm text-gray-600">Year</dt>
            <dd className="text-sm font-medium">{vehicle.year}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm text-gray-600">Class</dt>
            <dd className="text-sm font-medium">{vehicle.classification}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm text-gray-600">Passengers</dt>
            <dd className="text-sm font-medium">{vehicle.max_passengers}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-sm text-gray-600">Doors</dt>
            <dd className="text-sm font-medium">{vehicle.doors}</dd>
          </div>
        </dl>
      </div>
      <div className="md:ml-auto text-center md:text-right flex flex-col justify-center mt-4 md:mt-0">
        {priceBreakdown.discount?.kind === DiscountKind.LongRental ? (
          <>
            <p className="text-xl font-bold">
              {formatCents(priceBreakdown.discount.discountedHourlyRateCents)}
              <span className="text-sm text-gray-700 font-normal ml-0.5">/hr</span>
            </p>
            <p className="text-sm text-gray-500 line-through">
              {formatCents(vehicle.hourly_rate_cents)}/hr
            </p>
            <p className="text-xs text-green-700 font-medium mt-1">
              {formatCents(priceBreakdown.discount.hourlyOffCents)}/hr off (long rental)
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold">
              {formatCents(vehicle.hourly_rate_cents)}
              <span className="text-sm text-gray-700 font-normal ml-0.5">/hr</span>
            </p>
            {priceBreakdown.discount?.kind === DiscountKind.Holiday && (
              <p className="text-xs text-green-700 font-medium mt-1">
                17% off at checkout (holiday)
              </p>
            )}
          </>
        )}
        <Button asChild className="mt-2 w-full sm:w-auto">
          <Link href={`/review?${bookNowParams.toString()}`}>
            Book now
          </Link>
        </Button>
      </div>
    </Card>
  );
}
