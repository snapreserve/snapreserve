# SnapReserve™ — Private Stay Booking QA Checklist & Test Plan

**Version:** 1.0
**App stack:** Next.js 14 App Router · Supabase · Stripe
**Scope:** Private Stay (entire_home, private_room, cabin, beachfront, farm_ranch, unique_stay)
**Critical note:** Hotel/room-type paths are out of scope here (covered separately).

---

## ⚠️ Known Critical Gap (must fix before launch)

> **`/api/checkout` has no overlapping-booking check.**
> Two guests can both create a `pending` booking for the same dates. The first to complete payment wins, but the second also gets a confirmed booking with no units to occupy.
> Fix: Query `bookings` for any confirmed/pending bookings that overlap the requested range before creating the PaymentIntent.
> See **TC-AVAIL-01** and the patched route at the end of this document.

---

## Section 1 — Booking Flow

### TC-BF-01 — Happy path: search → confirm → payment

**Preconditions**
- Logged-in guest account (no `is_team_member`, no suspension)
- Active, approved listing in New York (`is_active=true`, `status=approved`)
- Listing: $200/night, $50 cleaning fee, max 4 guests
- No existing bookings on requested dates

**Steps**
1. Go to `/listings` and search New York
2. Click a listing card → verify `/listings/[id]` loads with gallery, host info, price
3. In the booking sidebar, set check-in = **tomorrow**, checkout = **today + 4 days**, guests = **2**
4. Price breakdown shows: `$200 × 3 nights = $600`, `Cleaning fee: $50`, `Total: $650`
5. Click **Reserve now →** — verify redirect to `/booking?listing=&checkin=&checkout=&guests=2`
6. On `/booking`, verify summary card shows listing title, city, dates, guest count, breakdown matching sidebar
7. Click **Confirm & pay $650**
8. Stripe payment form loads (PaymentElement)
9. Enter test card `4242 4242 4242 4242`, exp any future, CVC any
10. Click **Pay $650**
11. Stripe redirects to `/booking/confirmation?id=[bookingId]`

**Expected results**
- Booking row exists in `bookings` with `status=confirmed`, `payment_status=paid`
- `total_amount = 650.00`
- `platform_fee = 45.50` (7% of 650), `platform_fixed_fee = 1.00`
- `reference` field set (format `SR` + base-36 timestamp)
- Stripe PaymentIntent in `succeeded` state
- Guest sees confirmation page with booking reference

---

### TC-BF-02 — Unauthenticated guest redirected at checkout

**Preconditions:** Not logged in

**Steps**
1. Navigate directly to `/booking?listing=[valid_id]&checkin=2026-04-01&checkout=2026-04-04&guests=1`
2. Click **Confirm & pay**

**Expected result:** POST to `/api/checkout` returns `401`, page redirects to `/login?next=/booking?...`

---

### TC-BF-03 — Listing not found

**Steps**
1. Navigate to `/listings/00000000-0000-0000-0000-000000000000`

**Expected result:** "Property not found" message rendered (not a crash)

---

### TC-BF-04 — Listing is inactive/suspended

**Preconditions:** Listing with `is_active=false` OR `status=suspended`

**Steps**
1. POST to `/api/checkout` with that listing's id

**Expected result:**
- `is_active=false` → `400 "This listing is no longer available."`
- `status=suspended` → `400 "This listing is temporarily unavailable."`

---

### TC-BF-05 — Back navigation during payment

**Steps**
1. Reach payment step (Stripe form loaded, PaymentIntent created, `pending` booking exists)
2. Click browser back button
3. Navigate back to `/booking?listing=...` and click Confirm & pay again

**Expected result:**
- A second PaymentIntent is created; a second `pending` booking row is inserted
- The original `pending` booking remains but is orphaned (no duplicate charge until card is entered)
- Verify: only one booking should eventually get confirmed; the other stays `pending` forever (acceptable — Stripe auto-cancels unpaid PIs after 24h)
- **Better UX fix (future):** Detect existing pending booking for same guest+dates and reuse the PI

---

### TC-BF-06 — Team member account cannot book as guest

**Preconditions:** User with `is_team_member=true`

**Steps**
1. Log in as team member account
2. Attempt to POST `/api/checkout`

**Expected result:** `403 "Team member accounts are for hosting only..."`

---

### TC-BF-07 — Rate limit enforcement (10 checkouts/hour)

**Steps**
1. Fire 11 POST requests to `/api/checkout` from the same user within 1 hour (use script or devtools)

**Expected result:** First 10 succeed (or fail for date/availability reasons); 11th returns `429 Too Many Requests`

