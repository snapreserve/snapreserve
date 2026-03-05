import { createAdminClient } from './supabase-admin'
import { sendEmail, hostNotificationEmailHtml } from './send-email'

/**
 * Sends an in-app notification to any user (guest or host).
 * For hosts, also inserts into host_messages so it appears in their dashboard.
 *
 * @param {object} opts
 * @param {string} opts.userId      - auth.users.id of the recipient
 * @param {string} opts.subject
 * @param {string} opts.body
 * @param {'info'|'warning'|'suspension'|'reactivation'|'rejection'} [opts.type]
 * @param {string} [opts.listingId] - optional listing context (for hosts)
 */
export async function notifyUser({ userId, subject, body, type = 'info', listingId = null }) {
  const admin = createAdminClient()

  // Check if this user is a host — if so, also push to host_messages
  const { data: hostRow } = await admin
    .from('hosts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (hostRow) {
    const { error } = await admin.from('host_messages').insert({
      host_user_id: userId,
      listing_id:   listingId,
      type,
      subject,
      body,
    })
    if (error) console.error('[notify-user] host_messages insert failed:', error.message)
  }

  // Send email notification
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    const email = authUser?.user?.email
    if (email) {
      await sendEmail({
        to:      email,
        subject,
        html:    hostNotificationEmailHtml({ subject, body }),
        text:    body,
      })
    }
  } catch (err) {
    console.error('[notify-user] email send failed:', err.message)
  }
}
