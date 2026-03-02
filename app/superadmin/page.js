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
  super_admin: '#F4601A',
  admin: '#6EA4F4',
  support: '#4ADE80',
  finance: '#FCD34D',
  trust_safety: '#C084FC',
}

export default async function SuperAdminDashboard() {
  const { totalAdmins, auditCount, pendingListings, totalUsers, recentAudit, adminRoles } = await getStats()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; }
        .topbar h1 { font-size:1.05rem; font-weight:700; }
        .content { padding:28px 32px; }
        .stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:32px; }
        .stat { background:#1A1712; border:1px solid #2A2420; border-radius:12px; padding:20px; }
        .stat-num { font-size:1.9rem; font-weight:800; line-height:1; margin-bottom:5px; }
        .stat-label { font-size:0.72rem; color:#A89880; text-transform:uppercase; letter-spacing:0.06em; }
        .two-col { display:grid; grid-template-columns:1.2fr 1fr; gap:20px; }
        .panel { background:#1A1712; border:1px solid #2A2420; border-radius:12px; overflow:hidden; }
        .panel-header { padding:14px 20px; border-bottom:1px solid #2A2420; display:flex; align-items:center; justify-content:space-between; }
        .panel-title { font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#A89880; }
        .panel-link { font-size:0.75rem; color:#F4601A; text-decoration:none; font-weight:600; }
        .panel-link:hover { text-decoration:underline; }
        .audit-row { display:flex; align-items:flex-start; gap:12px; padding:12px 20px; border-bottom:1px solid #2A2420; }
        .audit-row:last-child { border-bottom:none; }
        .audit-action { font-size:0.84rem; font-weight:600; color:#F5F0EB; }
        .audit-meta { font-size:0.73rem; color:#6B5E52; margin-top:2px; }
        .role-row { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; border-bottom:1px solid #2A2420; }
        .role-row:last-child { border-bottom:none; }
        .role-pill { font-size:0.68rem; font-weight:700; padding:3px 10px; border-radius:20px; }
        .empty { padding:32px; text-align:center; color:#6B5E52; font-size:0.84rem; }
        @media(max-width:1024px) { .two-col{grid-template-columns:1fr;} .stat-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:768px) { .content{padding:20px;} .topbar{padding:14px 20px;} }
      `}</style>

      <div className="topbar"><h1>Super Admin Dashboard</h1></div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat"><div className="stat-num" style={{color:'#F4601A'}}>{totalAdmins}</div><div className="stat-label">Active Admins</div></div>
          <div className="stat"><div className="stat-num" style={{color:'#FCD34D'}}>{pendingListings}</div><div className="stat-label">Pending Listings</div></div>
          <div className="stat"><div className="stat-num" style={{color:'#6EA4F4'}}>{totalUsers}</div><div className="stat-label">Total Users</div></div>
          <div className="stat"><div className="stat-num" style={{color:'#A89880'}}>{auditCount}</div><div className="stat-label">Audit Events</div></div>
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
                  <div style={{fontSize:'0.82rem',color:'#A89880',fontFamily:'monospace'}}>{r.user_id.slice(0,8)}…</div>
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
