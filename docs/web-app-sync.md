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
