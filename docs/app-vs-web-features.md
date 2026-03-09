# App vs website — features to verify or add

The **website** (Next.js) and **app** (Expo/mobile) share the same Supabase backend. Use this list to confirm what exists on the app and what may still be missing or different.

---

## Guest flows (travelers)

| Feature | Web | App – verify or add |
|--------|-----|----------------------|
| **Explore / search** | Home + `/listings` with filters, search | Same: browse listings, filters, search. Include `editors_pick` in listing data. |
| **Listing detail** | `/listings/[id]` — gallery, description, host, booking sidebar, **Editor's Pick** badge | Same: detail screen with booking UI. Show **Editor's Pick** badge when `listing.editors_pick === true`. |
| **Booking / checkout** | `/booking` → Stripe Payment Element → `/booking/confirmation` | In-app checkout (Stripe SDK or webview) and confirmation screen. Use same `/api/checkout` with Bearer token. |
| **Trips** | `/trips` and `/account/trips` — Upcoming / Past / Cancelled, cancel trip, **leave a review** | Trips list with same tabs; guest cancel via `/api/account/bookings/[id]/cancel`; **post-stay review** (rating + comment). |
| **Dashboard** | `/dashboard` — next trip countdown, upcoming/past, saved listings, quick links | Same: summary, next trip, saved, links to trips/account. |
| **Account** | Profile, security (password, MFA), payments (methods), notifications, **saved** listings, messages | Profile, security, payment methods, notifications, **saved** list, **messages** (guest–host). |
| **Policies / legal** | Terms, Privacy, Refund, Payment, Guest, Listing, Community Standards | In-app links or in-app browser to same pages (or embedded copy). |
| **Waitlist** | `/waitlist` (if enabled) — join as traveler or host | Optional: join waitlist from app or deep link to web. |

---

## Host flows

| Feature | Web | App – verify or add |
|--------|-----|----------------------|
| **Host dashboard** | Overview, bookings, calendar, earnings, tasks, team, activity log | Same data via `/api/host/*` with `Authorization: Bearer <token>`. |
| **Bookings** | List + detail; cancel booking; **Confirm check-in** (on arrival date only) | List + detail; cancel; **check-in** button (same rule: only on arrival date). |
| **Listings** | Create/edit listings, images, pricing, availability | Create/edit via host APIs; ensure **Editor's Pick** is read-only (set only in Admin). |
| **Team** | Invite, roles, accept invite | Same: `/api/host/team`, `/api/host/team/roles`, `/api/host/team/accept`. |
| **Messages** | Host–guest messages | `/api/host/messages/[id]`. |
| **Stripe Connect** | Onboarding link for payouts | `/api/host/stripe-connect` → open URL in browser or in-app. |
| **Activity log** | Booking + team events | `GET /api/host/activity` for recent events. |
| **Promotions / tasks / rooms** | Per docs | `/api/host/promotions`, `/api/host/tasks`, `/api/host/rooms` if host app uses them. |

---

## Data & API parity

| Item | Web | App |
|------|-----|-----|
| **Editor's Pick badge** | Shown on home, listings, listing detail when `editors_pick === true` | Include `editors_pick` in all listing queries; show **⭐ Editor's Pick** on cards and property detail. See `docs/web-app-sync.md`. |
| **Auth** | Supabase Auth (email, Google); session in cookies | Same Supabase Auth; send **Bearer token** on API calls. |
| **Guest APIs** | Cookie session | App: `Authorization: Bearer <access_token>`. Account APIs support both. |
| **Host APIs** | Cookie or Bearer | App must send `Authorization: Bearer <supabase_access_token>` on every host request. |
| **Base URL** | Staging vs prod by deploy | App: `EXPO_PUBLIC_API_URL` = staging URL for testing, prod URL only for prod builds. |

---

## Likely gaps (often missing or partial on app)

