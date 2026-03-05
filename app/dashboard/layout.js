import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AccountNav from '../account/_components/AccountNav'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }) {
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
  if (!user) redirect('/login?next=/dashboard')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, avatar_url, is_active, is_host, user_role, verification_status')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.is_active === false) redirect('/login?error=account_deactivated')

  if (profile?.user_role === 'host') {
    const { data: hostRow } = await supabase
      .from('hosts').select('id').eq('user_id', user.id).maybeSingle()
    if (!hostRow) redirect('/host/dashboard')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:var(--sr-bg); color:var(--sr-text); }
        @media(max-width:768px) {
          .account-shell { flex-direction:column !important; }
          .account-sidebar { width:100% !important; min-height:auto !important; position:static !important; flex-direction:row !important; flex-wrap:wrap; border-right:none !important; border-bottom:1px solid var(--sr-border2) !important; }
        }
      `}</style>
      <div className="account-shell" style={{ display: 'flex', minHeight: '100vh' }}>
        <div className="account-sidebar">
          <AccountNav profile={profile} isHost={profile?.user_role === 'host' || !!profile?.is_host} />
        </div>
        <main style={{ flex: 1, minWidth: 0, padding: '40px 32px' }}>
          {children}
        </main>
      </div>
    </>
  )
}
