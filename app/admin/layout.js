import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import SignOutButton from './_components/SignOutButton'
import ThemeToggle from '../components/ThemeToggle'
import AdminNav from './_components/AdminNav'

export const dynamic = 'force-dynamic'

async function getAdminInfo() {
  try {
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
    if (!user) return { role: null, email: null, name: null }
    const { data } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    const { data: profile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()
    return { role: data?.role ?? null, email: user.email, name: profile?.full_name ?? null }
  } catch {
    return { role: null, email: null, name: null }
  }
}

function initials(name) {
  if (!name) return 'A'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default async function AdminLayout({ children }) {
  const { role, email, name } = await getAdminInfo()
  const isSuperAdmin = role === 'super_admin'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Syne', -apple-system, sans-serif; background: var(--sr-bg); color: var(--sr-text); }

        /* ── Shell ── */
        .admin-shell { display: flex; min-height: 100vh; }
        .admin-main  { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }

        /* ── Sidebar ── */
        .sidebar { width: 240px; background: var(--sr-surface); border-right: 1px solid var(--sr-border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; overflow-y: auto; }

        /* Logo */
        .sidebar-logo-wrap { padding: 24px 20px 20px; border-bottom: 1px solid var(--sr-border); flex-shrink: 0; }
        .sidebar-logo-text { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 700; color: var(--sr-text); letter-spacing: -0.01em; display: block; }
        .sidebar-logo-text span { color: var(--sr-orange); }
        .sidebar-logo-text sup { font-size: 0.55em; vertical-align: super; opacity: 0.7; }
        .sidebar-logo-sub { font-size: 0.6rem; font-weight: 700; color: var(--sr-sub); text-transform: uppercase; letter-spacing: 0.14em; margin-top: 4px; }

        /* Footer */
        .sidebar-footer { margin-top: auto; padding: 14px 12px; border-top: 1px solid var(--sr-border); flex-shrink: 0; }
        .sidebar-user-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; margin-bottom: 8px; }
        .sidebar-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--sr-orange); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; color: white; flex-shrink: 0; }
        .sidebar-user-name { font-size: 0.8rem; font-weight: 700; color: var(--sr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar-user-email { font-size: 0.62rem; color: var(--sr-sub); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .role-badge { display: inline-block; font-size: 0.58rem; font-weight: 700; padding: 3px 8px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; }
        .role-super_admin { background: rgba(232,98,42,0.15); color: var(--sr-orange); }
        .role-admin       { background: rgba(90,159,212,0.15); color: var(--sr-blue); }
        .role-support     { background: rgba(61,184,122,0.15); color: var(--sr-green); }
        .role-finance     { background: rgba(212,170,74,0.15); color: var(--sr-yellow); }
        .role-trust_safety { background: rgba(168,85,247,0.15); color: #C084FC; }

        /* Content area */
        .admin-content { padding: 32px; flex: 1; }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .admin-main { margin-left: 0; }
          .admin-content { padding: 20px; }
        }
      `}</style>

      <div className="admin-shell">
        <aside className="sidebar">
          <div className="sidebar-logo-wrap">
            <div className="sidebar-logo-text">
              Snap<span>Reserve</span><sup>™</sup>
            </div>
            <div className="sidebar-logo-sub">Admin Console</div>
          </div>

          <AdminNav isSuperAdmin={isSuperAdmin} />

          <div className="sidebar-footer">
            <div className="sidebar-user-row">
              <div className="sidebar-avatar">{initials(name ?? email)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="sidebar-user-name">{name ?? email ?? 'Admin'}</div>
                {name && <div className="sidebar-user-email">{email}</div>}
                {role && <span className={`role-badge role-${role}`}>{role.replace(/_/g, ' ')}</span>}
              </div>
            </div>
            <ThemeToggle style={{ width: '100%', marginBottom: '8px', justifyContent: 'center' }} />
            <SignOutButton />
          </div>
        </aside>

        <div className="admin-main">
          {children}
        </div>
      </div>
    </>
  )
}
