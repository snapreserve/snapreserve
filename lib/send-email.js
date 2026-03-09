/**
 * Transactional email via Resend (https://resend.com).
 *
 * Setup:
 *   1. Sign up at resend.com — free tier: 3,000 emails/month
 *   2. Add RESEND_API_KEY=re_xxx (or RESEND_KEY) to .env.local and your hosting env
 *   3. Add EMAIL_FROM="SnapReserve™ <noreply@snapreserve.app>" to .env.local
 *      (or use "onboarding@resend.dev" while testing before domain verification)
 */

const FROM = process.env.EMAIL_FROM ?? 'SnapReserve™ <noreply@snapreserve.app>'

/**
 * @param {{ to: string|string[], subject: string, html: string, text?: string }}
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY || process.env.RESEND_KEY
  if (!key) {
    console.warn('[send-email] RESEND_API_KEY / RESEND_KEY not set — email not sent:', subject)
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    FROM,
        to:      Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(text ? { text } : {}),
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[send-email] Resend error:', err)
      return { success: false, error: err.message ?? 'Email send failed' }
    }

    return { success: true }
  } catch (err) {
    console.error('[send-email] Network error:', err.message)
    return { success: false, error: err.message }
  }
}

/* ── Email templates ──────────────────────────────────────────────────────── */

const BASE = (content) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:40px auto;padding:0 20px 40px">
  <div style="text-align:center;padding:28px 0 24px">
    <span style="font-size:1.5rem;font-weight:900;color:#1A1410;letter-spacing:-0.02em">
      Snap<span style="color:#F4601A">Reserve™</span>
    </span>
  </div>
  <div style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,0.07)">
    ${content}
  </div>
  <p style="text-align:center;font-size:0.72rem;color:#B8A898;margin-top:20px">
    © SnapReserve™ · <a href="https://snapreserve.app" style="color:#B8A898">snapreserve.app</a>
  </p>
</div>
</body>
</html>`

const BTN = (href, label) =>
  `<a href="${href}" style="display:block;text-align:center;background:#F4601A;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:700;font-size:0.95rem;margin:24px 0">${label} →</a>`

const DIVIDER = `<hr style="border:none;border-top:1px solid #EDE9E3;margin:24px 0">`

const FOOTER_NOTE = (note) =>
  `${DIVIDER}<p style="font-size:0.75rem;color:#C4B8AC;text-align:center;margin:0;line-height:1.6">${note}</p>`

/* ── Team invite ── */
export function teamInviteEmailHtml({ inviteeEmail, orgName, role, inviteLink, expiresAt }) {
  const labels = { manager: 'Manager', staff: 'Staff', finance: 'Finance', owner: 'Owner' }
  const roleLabel = labels[role] ?? role
  const expiry = new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return BASE(`
    <div style="text-align:center;margin-bottom:28px">
      <div style="width:52px;height:52px;background:#FFF2EC;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:16px">👥</div>
      <h1 style="margin:0 0 10px;font-size:1.25rem;font-weight:800;color:#1A1410">You've been invited!</h1>
      <p style="margin:0;color:#7A6355;font-size:0.9rem;line-height:1.65">
        <strong style="color:#1A1410">${orgName}</strong> has invited you to join their team<br>
        as a <span style="background:#FFF2EC;color:#F4601A;border-radius:100px;padding:2px 10px;font-weight:700">${roleLabel}</span> on SnapReserve™.
      </p>
    </div>
    <div style="background:#F9F7F5;border-radius:10px;padding:16px 18px;font-size:0.84rem;color:#7A6355;line-height:1.7">
      As a <strong>${roleLabel}</strong>, you'll be able to help manage listings, bookings, and guest communications for ${orgName}.
    </div>
    ${BTN(inviteLink, 'Accept Invite')}
    <p style="text-align:center;font-size:0.8rem;color:#A89880;margin:0">
      This invite was sent to <strong>${inviteeEmail}</strong>.<br>
      The link expires on <strong>${expiry}</strong>.
    </p>
    ${FOOTER_NOTE(`If you weren't expecting this invite, you can safely ignore this email.<br>The link will expire automatically.`)}
  `)
}

export function teamInviteEmailText({ orgName, role, inviteLink, inviteeEmail, expiresAt }) {
  const labels = { manager: 'Manager', staff: 'Staff', finance: 'Finance', owner: 'Owner' }
  const expiry = new Date(expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return [
    `You've been invited to join ${orgName} as a ${labels[role] ?? role} on SnapReserve™.`,
    '',
    `Accept invite: ${inviteLink}`,
    '',
    `This invite was sent to ${inviteeEmail} and expires on ${expiry}.`,
    '',
    `If you weren't expecting this, you can ignore this email.`,
  ].join('\n')
}

