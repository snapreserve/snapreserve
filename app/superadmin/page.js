import { createAdminClient } from '@/lib/supabase-admin'
import Link from 'next/link'

async function getStats() {
  const sb = createAdminClient()
  const [
    { count: totalAdmins },
    { count: auditCount },
    { count: pendingListings },
    { count: totalUsers },
    { data: recentAudit },
    { data: adminRoles },
  ] = await Promise.all([
    sb.from('admin_roles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    sb.from('audit_logs').select('*', { count: 'exact', head: true }),
    sb.from('listing_approvals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    sb.from('audit_logs').select('actor_email, actor_role, action, target_type, created_at').order('created_at', { ascending: false }).limit(5),
    sb.from('admin_roles').select('user_id, role, granted_at').eq('is_active', true).order('granted_at', { ascending: false }),
  ])
  return { totalAdmins: totalAdmins ?? 0, auditCount: auditCount ?? 0, pendingListings: pendingListings ?? 0, totalUsers: totalUsers ?? 0, recentAudit: recentAudit ?? [], adminRoles: adminRoles ?? [] }
}

const ROLE_COLORS = {
  super_admin: 'var(--sr-orange)',
  admin: 'var(--sr-blue)',
  support: 'var(--sr-green)',
  finance: 'var(--sr-yellow)',
  trust_safety: '#C084FC',
}

export default async function SuperAdminDashboard() {
  const { totalAdmins, auditCount, pendingListings, totalUsers, recentAudit, adminRoles } = await getStats()

  return (
    <>
      <style>{`
        .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border); padding:16px 32px; }
        .topbar h1 { font-size:1.05rem; font-weight:700; font-family:'DM Sans',sans-serif; }
        .content { padding:28px 32px; }
        .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:32px; }
        .stat { background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:12px; padding:20px; }
        .stat-num { font-family:'DM Mono',monospace; font-size:2rem; font-weight:500; line-height:1; margin-bottom:5px; }
        .stat-label { font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--sr-sub); }
        .two-col { display:grid; grid-template-columns:1.2fr 1fr; gap:20px; }
        .panel { background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:12px; overflow:hidden; }
        .panel-header { padding:14px 20px; border-bottom:1px solid var(--sr-border); display:flex; align-items:center; justify-content:space-between; }
        .panel-title { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--sr-sub); }
        .panel-link { font-size:0.75rem; color:var(--sr-orange); text-decoration:none; font-weight:600; }
        .panel-link:hover { text-decoration:underline; }
        .audit-row { display:flex; align-items:flex-start; gap:12px; padding:12px 20px; border-bottom:1px solid var(--sr-border); }
        .audit-row:last-child { border-bottom:none; }
        .audit-action { font-size:0.84rem; font-weight:600; color:var(--sr-text); }
        .audit-meta { font-size:0.73rem; color:var(--sr-sub); margin-top:2px; }
        .role-row { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-bottom:1px solid var(--sr-border); }
        .role-row:last-child { border-bottom:none; }
        .role-pill { font-size:0.68rem; font-weight:700; padding:3px 10px; border-radius:20px; }
        .empty { padding:32px; text-align:center; color:var(--sr-sub); font-size:0.84rem; }
        @media(max-width:1024px) { .two-col{grid-template-columns:1fr;} .stat-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:768px) { .content{padding:20px;} .topbar{padding:14px 20px;} }
      `}</style>

      <div className="topbar"><h1>Super Admin Dashboard</h1></div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat"><div className="stat-num" style={{color:'var(--sr-orange)'}}>{totalAdmins}</div><div className="stat-label">Active Admins</div></div>
          <div className="stat"><div className="stat-num" style={{color:'var(--sr-yellow)'}}>{pendingListings}</div><div className="stat-label">Pending Listings</div></div>
          <div className="stat"><div className="stat-num" style={{color:'var(--sr-blue)'}}>{totalUsers}</div><div className="stat-label">Total Users</div></div>
          <div className="stat"><div className="stat-num" style={{color:'var(--sr-muted)'}}>{auditCount}</div><div className="stat-label">Audit Events</div></div>
        </div>

        <div className="two-col">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Recent Audit Events</span>
              <Link href="/superadmin/audit" className="panel-link">View all →</Link>
            </div>
            {recentAudit.length === 0
              ? <div className="empty">No audit events yet</div>
              : recentAudit.map((e, i) => (
                <div key={i} className="audit-row">
                  <div style={{flex:1}}>
                    <div className="audit-action">{e.action}</div>
                    <div className="audit-meta">{e.actor_email} · {e.actor_role} · {new Date(e.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))
            }
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Active Roles</span>
              <Link href="/superadmin/roles" className="panel-link">Manage →</Link>
            </div>
            {adminRoles.length === 0
              ? <div className="empty">No roles assigned</div>
              : adminRoles.slice(0, 8).map((r, i) => (
                <div key={i} className="role-row">
                  <div style={{fontSize:'0.82rem',color:'var(--sr-muted)',fontFamily:"'DM Mono',monospace"}}>{r.user_id.slice(0,8)}…</div>
                  <span className="role-pill" style={{background:`${ROLE_COLORS[r.role]}22`, color: ROLE_COLORS[r.role]}}>
                    {r.role}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </>
  )
}
