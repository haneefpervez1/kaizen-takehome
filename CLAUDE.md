# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is the Kaizen Labs SWE take-home (`tps-kaizenwheels`): a vehicle reservation app. The two scoped tasks live in `README.md`:

1. **Price filter bug** — users can't filter out cars above $125/hr; reasonable rates get hidden when they try.
2. **Discounts** — implement a holiday discount (17% off if the range includes but doesn't start/end on a holiday) and a multi-day discount ($10/hr off for >3 day reservations). They don't stack — pick whichever is cheaper for the customer. Must be reflected in search results AND the review/checkout page. Holiday list is in `README.md`.

The bonus prompt invites unsolicited UX improvements — note them but don't ship them unless asked.

## Commands

```
npm run dev      # next dev — local dev server
npm run build    # next build — production build
npm run start    # next start — serve the build
npm run ts       # tsc --noEmit — typecheck (this is the only "test" available)
```

No lint script, no test framework, no formatter config. `tsc --noEmit` is the only correctness gate. `tsconfig.json` has `"strict": false`, so TS will not catch as much as you'd expect — read carefully.

## Architecture

**Stack:** Next.js 16 (App Router), React 18, TypeScript, Tailwind, shadcn/ui (Radix primitives), react-hook-form, Luxon for dates in the "server" layer and date-fns in the UI layer.

**The "server" is fake.** `app/server/` exports an `API` object that client components import directly — there are no route handlers, no `fetch`, no network. The data lives in module-level constants:

- `app/server/data.ts` — `VEHICLES`, `RESERVATIONS`, `RESERVATIONS_BY_VEHICLE_ID`, plus `Vehicle` / `Reservation` / `Classification` types. Prices are stored as `hourly_rate_cents` (integer cents). Dates are Luxon `DateTime`.
- `app/server/data_helpers.ts` — `getAvailableVehicles` (filtering + availability), `getVehicleById`, `getReservationById`, `getVehicles`.
- `app/server/api.ts` — public surface: `API.searchVehicles`, `API.getFilterOptions`, `API.getVehicle`, `API.getReservation`, `API.getQuote`. This is what UI code calls.

Because the API is synchronous and in-process, **search/filter changes don't need state plumbing through fetch** — re-rendering with new form values is enough. Discounts should be computed in the server layer (alongside `calculateTotalPrice`) so both the search list and the review page get the same number from one source.

**UI layout:**

- `app/page.tsx` → `SearchPage`. `app/review/page.tsx` → `ReviewPage`. Those are the only two routes.
- `app/components/search/` — `SearchPage.tsx` owns the `react-hook-form` instance; `TimeRangeFilters`, `AdditionalFilters`, `VehicleList`, `VehicleListItem` consume it via `useFormContext`. Default form values include `price: [10, 100]` — this is a Slider with a hard upper bound of 100, which is at the core of the Part 1 bug (see `app/server/api.ts` around the `priceMax === 100 ? Number.MAX_SAFE_INTEGER : priceMax` line — the slider's max is a magic number that's also used as a sentinel for "no upper bound", which breaks the moment any real price exceeds $100/hr).
- `app/components/review/` — review/checkout page (`ReviewPage`, `VehicleDetails`).
- `app/components/shared/ui/` — generated shadcn components. Don't edit these unless you have to; treat them as vendor code.
- `app/components/shared/` — non-ui shared bits (`ErrorFallback`, `MiniPageLayout`).
- `app/lib/` — `formatters.tsx`, `times.ts`, `classnames.ts` (`cn` helper).

**Path alias:** `@/*` → `./app/*` (per `tsconfig.json`). Use it; existing imports do.

**Errors:** `API` methods `throw new Error("BAD REQUEST: ...")` / `"NOT_FOUND: ..."`. UI wraps consumers in `react-error-boundary` (`ErrorBoundary` + `ErrorFallback`). `searchVehicles` swallows errors and returns `{ vehicles: [] }` instead — be aware when debugging "no results".
