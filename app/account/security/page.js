import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import SecurityClient from './SecurityClient'

export const dynamic = 'force-dynamic'

export default async function SecurityPage() {
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

  let isHost = false
  let deletionScheduledAt = null

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('is_host, user_role, deletion_scheduled_at')
      .eq('id', user.id)
      .maybeSingle()

    isHost = profile?.user_role === 'host' || !!profile?.is_host
    deletionScheduledAt = profile?.deletion_scheduled_at ?? null
  }

  return (
    <SecurityClient
      isHost={isHost}
      deletionScheduledAt={deletionScheduledAt}
    />
  )
}