---

## Section 2 — Availability Validation

> **All TC-AVAIL tests require the overlap fix to be deployed first.**

### TC-AVAIL-01 — Exact date overlap blocked ⚠️ CRITICAL

**Preconditions**
- Listing L1 has confirmed booking: `check_in=2026-05-01`, `check_out=2026-05-05`

**Steps**
1. Attempt to book same listing: `check_in=2026-05-03`, `check_out=2026-05-07`

**Expected result:** `400 "These dates are already booked. Please choose different dates."`

---

### TC-AVAIL-02 — Adjacent bookings (same-day turnover) allowed

**Preconditions**
- Existing confirmed booking: `check_in=2026-05-01`, `check_out=2026-05-05`

**Steps**
1. Attempt to book: `check_in=2026-05-05`, `check_out=2026-05-08` (new check-in = old check-out)

**Expected result:** Booking succeeds — check-out day is a departure, not an occupied night.
Overlap SQL logic: `check_in < existing.check_out AND check_out > existing.check_in` (exclusive bounds)

---

### TC-AVAIL-03 — Encompassing dates blocked

**Preconditions**
- Existing confirmed booking: `check_in=2026-05-05`, `check_out=2026-05-07`

**Steps**
1. Attempt to book: `check_in=2026-05-03`, `check_out=2026-05-10` (surrounds existing)

**Expected result:** `400` — overlap detected

---

### TC-AVAIL-04 — Race condition: simultaneous checkout attempts

**Preconditions:** Listing with zero bookings

**Steps**
1. Open two browser tabs (Guest A and Guest B, both logged in as different accounts)
2. Both reach the payment page for the same listing + dates at the same time
3. Both submit payment within seconds of each other

**Expected result:**
- The overlap check runs before PaymentIntent creation
- At least one request is blocked with `400 "These dates are already booked"` before a PI is created
- Database constraint or row-level lock prevents double-booking
- **If overlap check passes for both (race window):** PI is created, payment goes through — this is the gap the DB-level constraint or serialized check should close

**Implementation note:** Supabase doesn't support `SELECT FOR UPDATE` via PostgREST; the overlap check should use a DB function with a serializable transaction for full safety.

---

### TC-AVAIL-05 — Cancelled booking frees up dates

**Preconditions**
- Booking B1 for dates 2026-06-01→2026-06-05, `status=cancelled`

**Steps**
1. Attempt to book same listing + same dates

**Expected result:** Booking succeeds — cancelled bookings are excluded from the overlap check
SQL filter: `status NOT IN ('cancelled', 'refunded')`

---

### TC-AVAIL-06 — Past check-in date rejected

**Steps**
1. POST to `/api/checkout` with `check_in=2025-01-01`, `check_out=2025-01-05`

**Expected result:** `400 "Check-in date must be today or in the future."`

---

### TC-AVAIL-07 — Same-day check-in/check-out rejected

**Steps**
1. POST to `/api/checkout` with `check_in=check_out=2026-05-01`

**Expected result:** `400 "Check-out must be after check-in."` (nights = 0)

---

### TC-AVAIL-08 — Minimum stay enforcement

**Preconditions:** Listing with `min_nights=3`

**Steps**
1. Attempt to book 2 nights

**Expected result:** Booking is blocked. The sidebar should gray out check-out dates less than `min_nights` away. API should validate: if `nights < listing.min_nights` → `400 "Minimum stay is X nights."`
**Current state:** `min_nights` is displayed in the listing UI but NOT validated in `/api/checkout`. Mark as bug.

---

### TC-AVAIL-09 — Maximum stay (365 nights) enforced

**Steps**
1. POST with 366 nights

**Expected result:** `400 "Maximum stay is 365 nights."`

---

## Section 3 — Pricing Validation

### TC-PRICE-01 — Nightly rate × nights

**Preconditions:** Listing at $175/night

| nights | expected subtotal |
|--------|------------------|
| 1      | $175.00          |
| 3      | $525.00          |
| 14     | $2,450.00        |
| 30     | $5,250.00        |

**Steps:** Book each and verify `bookings.price_per_night` and `total_amount - cleaning_fee - service_fee + discount`

---

### TC-PRICE-02 — Cleaning fee included in total

**Preconditions:** Listing with `cleaning_fee=75`

**Steps**
1. Book 3 nights at $200/night

**Expected result:**
- `subtotal = $600`
- `cleaning_fee = $75`
- `total_amount = $675`
- Stripe PI amount = `67500` cents
- `bookings.cleaning_fee = 75.00`

---

