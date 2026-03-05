-- ============================================================
-- Migration: host_team_management
-- Run this in your Supabase Dashboard > SQL Editor
-- ============================================================

-- host_team_members
-- Represents a user's membership in a host organisation.
-- "Organisation" = a host account (identified by hosts.id).
-- The host account owner gets an 'owner' row automatically on approval.
-- Invited members are inserted with status='pending' and a token.
-- On acceptance the user_id is stamped and status set to 'active'.

CREATE TABLE IF NOT EXISTS public.host_team_members (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       uuid        NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  -- user_id is NULL until invite is accepted (supports inviting non-registered emails)
  user_id       uuid        REFERENCES public.users(id) ON DELETE CASCADE,
  role          text        NOT NULL DEFAULT 'staff'
                              CHECK (role IN ('owner', 'manager', 'staff', 'finance')),
  status        text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'active', 'removed')),
  invite_email  text,
  invite_token  text        UNIQUE,
  invited_by    uuid        REFERENCES public.users(id),
  invited_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at   timestamptz,
  removed_at    timestamptz,
  UNIQUE NULLS NOT DISTINCT (host_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_htm_host   ON public.host_team_members (host_id);
CREATE INDEX IF NOT EXISTS idx_htm_user   ON public.host_team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_htm_token  ON public.host_team_members (invite_token) WHERE invite_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_htm_email  ON public.host_team_members (invite_email) WHERE invite_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_htm_status ON public.host_team_members (host_id, status);

ALTER TABLE public.host_team_members ENABLE ROW LEVEL SECURITY;

-- Members can see everyone in their own org
CREATE POLICY "htm_select_own_org"
  ON public.host_team_members FOR SELECT
  USING (
    host_id IN (
      SELECT htm2.host_id
      FROM   public.host_team_members htm2
      WHERE  htm2.user_id = auth.uid()
        AND  htm2.status  = 'active'
    )
    OR
    host_id IN (
      SELECT id FROM public.hosts WHERE user_id = auth.uid()
    )
  );

-- All mutations go through service-role API routes — deny direct client writes
CREATE POLICY "htm_deny_direct_write"
  ON public.host_team_members FOR INSERT  USING (false) WITH CHECK (false);
CREATE POLICY "htm_deny_direct_update"
  ON public.host_team_members FOR UPDATE  USING (false);
CREATE POLICY "htm_deny_direct_delete"
  ON public.host_team_members FOR DELETE  USING (false);
