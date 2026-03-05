import { createAdminClient } from '@/lib/supabase-admin'
import { sendEmail, hostNotificationEmailHtml } from '@/lib/send-email'

/**
 * Sends an in-app message to a host and an email notification.
 *
 * @param {object} opts
 * @param {string} opts.hostUserId   - auth.users.id of the host
 * @param {string} opts.listingId    - listings.id (optional)
 * @param {'info'|'warning'|'suspension'|'reactivation'|'rejection'} opts.type
 * @param {string} opts.subject      - short subject line
 * @param {string} opts.body         - full message body
 */
export async function notifyHost({ hostUserId, listingId = null, type = 'info', subject, body }) {
  const admin = createAdminClient()

  // Insert in-app message (service role bypasses the deny_insert RLS policy)
  const { error } = await admin.from('host_messages').insert({
    host_user_id: hostUserId,
    listing_id:   listingId,
    type,
    subject,
    body,
  })
  if (error) console.error('[notify-host] insert failed:', error.message)

  // Send email notification
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(hostUserId)
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
    console.error('[notify-host] email send failed:', err.message)
  }
}
