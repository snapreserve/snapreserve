import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import SignOutButton from './_components/SignOutButton'
import AdminNav from './_components/AdminNav'
import ViewAsExitButton from './_components/ViewAsExitButton'

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

        /* ── Shell ── */
        .admin-shell { display: flex; min-height: 100vh; }
        .admin-main  { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }

        /* ── Sidebar ── */
        .sidebar { width: 240px; background: var(--sr-surface); border-right: 1px solid var(--sr-border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; overflow-y: auto; }

        /* Logo */
        .sidebar-logo-wrap { padding: 22px 20px 18px; border-bottom: 1px solid var(--sr-border); flex-shrink: 0; }
        .sidebar-logo-text { font-family: 'DM Sans', sans-serif; font-size: 1.1rem; font-weight: 800; color: var(--sr-text); letter-spacing: -0.02em; display: block; }
        .sidebar-logo-text span { color: var(--sr-orange); }
        .sidebar-logo-sub { font-size: 0.6rem; font-weight: 700; color: var(--sr-sub); text-transform: uppercase; letter-spacing: 0.14em; margin-top: 4px; }

        /* Footer */
        .sidebar-footer { margin-top: auto; padding: 14px 12px; border-top: 1px solid var(--sr-border); flex-shrink: 0; }
        .sidebar-user-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; margin-bottom: 8px; }
        .sidebar-avatar { width: 32px; height: 32px; border-radius: 8px; background: var(--sr-orange); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.72rem; color: white; flex-shrink: 0; }
        .sidebar-user-name { font-size: 0.78rem; font-weight: 700; color: var(--sr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar-user-email { font-size: 0.62rem; color: var(--sr-sub); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
          .sidebar { display: none; }
          .admin-main { margin-left: 0; }
        }
      `}</style>

      <div className="admin-shell">
        <aside className="sidebar">
          <div className="sidebar-logo-wrap">
            <div className="sidebar-logo-text">
              Snap<span>Reserve</span>
            </div>
            <div className="sidebar-logo-sub">Admin Console</div>
          </div>

          <AdminNav isSuperAdmin={isSuperAdmin} effectiveRole={effectiveRole} />

          <div className="sidebar-footer">
            <div className="sidebar-user-row">
              <div className="sidebar-avatar">{initials(name ?? email)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="sidebar-user-name">{name ?? email ?? 'Admin'}</div>
                {name && <div className="sidebar-user-email">{email}</div>}
                {role && <span className={`role-badge role-${role}`}>{role.replace(/_/g, ' ')}</span>}
              </div>
            </div>
            <SignOutButton />
          </div>
        </aside>

        <div className="admin-main">
          {/* View As banner */}
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

