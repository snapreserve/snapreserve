import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import SignOutButton from './_components/SignOutButton'
import AdminNav from './_components/AdminNav'
import ViewAsExitButton from './_components/ViewAsExitButton'
import ThemeToggle from '../components/ThemeToggle'

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
    if (!user) return { role: null, email: null, name: null, viewAs: null }
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
    const actualRole = data?.role ?? null
    // Read view-as cookie (super_admin only)
    const viewAs = actualRole === 'super_admin'
      ? (cookieStore.get('admin_view_as')?.value ?? null)
      : null
    return { role: actualRole, email: user.email, name: profile?.full_name ?? null, viewAs }
  } catch {
    return { role: null, email: null, name: null, viewAs: null }
  }
}

function initials(name) {
  if (!name) return 'A'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default async function AdminLayout({ children }) {
  const { role, email, name, viewAs } = await getAdminInfo()
  const isSuperAdmin = role === 'super_admin'
  const effectiveRole = viewAs || role

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: var(--sr-bg); color: var(--sr-text); }

        .admin-shell { display: flex; min-height: 100vh; }
        .admin-main  { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }

        /* Role badge */
        .role-badge { display: inline-block; font-size: 0.58rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.07em; margin-top: 5px; }
        .role-super_admin  { background: rgba(232,98,42,0.15);  color: var(--sr-orange); }
        .role-admin        { background: rgba(90,159,212,0.15); color: var(--sr-blue); }
        .role-support      { background: rgba(61,184,122,0.15); color: var(--sr-green); }
        .role-finance      { background: rgba(212,170,74,0.15); color: var(--sr-yellow); }
        .role-trust_safety { background: rgba(168,85,247,0.15); color: #C084FC; }

        /* View As banner */
        .view-as-banner { background: #7C3AED; color: white; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; font-weight: 600; flex-shrink: 0; }
        .view-as-banner form button { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); color: white; padding: 5px 14px; border-radius: 100px; font-size: 0.76rem; font-weight: 700; cursor: pointer; font-family: inherit; }
        .view-as-banner form button:hover { background: rgba(255,255,255,0.3); }

        @media (max-width: 768px) {
          .hs-sidebar  { display: none; }
          .admin-main  { margin-left: 0; }
        }
      `}</style>

      <div className="admin-shell">
        <aside className="hs-sidebar">

          {/* Logo — matches host portal exactly */}
          <div className="hs-logo-wrap">
            <a href="/" className="hs-logo-text">
              <img src="/logo.png" alt="SnapReserve" />
            </a>
            <div className="hs-logo-sub">Admin Console</div>
          </div>

          <AdminNav isSuperAdmin={isSuperAdmin} effectiveRole={effectiveRole} />

          {/* Footer */}
          <div className="hs-sidebar-footer">
            <div className="hs-user-row">
              <div className="hs-avatar">{initials(name ?? email)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="hs-user-name">{name ?? email ?? 'Admin'}</div>
                {name && <div className="hs-user-role">{email}</div>}
                {role && <span className={`role-badge role-${role}`}>{role.replace(/_/g, ' ')}</span>}
              </div>
            </div>
            <ThemeToggle style={{ width: '100%', justifyContent: 'center', marginBottom: '8px' }} />
            <SignOutButton />
          </div>
        </aside>

        <div className="admin-main">
          {viewAs && (
            <div className="view-as-banner">
              <span>👁️ Previewing as <strong>{viewAs.replace(/_/g, ' ')}</strong> — nav is filtered as this role would see it</span>
              <ViewAsExitButton />
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  )
}

