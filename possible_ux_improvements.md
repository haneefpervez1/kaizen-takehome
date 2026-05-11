# Possible UX Improvements

Running list of UX nits / improvements noticed while working on the take-home. These are candidates for the README's bonus "other improvements" prompt — not committed work.

## Review page

### Confirm Reservation button is a no-op but looks active
**Where:** `app/components/review/ReviewPage.tsx:62-64,108`

The button uses the primary style and has no `disabled` attribute, so it looks fully active. Clicking it just logs `"Not implemented"` to the console — the user gets zero feedback and assumes the reservation went through. The `cursor-not-allowed` class is the only signal, and it only shows on hover.

**Options:**
- Add `disabled` and a tooltip explaining "checkout not implemented in this prototype."
- Or stub a confirmation modal / success state so the demo flow feels complete.

(Not in scope to actually implement reservation persistence — there's no `API.createReservation`.)

## Search page

### Price slider step size is too coarse to satisfy real budgets
**Where:** `app/components/search/AdditionalFilters.tsx:42`

The slider uses `step={10}`, so users can only pick prices in $10 increments. The first bug report from the README asks specifically about hiding results above **$125/hr** — a number that can't be selected on a $10-step slider even after the max-range fix. Anyone with a budget that isn't a round multiple of $10 (e.g., $75, $125, $185) has to round to a less convenient number.

**Options:**
- Drop the step to `$5` or `$1`.
- Replace the slider with two numeric inputs (min / max), which also gives keyboard users and screen-readers a cleaner affordance.
- Keep the slider but pair it with editable number inputs that sync with it.

### Price slider has no visible min/max endpoints
**Where:** `app/components/search/AdditionalFilters.tsx:38-46`

Only the currently selected `{min} to {max}` text is shown. Users dragging the slider don't see what range they're operating within — they have to drag to the ends and read the label to find out. Once the upper bound is data-driven, this matters even more (the max could be $220 today, $300 tomorrow, and the user has no idea without experimenting).

**Options:**
- Add static "$10" / "$max" labels under the slider's left/right ends.
- Or show the full range somewhere in the label, e.g. `$45 – $120 (of $10 – $220)`.

### Price slider has no quick presets
**Where:** `app/components/search/AdditionalFilters.tsx:38-46`

For budget shoppers, common ceilings ("under $50", "under $100") are more useful than fiddling with a slider. The current UI requires precise dragging to set common thresholds.

**Options:**
- Add 2-3 preset chips above the slider that snap the max to common values.

### "Book now" button width is not uniform across list items
**Where:** `app/components/search/VehicleListItem.tsx:56-89` (price/button column)

The price block and the "Book now" button share the same flex column on the right side of each card. Because the button uses `sm:w-auto`, its width is dictated by the widest sibling — which now includes discount badges like `"$10/hr off (long rental)"` or `"17% off at checkout (holiday)"`. Cards with a discount show a wider button than cards without one, so the search results look ragged.

**Options:**
- Give the button a fixed min-width (e.g. `min-w-[8rem]`) so it stays uniform regardless of discount text.
- Move the discount badge out of the price/button column and onto the card body (above the price block, or as a small ribbon at the top-left of the card).

### Discount badge is plain green text, not a real badge
**Where:** `app/components/search/VehicleListItem.tsx:67,84`

The discount indicator is currently a bare `<p>` with `text-green-700` — visually weak and easy to miss. It reads more like a footnote than a callout, and the same treatment is used for two distinct discounts (long rental, holiday).

**Options:**
- Use the shadcn Badge component (or a small pill with bg + border + padding) so the discount actually stands out.
- Color-code by discount kind (e.g. blue for long rental, amber for holiday) so users with multiple list items can scan at a glance.
- Add an icon (Lucide `Tag`, `Calendar`, etc.) prefix to make the badge feel more like a real callout.

### Search results don't show total cost for the selected date range
**Where:** `app/components/search/VehicleListItem.tsx:56-60`

List items show `$X/hr` only — no total for the user's selected start/end. The review page is the first time the user sees the actual cost. For long bookings (where the discount is most visible), the holiday discount specifically is a *percentage off total* — there's no clean way to express it as a /hr number, so we currently surface it as a badge ("17% off at checkout") and the user has to click through to see the dollar impact.

**Options:**
- Add a "Total: $X for Y days" line below the /hr. When a discount applies, show original total struck through next to the discounted total. This lets us drop the badge-only fallback for the holiday discount and give customers a clear pre-checkout number.