### TC-PRICE-03 — Standard host platform fee (7% + $1)

**Preconditions:** Host is NOT a Founder (`is_founder_host=false`)

**Steps**
1. Complete booking with `total_amount = $650`

**Expected result:**
- `platform_fee = $45.50` (650 × 0.07, rounded to 2dp)
- `platform_fixed_fee = $1.00`
- `host_payout = $603.50` (650 − 46.50)
- Booking detail page shows these figures correctly

---

### TC-PRICE-04 — Founder host platform fee (6.5% + $1)

**Preconditions:** Host has `is_founder_host=true`

**Steps**
1. Complete booking with `total_amount = $650`

**Expected result:**
- `platform_fee = $42.25` (650 × 0.065)
- `platform_fixed_fee = $1.00`
- `host_payout = $606.75` (650 − 43.25)
- Host dashboard shows Founder badge + savings message

---

### TC-PRICE-05 — Promo code: percentage discount

**Preconditions:** Active promo code `SAVE10` = 10% off, valid for this listing

**Steps**
1. On `/booking`, apply `SAVE10`
2. Booking: 3 nights × $200 + $50 cleaning

**Expected result:**
- `subtotal = $600`
- `discount_amount = $60.00` (10% of 600)
- `total_amount = $590.00` (600 − 60 + 50 cleaning)
- Stripe PI = `59000` cents
- `bookings.promo_code = "SAVE10"`, `discount_amount = 60.00`

---

### TC-PRICE-06 — Promo code: fixed dollar discount

**Preconditions:** Promo `FIFTY` = $50 flat off

**Steps**
1. Book 2 nights × $150 + $30 cleaning, apply `FIFTY`

**Expected result:**
- `subtotal = $300`, `discount = $50`, `cleaning = $30`, `total = $280`
- Promo cannot make total negative (discount capped at subtotal)

---

### TC-PRICE-07 — Promo code: expired code rejected

**Preconditions:** Promo with `ends_at` = yesterday

**Steps**
1. Apply that promo code in the booking UI

**Expected result:** Server returns `invalid` — discount not applied, booking proceeds at full price

---

### TC-PRICE-08 — Promo code: per-user limit enforced

**Preconditions:** Promo with `max_uses_per_user=1`, Guest has used it once already

**Steps**
1. Apply same promo code again for a new booking

**Expected result:** Discount NOT applied (user limit hit), booking created at full price

---

### TC-PRICE-09 — Extra guest fee (UI warning)

**Preconditions:** Listing with `extra_guest_fee=$20`, listed for max 6, fee kicks in above 2

**Note:** `extra_guest_fee` is a display-only field currently — it does NOT auto-add to the checkout total. This is a **known gap**. Document for host and test that the field renders in the policies section.

**Expected result:** Listing detail page policies section shows "👥 $20/person/night" card. Booking summary does NOT add it automatically (document this limitation to host).

---

### TC-PRICE-10 — Host payout display in booking detail

**Steps**
1. Navigate to `/host/bookings/[id]` as the host

**Expected result:**
- "Host Earnings" figure = `total_amount - (platform_fee + platform_fixed_fee)`
- Matches `bookingHostPayout()` calculation
- "Platform fee" box shows percentage (7% standard / 6.5% Founder) + $1 fixed
- Payout status: `pending` for confirmed, `releasing on [checkout_date]` for checked_in

---

## Section 4 — Payment Validation

### TC-PAY-01 — Successful payment (Visa)

**Test card:** `4242 4242 4242 4242`, any future exp, any CVC

**Expected result:** Stripe PI `succeeded` → webhook fires → booking `status=confirmed`, `payment_status=paid`

---

### TC-PAY-02 — Successful payment (Mastercard)

**Test card:** `5555 5555 5555 4444`

**Expected result:** Same as TC-PAY-01

---

### TC-PAY-03 — Declined card

**Test card:** `4000 0000 0000 0002` (generic decline)

**Expected result:**
- Stripe returns decline error to browser
- `PaymentForm` shows red error banner with Stripe error message
- Booking stays at `status=pending`, `payment_status=pending`
- Guest can retry with a different card
- NO double-charge on retry (same PaymentIntent is confirmed again, not a new one)

---

### TC-PAY-04 — Insufficient funds

**Test card:** `4000 0000 0000 9995`

**Expected result:** Error message "Your card has insufficient funds." displayed inline

---

### TC-PAY-05 — 3D Secure authentication required

**Test card:** `4000 0027 6000 3184` (3DS2 required)

**Expected result:**
- Stripe opens 3DS popup (via `COOP: same-origin-allow-popups` header — already configured)
- Guest authenticates → confirmation page
- Booking confirmed after successful 3DS

