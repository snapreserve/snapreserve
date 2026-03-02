import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

async function getCurrentRole() {
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
    if (!user) return null
    const { data } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    return data?.role ?? null
  } catch {
    return null
  }
}

export default async function AdminLayout({ children }) {
  const role = await getCurrentRole()
  const isSuperAdmin = role === 'super_admin'

  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#0F0D0A; color:#F5F0EB; }
        .admin-shell { display:flex; min-height:100vh; }
        .sidebar { width:220px; background:#1A1712; border-right:1px solid #2A2420; display:flex; flex-direction:column; padding:24px 0; flex-shrink:0; position:sticky; top:0; height:100vh; }
        .sidebar-logo { padding:0 20px 24px; border-bottom:1px solid #2A2420; margin-bottom:16px; }
        .sidebar-logo span { font-size:1rem; font-weight:800; color:#F4601A; letter-spacing:-0.5px; }
        .sidebar-logo small { display:block; font-size:0.65rem; color:#A89880; font-weight:500; margin-top:2px; text-transform:uppercase; letter-spacing:0.08em; }
        .nav-section { padding:0 12px; margin-bottom:8px; }
        .nav-label { font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#6B5E52; padding:0 8px; margin-bottom:6px; }
        .nav-link { display:flex; align-items:center; gap:10px; padding:9px 8px; border-radius:8px; color:#A89880; font-size:0.85rem; font-weight:500; text-decoration:none; transition:all 0.15s; }
        .nav-link:hover { background:#2A2420; color:#F5F0EB; }
        .nav-link.active { background:#2A2420; color:#F4601A; }
        .nav-link .icon { font-size:1rem; width:20px; text-align:center; }
        .sidebar-footer { margin-top:auto; padding:16px 20px; border-top:1px solid #2A2420; }
        .sidebar-footer small { font-size:0.7rem; color:#6B5E52; }
        .admin-main { flex:1; overflow:auto; }
        .admin-topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .admin-topbar h1 { font-size:1.05rem; font-weight:700; color:#F5F0EB; }
        .role-badge { font-size:0.7rem; font-weight:700; padding:4px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.08em; }
        .role-super_admin { background:rgba(244,96,26,0.15); color:#F4601A; }
        .role-admin { background:rgba(26,110,244,0.15); color:#6EA4F4; }
        .role-support { background:rgba(22,163,74,0.15); color:#4ADE80; }
        .role-finance { background:rgba(234,179,8,0.15); color:#FCD34D; }
        .role-trust_safety { background:rgba(168,85,247,0.15); color:#C084FC; }
        .admin-content { padding:32px; }
        @media(max-width:768px) { .sidebar{display:none} .admin-content{padding:20px} }
      `}</style>
      <div className="admin-shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <span>SnapReserve</span>
            <small>Admin Console</small>
          </div>
          <div className="nav-section">
            <div className="nav-label">Main</div>
            <Link href="/admin" className="nav-link"><span className="icon">📊</span>Overview</Link>
            <Link href="/admin/listings" className="nav-link"><span className="icon">🏨</span>Listings</Link>
          </div>
          {isSuperAdmin && (
            <div className="nav-section">
              <div className="nav-label">Super Admin</div>
              <Link href="/superadmin" className="nav-link"><span className="icon">⚡</span>Dashboard</Link>
              <Link href="/superadmin/roles" className="nav-link"><span className="icon">🔑</span>Roles</Link>
              <Link href="/superadmin/audit" className="nav-link"><span className="icon">📋</span>Audit Log</Link>
            </div>
          )}
          <div className="sidebar-footer">
            <small>Role: {role ?? 'unknown'}</small>
          </div>
        </aside>
        <div className="admin-main">
          {children}
        </div>
      </div>
    </>
  )
}
