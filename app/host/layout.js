import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function HostLayout({ children }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/host/dashboard')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('users')
    .select('user_role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.user_role === 'pending_host') redirect('/become-a-host?status=pending')

  if (profile?.user_role !== 'host') {
    // Allow active team members to access the host portal even without host role
    const { data: membership } = await admin
      .from('host_team_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership) redirect('/become-a-host')
  }

  return <>{children}</>
}