---

### TC-PAY-06 — 3D Secure authentication fails

**Test card:** `4000 0082 6000 3178` (3DS auth failure)

**Expected result:**
- `payment_intent.payment_failed` webhook fires
- Booking set to `status=cancelled`, `payment_status=failed`
- Guest lands on an error page or sees failure message

---

### TC-PAY-07 — No duplicate charge on page refresh

**Steps**
1. Reach Stripe payment form
2. Click **Pay $X**
3. While Stripe is processing, hard-refresh the page (Cmd+Shift+R)
4. Page reloads to summary step
5. Click **Confirm & pay** again → click **Pay $X** again

**Expected result:**
- Second checkout POST creates a new PI and a new `pending` booking
- If first payment already succeeded, guest now has two bookings for the same dates (the overlap gap)
- **Required fix:** Show "You already have a pending payment for these dates. Complete or cancel it first."
- Verify: only one Stripe charge should land per reservation attempt

---

### TC-PAY-08 — Stripe webhook: booking confirmed atomically

**Steps**
1. Complete payment in Stripe test mode
2. Check Stripe dashboard → webhook delivery logs for `payment_intent.succeeded`

**Expected result:**
- Webhook received with 200 response
- `bookings` row updated: `status=confirmed`, `payment_status=paid`
- Only rows with `status=pending` are updated (idempotency guard in webhook)

---

### TC-PAY-09 — Host cancellation → full refund

**Preconditions:** Confirmed booking, host cancels via dashboard

**Steps**
1. Host opens `/host/bookings/[id]`
2. Clicks **Cancel Booking**, enters reason
3. POST to `/api/host/bookings/[id]/cancel`

**Expected result:**
- Booking `status=cancelled`, `cancelled_by_role=host`
- `refund_amount = total_amount` (host cancels always give full refund)
- Stripe refund NOT automatically issued (refund execution is a stub — verify this is documented for ops)
- Host receives in-app message if a team member initiated the cancel

---

### TC-PAY-10 — Guest cancellation → policy-based refund

**Preconditions:** Booking with `cancellation_policy=moderate`, check-in 10 days away

**Steps**
1. Guest cancels via `/dashboard/trips` → Cancel button

**Expected result:**
- `compute_refund` DB function called with policy=moderate, check_in, amount
- Moderate policy: full refund if >5 days before check-in → `refund_amount = total_amount`
- Booking `status=cancelled`, `cancelled_by_role=guest`

---

### TC-PAY-11 — Admin cancellation

**Preconditions:** Admin (role=admin or super_admin) logged into `/admin`

**Steps**
1. Admin opens `/admin/bookings`, clicks cancel on a confirmed booking
2. PATCH `/api/admin/bookings/[id]` with `action=cancel`

**Expected result:**
- `status=cancelled`, `cancelled_by_role=admin`
- Host receives in-app notification
- Audit log entry created with `action=booking.cancelled_by_admin`

---

### TC-PAY-12 — Cancellation on already-cancelled booking

**Steps**
1. Attempt to cancel a booking that is already `status=cancelled`

**Expected result:** `409 "Cannot cancel a booking with status 'cancelled'"`

---

## Section 5 — Role-Based Access

### TC-RBAC-01 — Owner can view all booking details

**Steps:** Log in as the host owner, open `/host/bookings/[id]`

**Expected result:** Full booking detail: guest profile, financials (platform fee, host earnings), host notes, timeline

---

### TC-RBAC-02 — Manager can view bookings but not financials

**Preconditions:** Active team member with `role=manager`

**Steps**
1. Log in as manager
2. Open `/host/bookings/[id]`
3. Navigate to Earnings tab

**Expected result:**
- `/host/bookings/[id]` loads ✓
- Earnings nav item is hidden (not in `ROLE_NAV.manager`)
- Finance figures may still appear in booking detail (acceptable) — verify with owner whether financial data should be masked for managers

---

### TC-RBAC-03 — Staff cannot see earnings or host notes

**Preconditions:** Active team member with `role=staff`

**Steps**
1. Log in as staff
2. Attempt to navigate to `/host/earnings`
3. Attempt to view booking detail

**Expected result:**
- Earnings page: redirected or shown empty (not in ROLE_NAV.staff)
- Booking detail: accessible (bookings in ROLE_NAV.staff) but earnings breakdown may be visible (gap — consider role-gating payment section)

---

### TC-RBAC-04 — Finance role sees earnings, not bookings detail

**Preconditions:** Team member with `role=finance`

