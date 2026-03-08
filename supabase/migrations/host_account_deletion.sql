-- ============================================================
-- Migration: host_account_deletion
-- Run this in your Supabase Dashboard > SQL Editor
-- ============================================================

-- Add deletion scheduling column for 30-day host grace period.
-- deletion_scheduled_at: timestamp when the host requested deletion.
-- Grace period ends at deletion_scheduled_at + 30 days.
-- A background job (or admin action) should perform final anonymization
-- after the grace period ends.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;

-- Index for efficiently querying accounts pending deletion
-- (used by background jobs and admin dashboards)
CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled_at
  ON public.users (deletion_scheduled_at)
  WHERE deletion_scheduled_at IS NOT NULL;
