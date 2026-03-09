-- Editor's Pick badge: only Admin/Super Admin can set this on a listing.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS editors_pick boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.editors_pick IS 'When true, show "Editor''s Pick" badge on explore, search, and property detail. Toggle only via Admin Portal (admin/super_admin).';