1. **Editor's Pick** — Badge on listing cards and property detail (data exists; UI may not).
2. **Post-stay reviews** — Guest can rate and leave a review after checkout; app may only show trips without review flow.
3. **Guest cancel + refund** — Cancel from trips with reason; refund policy messaging.
4. **Saved listings** — Sync with web via `saved_listings` table.
5. **Messages** — Guest–host thread; web has `/account/messages`; app may not have full thread UI.
6. **Host check-in** — “Confirm check-in” only on arrival date (same rule as web).
7. **Policies / legal** — Terms, privacy, refund, etc. linked or shown in app.
8. **Activity log (host)** — Recent bookings + team events; API exists (`/api/host/activity`).

---

## Profile page — host parity (what the web has that the app should match)

When a **host** opens the profile (or account) screen, the web shows the following. The app should include each so hosts get the same experience.

### 1. Profile/account API data

Use **`GET /api/account/profile`** (with session/Bearer). Response includes:

- `first_name`, `last_name`, `full_name`, `email`, `phone`, `avatar_url`, `city`, `country`, `created_at`
- `is_host` (boolean) — use this to show host-specific UI
- `user_role`, `verification_status`
- **Stats:** `booking_count` (trips as guest), `saved_count`, `total_spent` (as guest)

### 2. Badges (show on profile for hosts)

- **✓ Verified** — when `verification_status === 'verified'`
- **🏠 Host** — when `is_host === true` (must show for hosts)
- **✈️ Traveler** — when `booking_count > 0`

### 3. Stats row (web shows these on profile)

- **Trips** — value: `booking_count`
- **Saved** — value: `saved_count`
- **Total Spent** — value: `total_spent` (format e.g. $1.2k if ≥ 1000, else plain number)

### 4. Host CTA block (critical for hosts)

A dedicated block on the profile/account screen:

- **If host:**  
  - Title: **You're a host**  
  - Subtitle: **Manage your listings and bookings from your host dashboard.**  
  - Button: **Host dashboard →** linking to host dashboard (e.g. deep link to host section or `/host/dashboard` in webview).
- **If not host:**  
  - Title: **Become a host**  
  - Subtitle: **List your space and start earning. Switch back to guest mode at any time.**  
  - Button: **Get started →** (e.g. link to become-a-host or list-property flow).

### 5. Account nav / menu (when user is host)

- **Switch to Host Portal** (or “Host dashboard”) — prominent entry so hosts can jump to the host section. Web shows this in the account sidebar; app can show it in profile screen or account menu.

### 6. Editable profile fields (same as web)

- First name, last name, phone, city, country (PATCH to `/api/account/profile` with same fields).
- Email: read-only with note “To change your email, contact support.”
- Avatar: web supports image URL or emoji; app can support photo and/or same PATCH with `avatar_url`.

### Summary checklist for app profile (hosts)

- [ ] Profile API: `GET /api/account/profile` returns `is_host`, `booking_count`, `saved_count`, `total_spent`.
- [ ] **Host badge** shown when `is_host === true`.
- [ ] **Stats** row: Trips, Saved, Total Spent.
- [ ] **Host CTA block:** “You're a host” + “Manage your listings…” + **Host dashboard →** button (for hosts).
- [ ] **Switch to Host Portal** (or equivalent) in account menu or profile so hosts can open host dashboard.
- [ ] Non-hosts see “Become a host” CTA and “Get started →” (not the host dashboard link).

---

## Quick checklist for app team

- [ ] Listing queries include `editors_pick`; **Editor's Pick** badge shown on cards and detail.
- [ ] All host API calls send `Authorization: Bearer <supabase_access_token>`.
- [ ] Trips: upcoming / past / cancelled; guest cancel; **leave review** after stay.
- [ ] Checkout uses same backend (`/api/checkout`) and shows confirmation.
- [ ] Host: bookings list/detail, cancel, **confirm check-in** (on arrival date).
- [ ] Host activity log uses `GET /api/host/activity` (or equivalent).
- [ ] Testing build points at staging API; prod build points at prod API only when approved.
- [ ] **Host portal nav labels** match web: **TEAM** → **Team Members**, **Roles & Permissions** (not "roles and permission" or "roles and perms"), **Property Access**, **Activity Log**. See `docs/web-app-sync.md` § Host portal — nav labels.
- [ ] **Profile for hosts:** Host badge, stats (Trips, Saved, Total Spent), “You're a host” CTA + Host dashboard button, and “Switch to Host Portal” in menu. See § Profile page — host parity above.
