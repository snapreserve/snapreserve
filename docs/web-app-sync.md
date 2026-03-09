# Web & App Data Sync

Web (Next.js) and mobile (Expo) both use the **same Supabase project**. Bookings, listings, users, and host data stay in sync.

## Data sync

- **One database** — Same `NEXT_PUBLIC_SUPABASE_URL` and anon key on web and app.
- **Instant** — Changes on web show up on the app and vice versa (same tables, same RLS where applied).
- **Auth** — Same Supabase Auth; the same user can log in on web and app.

## Host APIs: web and app

All `/api/host/*` routes accept **both**:

1. **Cookie session** (web) — browser sends Supabase session cookies.
2. **Bearer token** (app) — `Authorization: Bearer <supabase_access_token>`.

So the app must send the **Supabase access token** on every host API request.

### App implementation

After the user signs in with Supabase:

```ts
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

// Example: fetch host bookings
const res = await fetch(`${API_URL}/api/host/bookings?page=1`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
})
```

Use the **same base URL** as the web app (e.g. `https://snapreserve.app` or `https://staging.snapreserve.app`). Do not point production builds at `http://192.168.x.x:3000`.

### Host endpoints (all support Bearer + cookie)

- `GET/POST /api/host/team`
- `GET/PATCH/DELETE /api/host/team/[memberId]`
- `GET/POST /api/host/team/roles`, `PATCH/DELETE /api/host/team/roles/[roleId]`
- `GET/POST /api/host/team/accept`
- `GET /api/host/listings`
- `PATCH /api/host/listings/[id]`
- `GET /api/host/bookings`, `GET/PATCH /api/host/bookings/[id]`, `POST .../cancel`, `POST .../checkin`
- `GET/PATCH /api/host/reviews`
- `GET/POST /api/host/promotions`, `GET/PATCH/DELETE /api/host/promotions/[id]`
- `GET/POST /api/host/tasks`, `PATCH/DELETE /api/host/tasks/[id]`
- `GET/POST /api/host/rooms`, `PATCH/DELETE /api/host/rooms/[id]`
- `GET/POST /api/host/messages/[id]`
- `GET /api/host/stripe-connect` (onboarding link)

## Quick checks

| Check | How |
|-------|-----|
| Same data | Create a booking on web → open app → trip appears. |
| Host dashboard on app | Log in as host, call `GET /api/host/bookings` with `Authorization: Bearer <token>`. |
| API base URL | Production app must use `EXPO_PUBLIC_API_URL=https://snapreserve.app` (or your live URL). |

---

## Editor's Pick badge (web + app)

The platform can highlight listings with an **Editor's Pick** badge. Only Admin/Super Admin can set this in the Admin Portal; the value is stored on the `listings` table.

### Data

- **Table:** `listings`
- **Column:** `editors_pick` (boolean, default `false`)

### App (Expo / iPad / mobile)

1. **Include in listing queries**  
   When you fetch listings (Supabase client or any API that returns listings), include `editors_pick` in the select so each listing has `editors_pick: true | false`.

2. **Where to show the badge**  
   When `listing.editors_pick === true`, show the badge in:
   - **Listing cards** (explore / search results) — e.g. a pill or label: **⭐ Editor's Pick**
   - **Property detail screen** — same badge near the title or with other badges (e.g. “Instant Book”, “Verified Host”)

3. **Copy and style**  
   - Label: **⭐ Editor's Pick**  
   - Web uses a gold/amber style (e.g. `#FCD34D` text, subtle gold background) so the app can match for consistency.

No API changes are required; the app only needs to read `editors_pick` from listing data and render the badge in the UI.
