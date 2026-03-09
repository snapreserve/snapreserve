-- Apply to STAGING Supabase first; run on production only when promoting that release.
-- Store verification reference shown to guest at signup (e.g. VERF-XXXXXX) for admin visibility
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS verification_reference text;

COMMENT ON COLUMN public.users.verification_reference IS 'Reference shown to guest at signup; visible in admin guest section.';
