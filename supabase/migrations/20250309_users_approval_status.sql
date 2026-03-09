-- Apply to STAGING Supabase first; run on production only when promoting that release.
-- Ensures approval_status exists so new signups show as Pending Activation until admin approves.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending';

COMMENT ON COLUMN public.users.approval_status IS 'pending = awaiting admin approval; approved = full access; rejected = signup rejected.';

-- Backfill: any existing row with NULL approval_status treat as approved (so we don’t lock out current users)
UPDATE public.users
SET approval_status = 'approved'
WHERE approval_status IS NULL;
