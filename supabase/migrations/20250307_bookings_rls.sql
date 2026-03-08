-- ============================================================
-- Migration: bookings RLS
-- Prevents IDOR: clients can only read bookings where they are guest or host.
-- All mutations (insert/update) go through API routes (service role).
-- ============================================================

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Guests can read their own bookings; hosts can read bookings for their listings.
-- host_id in bookings = host's user_id (from hosts.user_id).
CREATE POLICY "bookings_select_guest_or_host"
  ON public.bookings FOR SELECT
  USING (guest_id = auth.uid() OR host_id = auth.uid());

-- All writes go through API routes (createAdminClient bypasses RLS)
-- No policy = deny for anon/authenticated client writes
-- (INSERT via checkout, UPDATE via cancel/confirm/etc. all use service role)
