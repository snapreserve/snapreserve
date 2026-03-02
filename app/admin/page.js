import { createAdminClient } from '@/lib/supabase-admin'
import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function getStats() {
  const supabase = createAdminClient()
  const [
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
    { count: totalUsers },
    { count: activeListings },
    { data: recentApprovals },
  ] = await Promise.all([
    supabase.from('listing_approvals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('listing_approvals').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('listing_approvals').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
    supabase.from('listing_approvals')
      .select('id, listing_title, host_name, status, submitted_at, listings(type, city)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false })
      .limit(6),
  ])
  return { pendingCount: pendingCount ?? 0, approvedCount: approvedCount ?? 0, rejectedCount: rejectedCount ?? 0, totalUsers: totalUsers ?? 0, activeListings: activeListings ?? 0, recentApprovals: recentApprovals ?? [] }
}

export default async function AdminOverview() {
  // Defense-in-depth: verify session and role even though middleware also checks.
  // Catches any middleware bypass and ensures the page never renders for unauthenticated requests.
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin')
  if (!role) redirect('/login?error=no_admin_role')

  const { pendingCount, approvedCount, rejectedCount, totalUsers, activeListings, recentApprovals } = await getStats()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:#F5F0EB; }
        .content { padding:32px; }
        .stat-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-bottom:32px; }
        .stat-card { background:#1A1712; border:1px solid #2A2420; border-radius:12px; padding:20px; }
        .stat-num { font-size:1.9rem; font-weight:800; color:#F5F0EB; line-height:1; margin-bottom:6px; }
        .stat-label { font-size:0.74rem; color:#A89880; font-weight:500; text-transform:uppercase; letter-spacing:0.06em; }
        .orange { color:#F4601A !important; }
        .green  { color:#4ADE80 !important; }
        .red    { color:#F87171 !important; }
        .blue   { color:#6EA4F4 !important; }
        .yellow { color:#FCD34D !important; }
        .section-title { font-size:0.75rem; font-weight:700; color:#6B5E52; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:14px; }
        .table-wrap { background:#1A1712; border:1px solid #2A2420; border-radius:12px; overflow:hidden; margin-bottom:24px; }
        .table-row { display:grid; grid-template-columns:1.5fr 120px 100px 110px 100px; gap:12px; padding:13px 20px; border-bottom:1px solid #2A2420; align-items:center; }
        .table-row:last-child { border-bottom:none; }
        .table-row.hdr { background:#141210; }
        .table-row.hdr span { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; }
        .listing-title { font-size:0.86rem; font-weight:600; color:#F5F0EB; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .listing-host { font-size:0.73rem; color:#A89880; margin-top:2px; }
        .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; }
        .badge.hotel { background:rgba(26,110,244,0.15); color:#6EA4F4; }
        .badge.private_stay { background:rgba(244,96,26,0.15); color:#F4601A; }
        .badge.pending { background:rgba(234,179,8,0.15); color:#FCD34D; }
        .date-text { font-size:0.76rem; color:#A89880; }
        .view-link { font-size:0.76rem; color:#F4601A; text-decoration:none; font-weight:600; }
        .view-link:hover { text-decoration:underline; }
        .empty-row { padding:36px; text-align:center; color:#6B5E52; font-size:0.84rem; }
        .shortcut-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .shortcut { background:#1A1712; border:1px solid #2A2420; border-radius:12px; padding:20px; text-decoration:none; display:flex; align-items:center; gap:14px; transition:border-color 0.15s; }
        .shortcut:hover { border-color:#F4601A; }
        .sc-icon { width:40px; height:40px; border-radius:10px; background:#2A2420; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0; }
        .sc-label { font-size:0.88rem; font-weight:600; color:#F5F0EB; }
        .sc-desc { font-size:0.74rem; color:#A89880; margin-top:2px; }
        @media(max-width:1200px) { .stat-grid{grid-template-columns:repeat(3,1fr);} }
        @media(max-width:768px) { .stat-grid{grid-template-columns:repeat(2,1fr);} .content{padding:20px;} .table-row{grid-template-columns:1fr 80px 80px;} .table-row>*:nth-child(4),.table-row>*:nth-child(5){display:none;} .shortcut-grid{grid-template-columns:1fr 1fr;} }
      `}</style>

      <div className="topbar">
        <h1>Overview</h1>
      </div>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-num yellow">{pendingCount}</div>
            <div className="stat-label">Pending Review</div>
          </div>
          <div className="stat-card">
            <div className="stat-num green">{approvedCount}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-num red">{rejectedCount}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat-card">
            <div className="stat-num orange">{activeListings}</div>
            <div className="stat-label">Active Listings</div>
          </div>
          <div className="stat-card">
            <div className="stat-num blue">{totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>

        <div className="section-title">Quick Actions</div>
        <div className="shortcut-grid" style={{marginBottom:'32px'}}>
          <Link href="/admin/listings" className="shortcut">
            <div className="sc-icon">🏨</div>
            <div><div className="sc-label">Listing Approvals</div><div className="sc-desc">Review pending submissions</div></div>
          </Link>
          <Link href="/superadmin/roles" className="shortcut">
            <div className="sc-icon">🔑</div>
            <div><div className="sc-label">Manage Roles</div><div className="sc-desc">Grant or revoke admin access</div></div>
          </Link>
          <Link href="/superadmin/audit" className="shortcut">
            <div className="sc-icon">📋</div>
            <div><div className="sc-label">Audit Log</div><div className="sc-desc">View all admin actions</div></div>
          </Link>
        </div>

        <div className="section-title">Pending Approvals</div>
        <div className="table-wrap">
          <div className="table-row hdr">
            <span>Listing</span>
            <span>Type</span>
            <span>Status</span>
            <span>Submitted</span>
            <span></span>
          </div>
          {recentApprovals.length === 0
            ? <div className="empty-row">No pending approvals — all caught up!</div>
            : recentApprovals.map(a => (
              <div key={a.id} className="table-row">
                <div>
                  <div className="listing-title">{a.listing_title ?? 'Untitled'}</div>
                  <div className="listing-host">{a.host_name ?? '—'} · {a.listings?.city ?? ''}</div>
                </div>
                <div>
                  <span className={`badge ${a.listings?.type ?? ''}`}>
                    {a.listings?.type === 'hotel' ? 'Hotel' : 'Private'}
                  </span>
                </div>
                <div><span className="badge pending">Pending</span></div>
                <div className="date-text">
                  {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </div>
                <div><Link href="/admin/listings" className="view-link">Review →</Link></div>
              </div>
            ))
          }
        </div>
      </div>
    </>
  )
}
