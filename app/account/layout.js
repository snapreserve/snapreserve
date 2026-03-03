import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AccountNav from './_components/AccountNav'

export default async function AccountLayout({ children }) {
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
  if (!user) redirect('/login?next=/account/profile')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, avatar_url, is_active, is_host')
    .eq('id', user.id)
    .maybeSingle()

  // Deactivated account — sign them out
  if (profile?.is_active === false) redirect('/login?error=account_deactivated')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#FAF8F5; color:#1A1410; }
        @media(max-width:768px) {
          .account-shell { flex-direction:column !important; }
          .account-sidebar { width:100% !important; min-height:auto !important; position:static !important; flex-direction:row !important; flex-wrap:wrap; border-right:none !important; border-bottom:1px solid #E8E2D9 !important; }
        }
      `}</style>
      <div className="account-shell" style={{ display: 'flex', minHeight: '100vh' }}>
        <div className="account-sidebar">
          <AccountNav profile={profile} isHost={!!profile?.is_host} />
        </div>
        <main style={{ flex: 1, minWidth: 0, padding: '40px 32px', maxWidth: '780px' }}>
          {children}
        </main>
      </div>
    </>
  )
}