**Steps**
1. Log in as finance
2. Navigate to `/host/bookings`

**Expected result:** Bookings page not in ROLE_NAV.finance → redirect or empty nav. Only overview, earnings, payouts, expenses, activity visible.

---

### TC-RBAC-05 — Team member with restricted listing access

**Preconditions:** Staff member with `allowed_listing_ids = [listing_A_id]`

**Steps**
1. Log in as restricted staff
2. Navigate to `/host/bookings/[booking_for_listing_B]`

**Expected result:** `404 "Booking not found"` (property scope enforced in GET `/api/host/bookings/[id]`)

---

### TC-RBAC-06 — Admin support role: view only

**Preconditions:** Admin with `role=support`

**Steps**
1. Log in as support admin
2. Navigate to `/admin/bookings`
3. Attempt to cancel a booking

**Expected result:**
- Bookings list visible ✓
- Cancel button missing or returns `403` — support role cannot cancel (`admin+` required)

---

### TC-RBAC-07 — Non-host cannot access host portal

**Preconditions:** Regular user account with `user_role=user` (not host)

**Steps**
1. Navigate to `/host/dashboard`

**Expected result:** Redirect to `/become-a-host` or login page (enforced by `/host/layout.js`)

---

## Section 6 — Booking Modifications

> **Note:** A formal booking modification request system does not yet exist in SnapReserve. The tests below cover the planned behavior and current conflict validation requirements.

### TC-MOD-01 — Stay extension: no conflict

**Planned behavior:** Host extends checkout date forward; system checks no booking exists for the additional nights.

**Preconditions:**
- Booking B1: check_in=2026-07-10, check_out=2026-07-14 (4 nights)
- No other bookings on 2026-07-14 or 2026-07-15

**Expected result:** Extension to check_out=2026-07-16 succeeds; pricing updated

---

### TC-MOD-02 — Stay extension: blocked by adjacent booking

**Preconditions:**
- Booking B1: check_in=2026-07-10, check_out=2026-07-14
- Booking B2: check_in=2026-07-14, check_out=2026-07-17

**Steps**
1. Attempt to extend B1 to check_out=2026-07-15

**Expected result:** `409 "The dates 2026-07-14 to 2026-07-15 are already reserved."` — B2 starts on 2026-07-14 and B1 would now also occupy 2026-07-14 night.

---

### TC-MOD-03 — Late checkout: same-day scenario

**Preconditions:**
- Booking B1: check_out=2026-07-15
- Booking B2: check_in=2026-07-15

**Expected result:** Late checkout for B1 (pushing check_out to 2026-07-16) is BLOCKED because B2 check-in is on 2026-07-15 (B2 occupies the night of 2026-07-15).

---

### TC-MOD-04 — Early check-in: no conflict

**Preconditions:**
- Booking B1: check_in=2026-07-10
- No booking ending on 2026-07-09

**Expected result:** Early check-in to 2026-07-09 succeeds.

---

### TC-MOD-05 — Early check-in: blocked by preceding booking

**Preconditions:**
- Booking B0: check_in=2026-07-07, check_out=2026-07-09
- Booking B1: check_in=2026-07-10

