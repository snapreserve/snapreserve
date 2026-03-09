-- Fix public_read_listings RLS policy.
-- Previously: is_active = true AND status = 'approved'
-- Problem:    when a host clicks "Go Live", status becomes 'live' (not 'approved'),
--             so those listings were invisible to guests on the explore page.
-- Fix:        allow any listing where is_active = true AND deleted_at IS NULL

DROP POLICY IF EXISTS public_read_listings ON public.listings;

CREATE POLICY public_read_listings ON public.listings
  FOR SELECT
  TO public
  USING (is_active = true AND deleted_at IS NULL);
