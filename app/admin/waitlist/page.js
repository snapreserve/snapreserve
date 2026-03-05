export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import WaitlistClient from './_components/WaitlistClient'

async function getWaitlist() {
  const supabase = createAdminClient()
  const { data, count } = await supabase
    .from('waitlist_v2_signups')
    .select('id, email, first_name, last_name, city, role, interest, referral_code, referred_by, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
  return { entries: data ?? [], total: count ?? 0 }
}

export default async function WaitlistPage() {
  // Allow access if: has preview_access cookie (site admin) OR proper admin session
  const cookieStore = await cookies()
  const hasPreview = !!cookieStore.get('preview_access')?.value

  if (!hasPreview) {
    // Try to check admin session by reading the Supabase auth cookie
    const authCookies = cookieStore.getAll().filter(c => c.name.startsWith('sb-'))
    if (authCookies.length === 0) redirect('/?access=admin')
  }

  const { entries, total } = await getWaitlist()

  return <WaitlistClient entries={entries} total={total} />
}