**Expected result:** Early check-in to 2026-07-09 is BLOCKED (B0 occupies night of 2026-07-08→09; the night of 2026-07-09 is B0's checkout day but that night is not booked — verify with business logic whether same-day turnover is allowed).

---

### TC-MOD-06 — Modification reverts on payment failure

**Expected result:** If a modification triggers an additional payment (e.g. extending stay) and payment fails, booking dates revert to original values. No partial state.

---

## Section 7 — UI & Data Validation

### TC-UI-01 — Guest avatar: broken image fallback

**Preconditions:** Guest has `avatar_url` set to an invalid/deleted URL

**Steps**
1. Host opens `/host/bookings/[id]`

**Expected result:** `GuestAvatar` component catches `onError`, renders initials circle in `avColor` color. No broken image icon.

---

### TC-UI-02 — Guest avatar: no avatar set

**Preconditions:** Guest has `avatar_url=null`

**Expected result:** Initials circle rendered immediately (no img element rendered)

---

### TC-UI-03 — Property hero image: valid Supabase URL

**Preconditions:** Listing has at least one uploaded image

**Steps**
1. Host opens booking detail page

**Expected result:** `PropertyHero` renders `listing.images[0]` as full-width banner via `next/image`

---

### TC-UI-04 — Property hero image: no images fallback

**Preconditions:** Listing with empty `images=[]`

**Expected result:** `PropertyHero` renders a gradient fallback (no broken image, no crash)

---

### TC-UI-05 — Booking summary accuracy

**Steps**
1. Open a confirmed booking detail `/host/bookings/[id]`

**Check each field:**
- Booking reference (format `SR` + alphanumeric)
- Status badge color: pending=yellow, confirmed=green, cancelled=red
- Check-in/checkout dates formatted as "Tue, July 15, 2026"
- Duration: correct night count
- Guests count
- Property name and location
- Room name (if hotel booking — N/A for private stay)

---

### TC-UI-06 — Payment breakdown: all line items present

**Expected fields visible on booking detail:**
- `$X × N nights` (price_per_night × nights)
- `Cleaning fee: $X`
- `Promo code: −$X` (if applicable, green text)
- `Total: $X` (bold, border-top)
- `Platform fee: $X` box (host-facing)
- `Host Earnings: $X` (highlighted)
- Payment status: "Paid" / "Pending" / "Failed"
- Payout status: "Released" / "Releasing on [date]" / "Pending"

---

### TC-UI-07 — Theme consistency: dark mode

**Steps**
1. Toggle dark mode via theme switcher
2. Visit `/host/bookings/[id]`

**Check:**
- All backgrounds use `var(--sr-bg)`, `var(--sr-card)`
- Borders use `var(--sr-border)` or `var(--sr-border-solid)`
- Text uses `var(--sr-text)`, `var(--sr-sub)`, `var(--sr-muted)`
- Orange accent: `var(--sr-orange)` = `#F4601A`
- No hardcoded `#1A1712` or `#F5F0EB` hex values in JSX inline styles

---

### TC-UI-08 — Theme consistency: light mode

**Steps:** Toggle to light mode, repeat TC-UI-07 checks

**Expected result:** `html[data-theme="light"]` CSS vars apply; backgrounds become cream/white, text becomes dark brown. No flash of wrong theme on load.

---

### TC-UI-09 — Typography consistency

**Check on `/host/bookings/[id]`:**
- Section headings: Inter or system-ui (host portal font)
- No Cormorant Garamond or Syne leaking into host portal (those are guest-facing listing fonts)
- Font sizes from theme scale, not arbitrary px values

---

### TC-UI-10 — Listing detail page: sidebar price

**Preconditions:** Private stay listing at $299/night

**Steps**
1. Open listing detail page
2. Set 5 nights in sidebar, guests = 2

**Expected:**
- `$299 /night` shown in sidebar header
- `$299 × 5 nights = $1,495` in breakdown
- No room selector shown (private stay — hotel room selector should NOT appear)

---

### TC-UI-11 — Sidebar: hotel listing does not show price for unselected room

**Preconditions:** Hotel listing with rooms at various prices

**Steps**
1. Open listing detail page (without `?room=` in URL)

**Expected:**
- Sidebar shows listing base price
- "↑ Select a room type above to book" hint shown
- Reserve button shows warning if clicked without room selected

---

## Section 8 — Notifications

### TC-NOTIF-01 — Guest: booking confirmation

**After:** Guest completes payment → booking confirmed via webhook

**Expected:**
- `payment_intent.succeeded` fires
- Booking status updated to `confirmed`
- **Email to guest:** [stub — no email service yet] — verify `notifyGuest` or email is scaffolded/documented
- **In-app (guest dashboard/trips):** Booking appears in `/dashboard/trips` with `status=confirmed`

---

### TC-NOTIF-02 — Host: new booking

**After:** Guest completes payment

**Expected:**
- **In-app:** Unread messages badge appears on host sidebar "Messages" nav
- Host opens `/host/messages` and sees booking notification
- Message type=`info`, subject="New booking confirmed"
- **Email:** Stubbed — document that Resend integration is needed

---

### TC-NOTIF-03 — Host: booking cancelled by guest

**After:** Guest cancels booking

**Steps**
1. Guest cancels from trips page
2. POST `/api/account/bookings/[id]/cancel`

**Expected:**
- Host receives `notifyHost()` in-app message
- Message subject: "Booking cancelled by guest"
- Message body includes booking reference, check-in date, guest reason (if provided)
- Messages badge increments on host sidebar

---

### TC-NOTIF-04 — Host owner: booking cancelled by team member

**Preconditions:** A team member (manager) cancels booking via host portal

**Expected:**
- `ownerHostRow.user_id !== user.id` triggers `notifyHost()` to host owner
- Subject: "Booking cancelled by team member"
- Owner sees notification in messages; team member does NOT receive a duplicate notification to themselves

---

### TC-NOTIF-05 — Host: booking cancelled by admin

**After:** Admin cancels booking in admin portal

**Expected:**
- `notifyHost()` called with `type=warning`
- Subject: "Booking cancelled by admin"
- Audit log records `booking.cancelled_by_admin`

---

### TC-NOTIF-06 — Host: listing suspended mid-booking

**After:** Admin suspends listing that has upcoming confirmed bookings

**Expected:**
- Suspend action calls `notifyHost()`
- Host sees suspension banner on their dashboard
- Existing confirmed bookings are NOT automatically cancelled (suspension affects new bookings only)
- Guest cannot make new bookings on suspended listing

---

### TC-NOTIF-07 — Admin: audit log entries

**After any booking lifecycle event:**

**Expected audit log entries:**
| Action | Trigger |
|--------|---------|
| `booking.cancelled_by_host` | Host cancel route |
| `booking.cancelled` | Guest cancel route |
| `booking.cancelled_by_admin` | Admin cancel route |

All entries include: `actor_id`, `actor_email`, `actor_role`, `target_type=booking`, `target_id`, `ip_address`, `user_agent`, `before_data`, `after_data`

---

## Section 9 — Edge Cases

### TC-EDGE-01 — Missing listing images on detail page

**Preconditions:** Listing with `images=[]`

**Expected:**
- City fallback image renders (`cityImages` map in `listings/[id]/page.js`)
- If city not in map, generic Unsplash fallback URL used
- No console errors, no broken layout

---

### TC-EDGE-02 — Missing listing images on booking detail

**Preconditions:** `booking.listings.images=[]` or null

**Expected:**
- `PropertyHero` gradient fallback renders
- Host notes and other sections unaffected

---

### TC-EDGE-03 — Slow network: checkout spinner

**Steps**
1. Open DevTools → Network → set throttle to Slow 3G
2. Click Confirm & pay

**Expected:**
- Spinner appears immediately (`step=loading`)
- Button disabled during loading (no double-submit)
- No timeout error for ≤ 10s; graceful error after that

---

### TC-EDGE-04 — Double-click Reserve button

**Steps**
1. On listing sidebar, rapidly double-click **Reserve now →**

**Expected:**
- Only one navigation to `/booking?...` (router.push is synchronous, idempotent)
- No duplicate requests

---

### TC-EDGE-05 — Double-click Confirm & pay

**Steps**
1. On `/booking`, rapidly double-click **Confirm & pay $X**

**Expected:**
- `setStep('loading')` fires on first click; button is removed/disabled
- Only one POST to `/api/checkout`
- One PaymentIntent created

---

### TC-EDGE-06 — Double-click Pay button (Stripe form)

**Steps**
1. On Stripe PaymentElement, rapidly double-click **Pay $X**

**Expected:**
- `setPaying(true)` disables button on first click
- Only one `stripe.confirmPayment()` call
- Stripe itself deduplicates: same PI cannot be confirmed twice

---

### TC-EDGE-07 — Browser refresh during Stripe redirect

**Steps**
1. After Stripe starts redirect to `/booking/confirmation?id=...`
2. Hard refresh before page fully loads

**Expected:**
- Confirmation page re-renders with booking data from Supabase
- Booking status is `confirmed` (webhook already ran)
- No double-charge (Stripe idempotency)

---

### TC-EDGE-08 — Mobile responsiveness: booking sidebar

**Viewport:** 375px (iPhone SE)

**Expected:**
- At ≤768px, booking page switches from 2-column to 1-column (`grid-template-columns: 1fr`)
- Price summary card appears below payment form
- All inputs are touch-friendly (≥44px tap targets)
- Date pickers functional on iOS Safari

---

### TC-EDGE-09 — Mobile responsiveness: host booking detail

**Viewport:** 375px

**Expected:**
- Single-column layout
- Sidebar stacks below main content
- Tab pills wrap correctly
- No horizontal overflow

---

### TC-EDGE-10 — Very long guest name / listing title

**Preconditions:** Guest name = 80 characters; listing title = 100 characters

**Expected:**
- Guest name in avatar: initials extracted correctly (first char of each word)
- Booking detail: long title wraps without overflow; no text truncation cutting off critical info

---

### TC-EDGE-11 — Currency: large amounts

**Preconditions:** Listing at $9,999/night, booked for 30 nights

**Steps**
1. Attempt checkout: total = $299,970 + cleaning

**Expected:**
- `total.toLocaleString()` formats with commas: "$299,970"
- Stripe amount in cents: `29997000` — within Stripe's limit ($999,999.99)
- Platform fee calculation still correct

---

### TC-EDGE-12 — Guest books their own listing

**Preconditions:** Host user attempts to book their own property

**Expected:**
- No explicit block in current codebase — document as gap
- Business decision: should we block this? Current behavior: booking is created successfully

---

## Section 10 — Critical Gaps Summary

| # | Gap | Severity | Location |
|---|-----|----------|----------|
| 1 | **No overlap check in `/api/checkout`** | 🔴 Critical | `app/api/checkout/route.js` — missing `SELECT` for conflicting bookings before PI creation |
| 2 | No `min_nights` validation in checkout API | 🟠 High | `app/api/checkout/route.js` line 49 area — `min_nights` fetched but not checked |
| 3 | No Stripe refund execution | 🟠 High | All cancel routes set `refund_amount` but never call `stripe.refunds.create()` |
| 4 | No guest email notifications | 🟡 Medium | `notifyGuest()` not implemented — guest never gets booking confirmation email |
| 5 | No host email notifications | 🟡 Medium | `notifyHost()` sends in-app messages but no email via Resend |
| 6 | Pending bookings not cleaned up on date conflict | 🟡 Medium | If guest abandons checkout, old `pending` booking with same dates can block future bookings in overlap check |
| 7 | No booking modification system | 🟡 Medium | Stay extension, early check-in, late checkout not implemented |
| 8 | Host can book their own listing | 🟢 Low | No self-booking guard |
| 9 | `extra_guest_fee` not added to checkout total | 🟢 Low | Display-only; host-defined fees not enforced |
| 10 | No blocked_dates / host unavailability table | 🟡 Medium | Hosts cannot block dates without a dummy booking |

---

## Appendix A — Test Data Reference

### Stripe Test Cards
| Scenario | Card Number | Notes |
|----------|-------------|-------|
| Success | `4242 4242 4242 4242` | Any future exp, any CVC |
| Decline | `4000 0000 0000 0002` | Generic decline |
| Insufficient funds | `4000 0000 0000 9995` | |
| 3DS2 required | `4000 0027 6000 3184` | Opens auth popup |
| 3DS2 failure | `4000 0082 6000 3178` | Auth fails |
| CVC fail | `4000 0000 0000 0101` | CVC check fails |

### Platform Fee Quick Reference
| Total | Standard (7%+$1) | Founder (6.5%+$1) |
|-------|-----------------|-------------------|
| $200  | $15.00 / $185.00 payout | $14.00 / $186.00 payout |
| $500  | $36.00 / $464.00 payout | $33.50 / $466.50 payout |
| $1000 | $71.00 / $929.00 payout | $66.00 / $934.00 payout |

### Cancellation Policy Refund Rules
| Policy | Full refund deadline |
|--------|---------------------|
| flexible | 24 hours before check-in |
| moderate | 5 days before check-in |
| strict | 7–14 days before check-in |
| non_refundable | No refund |

---

## Appendix B — Availability Overlap SQL (for `/api/checkout`)

The following check must run **before** creating the Stripe PaymentIntent:

```sql
SELECT COUNT(*) FROM bookings
WHERE listing_id = $1
  AND status NOT IN ('cancelled', 'refunded')
  AND check_in  < $checkout_date
  AND check_out > $checkin_date
```

If count > 0 → return `400 "These dates are already booked. Please choose different dates."`

In JS (Supabase):
```js
const { count } = await admin
  .from('bookings')
  .select('id', { count: 'exact', head: true })
  .eq('listing_id', listing_id)
  .not('status', 'in', '("cancelled","refunded")')
  .lt('check_in', check_out)
  .gt('check_out', check_in)

if (count > 0) {
  return Response.json({ error: 'These dates are already booked. Please choose different dates.' }, { status: 400 })
}
```

---

## Appendix C — Regression Test Checklist (run after every deploy)

- [ ] Guest can complete full booking on a private stay listing
- [ ] Overlap check rejects conflicting dates
- [ ] Cancelled booking dates become available again
- [ ] Platform fee calculation matches expected values for standard + Founder hosts
- [ ] Promo code applies correctly (percentage + fixed)
- [ ] Host receives in-app message on new booking
- [ ] Host cancel route sets `cancelled_by_role=host`
- [ ] Guest cancel route calls `compute_refund` and returns correct amount
- [ ] Admin cancel route writes to audit_log
- [ ] Stripe test card `4242...` completes full payment flow
- [ ] Declined card shows error, does not confirm booking
- [ ] Team member with `role=staff` cannot access earnings nav
- [ ] Booking detail renders correctly in light + dark mode
- [ ] Guest avatar fallback renders on broken/missing URL
- [ ] Property hero fallback renders when `images=[]`
