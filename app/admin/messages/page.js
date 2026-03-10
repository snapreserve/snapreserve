export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import MessagesClient from './MessagesClient'

async function getMessages() {
  const admin = createAdminClient()
  const baseColumns = 'id, type, subject, body, is_read, reply_body, replied_at, created_at, listing_id, host_user_id'
  let rows = null

  const { data: withClosed, error: withClosedError } = await admin
    .from('host_messages')
    .select(`${baseColumns}, closed_at, closed_by`)
    .order('created_at', { ascending: false })
    .limit(300)

  if (withClosedError) {
    if (withClosedError.message?.includes('closed_at') || withClosedError.message?.includes('closed_by')) {
      const { data: withoutClosed, error: withoutError } = await admin
        .from('host_messages')
        .select(baseColumns)
        .order('created_at', { ascending: false })
        .limit(300)
      if (withoutError) {
        console.error('[admin/messages]', withoutError.message)
        return []
      }
      rows = (withoutClosed ?? []).map((m) => ({ ...m, closed_at: null, closed_by: null }))
    } else {
      console.error('[admin/messages]', withClosedError.message)
      return []
    }
  } else {
    rows = withClosed ?? []
  }

  const list = rows ?? []
  const hostIds = [...new Set(list.map((m) => m.host_user_id).filter(Boolean))]
  const listingIds = [...new Set(list.map((m) => m.listing_id).filter(Boolean))]

  let hostMap = {}
  let listingMap = {}
  if (hostIds.length > 0) {
    const { data: users } = await admin.from('users').select('id, full_name, email').in('id', hostIds)
    hostMap = Object.fromEntries((users ?? []).map((u) => [u.id, { full_name: u.full_name, email: u.email }]))
  }
  if (listingIds.length > 0) {
    const { data: listings } = await admin.from('listings').select('id, title').in('id', listingIds)
    listingMap = Object.fromEntries((listings ?? []).map((l) => [l.id, { title: l.title }]))
  }

  return list.map((m) => {
    const host = hostMap[m.host_user_id]
    const listing = listingMap[m.listing_id]
    return {
      ...m,
      host_name: host?.full_name || host?.email || '—',
      host_email: host?.email || '—',
      listing_title: listing?.title || '—',
    }
  })
}

export default async function AdminMessagesPage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/messages')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin/messages')
  if (!role) redirect('/login?error=no_admin_role')

  const messages = await getMessages()
  return <MessagesClient initialMessages={messages} role={role} />
}
