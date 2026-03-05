import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import SignOutButton from './_components/SignOutButton'
import ThemeToggle from '../components/ThemeToggle'
import AdminNav from './_components/AdminNav'

export const dynamic = 'force-dynamic'

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
        body { font-family:'DM Sans',-apple-system,sans-serif; background:var(--sr-bg); color:var(--sr-text); }
        .admin-shell { display:flex; min-height:100vh; }
        .sidebar { width:220px; background:var(--sr-surface); border-right:1px solid var(--sr-border-solid); display:flex; flex-direction:column; padding:24px 0; flex-shrink:0; position:sticky; top:0; height:100vh; overflow-y:auto; }
        .sidebar-logo { padding:0 20px 24px; border-bottom:1px solid var(--sr-border-solid); margin-bottom:16px; }
        .sidebar-logo span { font-size:1rem; font-weight:800; color:var(--sr-orange); letter-spacing:-0.5px; }
        .sidebar-logo small { display:block; font-size:0.65rem; color:var(--sr-muted); font-weight:500; margin-top:2px; text-transform:uppercase; letter-spacing:0.08em; }
        .sidebar-footer { margin-top:auto; padding:16px 20px; border-top:1px solid var(--sr-border-solid); }
        .sidebar-footer small { font-size:0.7rem; color:var(--sr-sub); }
        .admin-main { flex:1; overflow:auto; }
        .admin-topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .admin-topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }
        .role-badge { font-size:0.7rem; font-weight:700; padding:4px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.08em; }
        .role-super_admin { background:rgba(244,96,26,0.15); color:var(--sr-orange); }
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
          <AdminNav isSuperAdmin={isSuperAdmin} />
          <div className="sidebar-footer">
            <small style={{display:'block', marginBottom:'10px'}}>Role: {role ?? 'unknown'}</small>
            <ThemeToggle style={{width:'100%',marginBottom:'8px',justifyContent:'center'}} />
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
