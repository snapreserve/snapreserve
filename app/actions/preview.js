'use server'
import { cookies, headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-admin'
import { createHash } from 'crypto'

const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

/**
 * Hash the IP so we never store raw IPs in the database.
 * Salted with PREVIEW_PASSWORD so the hash space is unique per deployment.
 */
function hashIp(ip) {
  const salt = process.env.PREVIEW_PASSWORD ?? 'snapreserve'
  return createHash('sha256').update(ip + salt).digest('hex').slice(0, 32)
}

/**
 * Server Action — verifies the preview site password.
 *
 * Security properties:
 * - PREVIEW_PASSWORD env var is never NEXT_PUBLIC_, so it never reaches the browser bundle.
 * - Rate-limited: max 5 failures per IP hash → 15-minute lockout, persisted in Supabase.
 * - Sets an httpOnly cookie on success (not readable by client JS).
 *
 * Returns:
 *   { success: true }
 *   { success: false, locked: true, minutesLeft: number }
 *   { success: false, locked: false, attemptsLeft: number }
 */
export async function checkPreviewPassword(password) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipHash = hashIp(ip)

  const supabase = createAdminClient()

  // ── Rate-limit check ──────────────────────────────────────────────────────
  const { data: attempt } = await supabase
    .from('preview_attempts')
    .select('attempts, locked_until')
    .eq('ip_hash', ipHash)
    .maybeSingle()

  const now = new Date()
  if (attempt?.locked_until && new Date(attempt.locked_until) > now) {
    const minutesLeft = Math.ceil((new Date(attempt.locked_until) - now) / 60000)
    return { success: false, locked: true, minutesLeft }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Password verification ─────────────────────────────────────────────────
  const correct = password === process.env.PREVIEW_PASSWORD

  if (!correct) {
    const newCount = (attempt?.attempts ?? 0) + 1
    const lockedUntil = newCount >= MAX_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
      : null

    await supabase
      .from('preview_attempts')
      .upsert(
        { ip_hash: ipHash, attempts: newCount, locked_until: lockedUntil, updated_at: now.toISOString() },
        { onConflict: 'ip_hash' }
      )

    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - newCount)
    return { success: false, locked: false, attemptsLeft }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Success ───────────────────────────────────────────────────────────────
  // Clear any previous failed attempts for this IP
  await supabase.from('preview_attempts').delete().eq('ip_hash', ipHash)

  // Set an httpOnly cookie — not readable by client JS, expires in 24 h
  const cookieStore = await cookies()
  cookieStore.set('preview_access', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  })

  return { success: true }
  // ─────────────────────────────────────────────────────────────────────────
}