/* ── Host notification ── */
export function hostNotificationEmailHtml({ subject, body }) {
  return BASE(`
    <h2 style="margin:0 0 16px;font-size:1.1rem;font-weight:700;color:#1A1410">${subject}</h2>
    <div style="font-size:0.9rem;color:#5A4A3A;line-height:1.75;white-space:pre-line">${body}</div>
    ${DIVIDER}
    <p style="font-size:0.78rem;color:#C4B8AC;text-align:center;margin:0">
      Manage your account at <a href="https://snapreserve.app/host/dashboard" style="color:#F4601A">snapreserve.app</a>
    </p>
  `)
}

/* ── Listing changes requested (admin asked host to edit) ── */
export function listingChangesRequestedEmailHtml({ listingTitle, notes, editUrl }) {
  const safeNotes = (notes || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  return BASE(`
    <h2 style="margin:0 0 16px;font-size:1.1rem;font-weight:700;color:#1A1410">Changes requested for your listing</h2>
    <p style="margin:0 0 16px;font-size:0.9rem;color:#5A4A3A;line-height:1.7">
      Our team has reviewed <strong style="color:#1A1410">${(listingTitle || 'your listing').replace(/</g, '&lt;')}</strong> and needs a few updates before it can be approved.
    </p>
    ${safeNotes ? `<div style="background:#F9F7F5;border-radius:10px;padding:14px 18px;font-size:0.88rem;color:#5A4A3A;line-height:1.65;margin-bottom:20px">${safeNotes}</div>` : ''}
    <p style="margin:0 0 20px;font-size:0.9rem;color:#5A4A3A;line-height:1.7">
      Please sign in and edit your listing using the button below. Once you’ve made the changes, submit again for review.
    </p>
    ${BTN(editUrl, 'Edit your listing')}
    ${FOOTER_NOTE('If you have questions, reply to this email or contact support@snapreserve.app.')}
  `)
}

/* ── Admin request: additional documents ── */
export function documentRequestEmailHtml({ message, uploadUrl }) {
  const safeMessage = (message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  return BASE(`
    <h2 style="margin:0 0 16px;font-size:1.1rem;font-weight:700;color:#1A1410">Additional documents requested</h2>
    <p style="margin:0 0 16px;font-size:0.9rem;color:#5A4A3A;line-height:1.7">
      Our team has requested additional documents or information for your account verification.
    </p>
    ${safeMessage ? `<div style="background:#F9F7F5;border-radius:10px;padding:14px 18px;font-size:0.88rem;color:#5A4A3A;line-height:1.65;margin-bottom:20px">${safeMessage}</div>` : ''}
    <p style="margin:0 0 20px;font-size:0.9rem;color:#5A4A3A;line-height:1.7">
      Please sign in and upload or resubmit the requested documents using the button below.
    </p>
    ${BTN(uploadUrl, 'Upload documents')}
    ${FOOTER_NOTE('If you have questions, reply to this email or contact support@snapreserve.app.')}
  `)
}

/* ── Admin-initiated password reset ── */
export function adminPasswordResetEmailHtml({ resetLink }) {
  return BASE(`
    <h2 style="margin:0 0 16px;font-size:1.1rem;font-weight:700;color:#1A1410">Reset your password</h2>
    <p style="margin:0 0 16px;font-size:0.9rem;color:#5A4A3A;line-height:1.7">
      A SnapReserve™ team member has requested a password reset for your account. Click the button below to set a new password.
    </p>
    ${BTN(resetLink, 'Reset password')}
    <p style="font-size:0.8rem;color:#A89880;margin:0;text-align:center">
      This link expires in 1 hour. If you didn't request this, you can ignore this email.
    </p>
    ${FOOTER_NOTE('If the button doesn\'t work, copy and paste this link into your browser: ' + resetLink)}
  `)
}

/* ── Guest booking confirmation ── */
export function bookingConfirmationEmailHtml({ guestName, listingTitle, city, state, checkIn, checkOut, nights, guests, total, reference, tripsUrl }) {
  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
  const safeTitle = (listingTitle || 'your stay').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeGuest = (guestName || 'there').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return BASE(`
    <div style="text-align:center;margin-bottom:28px">
      <div style="width:56px;height:56px;background:#D1FAE5;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:1.6rem;margin-bottom:14px">🎉</div>
      <h1 style="margin:0 0 8px;font-size:1.2rem;font-weight:800;color:#1A1410">Booking confirmed, ${safeGuest}!</h1>
      <p style="margin:0;font-size:0.88rem;color:#7A6355;line-height:1.6">
        Your stay at <strong style="color:#1A1410">${safeTitle}</strong> is all set.
      </p>
    </div>

    <div style="background:#F9F7F5;border-radius:12px;padding:20px 22px;margin-bottom:24px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B8A898;margin-bottom:4px">Check-in</div>
          <div style="font-size:0.92rem;font-weight:700;color:#1A1410">${fmt(checkIn)}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B8A898;margin-bottom:4px">Check-out</div>
          <div style="font-size:0.92rem;font-weight:700;color:#1A1410">${fmt(checkOut)}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B8A898;margin-bottom:4px">Duration</div>
          <div style="font-size:0.92rem;font-weight:700;color:#1A1410">${nights} night${nights !== 1 ? 's' : ''} · ${guests} guest${guests !== 1 ? 's' : ''}</div>
        </div>
        <div>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#B8A898;margin-bottom:4px">Location</div>
          <div style="font-size:0.92rem;font-weight:700;color:#1A1410">${city || ''}${city && state ? ', ' : ''}${state || ''}</div>
        </div>
      </div>
      ${DIVIDER}
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:0.82rem;color:#7A6355">Total paid</span>
        <span style="font-size:1.1rem;font-weight:800;color:#1A1410">$${Number(total).toFixed(2)}</span>
      </div>
    </div>

    <div style="background:#FFF2EC;border-radius:10px;padding:12px 16px;margin-bottom:22px;display:flex;align-items:center;gap:10px">
      <span style="font-size:1.1rem">🔖</span>
      <div>
        <div style="font-size:0.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#C07848;margin-bottom:2px">Booking reference</div>
        <div style="font-family:monospace;font-size:1rem;font-weight:800;color:#F4601A">${reference}</div>
      </div>
    </div>

    ${BTN(tripsUrl, 'View my booking')}
    ${FOOTER_NOTE('Questions? Reply to this email or contact support@snapreserve.app.')}
  `)
}

export function bookingConfirmationEmailText({ guestName, listingTitle, city, state, checkIn, checkOut, nights, guests, total, reference, tripsUrl }) {
  const fmt = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
  return [
    `Hi ${guestName || 'there'}, your booking is confirmed!`,
    '',
    `Property: ${listingTitle}`,
    `Location: ${city}${city && state ? ', ' : ''}${state}`,
    `Check-in:  ${fmt(checkIn)}`,
    `Check-out: ${fmt(checkOut)}`,
    `Duration:  ${nights} night${nights !== 1 ? 's' : ''} · ${guests} guest${guests !== 1 ? 's' : ''}`,
    `Total paid: $${Number(total).toFixed(2)}`,
    '',
    `Booking reference: ${reference}`,
    '',
    `View your booking: ${tripsUrl}`,
    '',
    'Questions? Contact support@snapreserve.app',
  ].join('\n')
}

/* ── Support ticket closed (admin closed the message) ── */
export function ticketClosedEmailHtml({ subject, messagesUrl }) {
  const safeSubject = (subject || 'Your support request').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return BASE(`
    <div style="text-align:center;margin-bottom:24px">
      <div style="width:52px;height:52px;background:#E8F5E9;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:1.4rem;margin-bottom:12px">✓</div>
      <h2 style="margin:0 0 8px;font-size:1.15rem;font-weight:700;color:#1A1410">Support ticket closed</h2>
      <p style="margin:0;font-size:0.88rem;color:#7A6355;line-height:1.6">
        Our team has closed this conversation: <strong style="color:#1A1410">${safeSubject}</strong>
      </p>
    </div>
    <p style="margin:0 0 20px;font-size:0.9rem;color:#5A4A3A;line-height:1.7">
      You can no longer reply to this thread. If you need more help, start a new message from your host dashboard.
    </p>
    ${BTN(messagesUrl, 'View messages')}
    ${FOOTER_NOTE('If you have further questions, contact support@snapreserve.app.')}
  `)
}
