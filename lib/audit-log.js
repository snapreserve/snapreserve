import { createAdminClient } from './supabase-admin'

/**
 * Writes a row to audit_logs using the service role client.
 * Never throws — audit failure must not block the primary action.
 *
 * @param {Object} p
 * @param {string}  p.actorId      auth.users.id of the admin
 * @param {string}  p.actorEmail   email of the admin
 * @param {string}  p.actorRole    admin role string
 * @param {string}  p.action       e.g. 'listing.approved', 'role.granted'
 * @param {string}  [p.targetType] e.g. 'listing', 'user', 'role'
 * @param {string}  [p.targetId]   UUID or identifier of affected record
 * @param {Object}  [p.beforeData] snapshot before change
 * @param {Object}  [p.afterData]  snapshot after change
 * @param {string}  [p.ipAddress]  from x-forwarded-for header
 * @param {string}  [p.userAgent]  from user-agent header
 */
export async function logAction({
  actorId,
  actorEmail,
  actorRole,
  action,
  targetType,
  targetId,
  beforeData,
  afterData,
  ipAddress,
  userAgent,
  adminNotes,
  isOverride = false,
  overrideReason,
}) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('audit_logs').insert({
      actor_id:        actorId,
      actor_email:     actorEmail,
      actor_role:      actorRole,
      action,
      target_type:     targetType ?? null,
      target_id:       targetId ? String(targetId) : null,
      before_data:     beforeData ?? null,
      after_data:      afterData ?? null,
      ip_address:      ipAddress ?? null,
      user_agent:      userAgent ?? null,
      admin_notes:     adminNotes ?? null,
      is_override:     isOverride,
      override_reason: overrideReason ?? null,
    })
    if (error) console.error('[audit-log] insert failed:', error.message)
  } catch (err) {
    console.error('[audit-log] unexpected error:', err)
  }
}
