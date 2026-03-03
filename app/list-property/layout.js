import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ListPropertyLayout({ children }) {
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
  if (!user) redirect('/login?next=/list-property')

  const { data: profile } = await supabase
    .from('users')
    .select('user_role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.user_role === 'pending_host') redirect('/become-a-host?status=pending')
  if (profile?.user_role !== 'host') redirect('/become-a-host')

  return <>{children}</>
}
