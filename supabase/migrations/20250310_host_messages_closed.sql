-- Ticketing: allow admins to close/reopen messages (host_messages).
-- Apply to STAGING first, then production when promoting.

ALTER TABLE public.host_messages
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid;

COMMENT ON COLUMN public.host_messages.closed_at IS 'Set when an admin closes the ticket; null = open.';
COMMENT ON COLUMN public.host_messages.closed_by IS 'Admin user id who closed the ticket (auth.users.id).';
