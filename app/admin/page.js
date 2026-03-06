export const dynamic = 'force-dynamic'
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
    { count: waitlistCount },
    { count: hostsCount },
    { count: bookingsCount },
    { count: openReportsCount },
    { count: guestCount },
    { count: hostUserCount },
    { count: teamMemberCount },
    { data: recentApprovals },
  ] = await Promise.all([
    supabase.from('listing_approvals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('listing_approvals').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('listing_approvals').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
    supabase.from('waitlist').select('*', { count: 'exact', head: true }),
    supabase.from('hosts').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_role', 'user').is('deleted_at', null),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_role', 'host').is('deleted_at', null),
    supabase.from('host_team_members').select('*', { count: 'exact', head: true }).eq('status', 'active').neq('role', 'owner'),
    supabase.from('listing_approvals')
      .select('id, listing_title, host_name, status, submitted_at, listings(type, city)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false })
      .limit(6),
  ])
  return { pendingCount: pendingCount ?? 0, approvedCount: approvedCount ?? 0, rejectedCount: rejectedCount ?? 0, totalUsers: totalUsers ?? 0, activeListings: activeListings ?? 0, waitlistCount: waitlistCount ?? 0, hostsCount: hostsCount ?? 0, bookingsCount: bookingsCount ?? 0, openReportsCount: openReportsCount ?? 0, guestCount: guestCount ?? 0, hostUserCount: hostUserCount ?? 0, teamMemberCount: teamMemberCount ?? 0, recentApprovals: recentApprovals ?? [] }
}

export default async function AdminOverview() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin')
  if (error === 'mfa_required') redirect('/admin/mfa-verify?next=/admin')
  if (!role) redirect('/login?error=no_admin_role')

  const { pendingCount, approvedCount, rejectedCount, totalUsers, activeListings, waitlistCount, hostsCount, bookingsCount, openReportsCount, guestCount, hostUserCount, teamMemberCount, recentApprovals } = await getStats()

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <>
      <style>{`
        /* Topbar */
        .ov-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 60px; border-bottom: 1px solid var(--sr-border); background: var(--sr-surface); position: sticky; top: 0; z-index: 50; }
        .ov-topbar-left h1 { font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 700; color: var(--sr-text); }
        .ov-topbar-left .ov-date { font-size: 0.7rem; color: var(--sr-sub); margin-top: 2px; }

        /* Content */
        .ov-content { padding: 28px 32px; }

        /* Section label */
        .ov-section-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--sr-sub); margin-bottom: 12px; }

        /* Stat grid */
        .ov-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
        .ov-stat-card { background: var(--sr-surface); border: 1px solid var(--sr-border); border-radius: 12px; padding: 20px; text-decoration: none; display: block; transition: border-color 0.13s; }
        .ov-stat-card:hover { border-color: var(--sr-orange); }
        .ov-stat-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sr-sub); margin-bottom: 10px; }
        .ov-stat-val { font-family: 'DM Mono', monospace; font-size: 2rem; font-weight: 500; line-height: 1; margin-bottom: 6px; }
        .ov-stat-hint { font-size: 0.68rem; color: var(--sr-sub); }

        /* Color utils */
        .c-orange { color: var(--sr-orange); }
        .c-green  { color: var(--sr-green); }
        .c-red    { color: var(--sr-red); }
        .c-blue   { color: var(--sr-blue); }
        .c-yellow { color: var(--sr-yellow); }
        .c-purple { color: #C084FC; }
        .c-teal   { color: #2DD4BF; }
        .c-indigo { color: #818CF8; }

        /* Quick actions */
        .ov-action-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 36px; }
        .ov-action-card { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 14px; padding: 18px; text-decoration: none; display: flex; align-items: center; gap: 14px; transition: all 0.18s; }
        .ov-action-card:hover { border-color: var(--sr-orange); background: var(--sr-card2, var(--sr-card)); }
        .ov-action-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--sr-overlay-sm); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
        .ov-action-label { font-size: 0.86rem; font-weight: 700; color: var(--sr-text); margin-bottom: 2px; }
        .ov-action-desc  { font-size: 0.72rem; color: var(--sr-sub); }

        /* Pending approvals table */
        .ov-table-wrap { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 14px; overflow: hidden; }
        .ov-table-hdr  { display: grid; grid-template-columns: 1fr 110px 90px 100px 80px; gap: 12px; padding: 12px 20px; background: var(--sr-bg); border-bottom: 1px solid var(--sr-border); }
        .ov-table-hdr span { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sr-sub); }
        .ov-table-row { display: grid; grid-template-columns: 1fr 110px 90px 100px 80px; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--sr-border); align-items: center; }
        .ov-table-row:last-child { border-bottom: none; }
        .ov-table-row:hover { background: var(--sr-overlay-xs); }
        .ov-listing-title { font-size: 0.86rem; font-weight: 600; color: var(--sr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ov-listing-sub   { font-size: 0.72rem; color: var(--sr-sub); margin-top: 2px; }
        .ov-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px; font-size: 0.66rem; font-weight: 700; }
        .ov-badge.hotel        { background: var(--sr-bluel);   color: var(--sr-blue); }
        .ov-badge.private_stay { background: var(--sr-ol);      color: var(--sr-orange); }
        .ov-badge.pending      { background: var(--sr-yellowl); color: var(--sr-yellow); }
        .ov-date-text { font-size: 0.75rem; color: var(--sr-sub); }
        .ov-review-link { font-size: 0.75rem; color: var(--sr-orange); text-decoration: none; font-weight: 700; }
        .ov-review-link:hover { text-decoration: underline; }
        .ov-empty-row { padding: 44px; text-align: center; color: var(--sr-sub); font-size: 0.84rem; }

        @media (max-width: 1200px) {
          .ov-stat-grid   { grid-template-columns: repeat(3, 1fr); }
          .ov-action-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 900px) {
          .ov-stat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .ov-content { padding: 20px; }
          .ov-stat-grid { grid-template-columns: repeat(2, 1fr); }
          .ov-action-grid { grid-template-columns: 1fr 1fr; }
          .ov-table-hdr  { grid-template-columns: 1fr 80px 70px; }
          .ov-table-row  { grid-template-columns: 1fr 80px 70px; }
          .ov-table-row > *:nth-child(4),
          .ov-table-row > *:nth-child(5) { display: none; }
        }
      `}</style>

      {/* Topbar */}
      <div className="ov-topbar">
        <div className="ov-topbar-left">
          <h1>Overview</h1>
          <div className="ov-date">{today}</div>
        </div>
      </div>

      <div className="ov-content">

        {/* ── Stats ── */}
        <div className="ov-section-label">Platform Stats</div>
        <div className="ov-stat-grid">

          <div className="ov-stat-card">
            <div className="ov-stat-label">Pending Review</div>
            <div className="ov-stat-val c-yellow">{pendingCount}</div>
            <div className="ov-stat-hint">Listings awaiting approval</div>
          </div>

          <div className="ov-stat-card">
            <div className="ov-stat-label">Active Listings</div>
            <div className="ov-stat-val c-orange">{activeListings}</div>
            <div className="ov-stat-hint">{approvedCount} approved all-time</div>
          </div>

          <Link href="/admin/users" className="ov-stat-card">
            <div className="ov-stat-label">Total Users</div>
            <div className="ov-stat-val c-blue">{totalUsers}</div>
            <div className="ov-stat-hint">{guestCount} guests · {hostUserCount} hosts</div>
          </Link>

          <Link href="/admin/bookings" className="ov-stat-card">
            <div className="ov-stat-label">Total Bookings</div>
            <div className="ov-stat-val c-indigo">{bookingsCount}</div>
            <div className="ov-stat-hint">All-time</div>
          </Link>

          <Link href="/admin/hosts" className="ov-stat-card">
            <div className="ov-stat-label">Host Accounts</div>
            <div className="ov-stat-val c-teal">{hostsCount}</div>
            <div className="ov-stat-hint">{teamMemberCount} team members</div>
          </Link>

          <div className="ov-stat-card">
            <div className="ov-stat-label">Open Reports</div>
            <div className="ov-stat-val c-red">{openReportsCount}</div>
            <div className="ov-stat-hint">Needs review</div>
          </div>

          <div className="ov-stat-card">
            <div className="ov-stat-label">Approved</div>
            <div className="ov-stat-val c-green">{approvedCount}</div>
            <div className="ov-stat-hint">Listings approved</div>
          </div>

          <Link href="/admin/waitlist" className="ov-stat-card">
            <div className="ov-stat-label">Waitlist</div>
            <div className="ov-stat-val c-purple">{waitlistCount}</div>
            <div className="ov-stat-hint">Signups so far</div>
          </Link>

        </div>

        {/* ── Quick Actions ── */}
        <div className="ov-section-label">Quick Actions</div>
        <div className="ov-action-grid">
          <Link href="/admin/listings" className="ov-action-card">
            <div className="ov-action-icon">🏨</div>
            <div>
              <div className="ov-action-label">Listing Approvals</div>
              <div className="ov-action-desc">Review pending submissions</div>
            </div>
          </Link>
          <Link href="/admin/hosts" className="ov-action-card">
            <div className="ov-action-icon">👤</div>
            <div>
              <div className="ov-action-label">Manage Hosts</div>
              <div className="ov-action-desc">Verify, suspend or message</div>
            </div>
          </Link>
          <Link href="/admin/reports" className="ov-action-card">
            <div className="ov-action-icon">🚩</div>
            <div>
              <div className="ov-action-label">Open Reports</div>
              <div className="ov-action-desc">{openReportsCount} report{openReportsCount !== 1 ? 's' : ''} pending</div>
            </div>
          </Link>
          <Link href="/admin/refunds" className="ov-action-card">
            <div className="ov-action-icon">💸</div>
            <div>
              <div className="ov-action-label">Refunds</div>
              <div className="ov-action-desc">Process refund requests</div>
            </div>
          </Link>
          <Link href="/admin/finance" className="ov-action-card">
            <div className="ov-action-icon">📈</div>
            <div>
              <div className="ov-action-label">Finance</div>
              <div className="ov-action-desc">Revenue, GMV &amp; payouts</div>
            </div>
          </Link>
          <Link href="/superadmin/audit" className="ov-action-card">
            <div className="ov-action-icon">📋</div>
            <div>
              <div className="ov-action-label">Audit Log</div>
              <div className="ov-action-desc">View all admin actions</div>
            </div>
          </Link>
          <Link href="/admin/bookings" className="ov-action-card">
            <div className="ov-action-icon">📅</div>
            <div>
              <div className="ov-action-label">Bookings</div>
              <div className="ov-action-desc">View and manage bookings</div>
            </div>
          </Link>
          <Link href="/admin/waitlist" className="ov-action-card">
            <div className="ov-action-icon">📩</div>
            <div>
              <div className="ov-action-label">Waitlist</div>
              <div className="ov-action-desc">{waitlistCount} signup{waitlistCount !== 1 ? 's' : ''} so far</div>
            </div>
          </Link>
          <Link href="/superadmin/roles" className="ov-action-card">
            <div className="ov-action-icon">🔑</div>
            <div>
              <div className="ov-action-label">Manage Roles</div>
              <div className="ov-action-desc">Grant or revoke admin access</div>
            </div>
          </Link>
        </div>

        {/* ── Pending Approvals table ── */}
        <div className="ov-section-label">Pending Approvals</div>
        <div className="ov-table-wrap">
          <div className="ov-table-hdr">
            <span>Listing</span>
            <span>Type</span>
            <span>Status</span>
            <span>Submitted</span>
            <span></span>
          </div>
          {recentApprovals.length === 0
            ? <div className="ov-empty-row">✓ All caught up — no pending approvals</div>
            : recentApprovals.map(a => (
              <div key={a.id} className="ov-table-row">
                <div>
                  <div className="ov-listing-title">{a.listing_title ?? 'Untitled'}</div>
                  <div className="ov-listing-sub">{a.host_name ?? '—'}{a.listings?.city ? ` · ${a.listings.city}` : ''}</div>
                </div>
                <div>
                  <span className={`ov-badge ${a.listings?.type ?? ''}`}>
                    {a.listings?.type === 'hotel' ? 'Hotel' : 'Private'}
                  </span>
                </div>
                <div><span className="ov-badge pending">Pending</span></div>
                <div className="ov-date-text">
                  {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </div>
                <div><Link href="/admin/listings" className="ov-review-link">Review →</Link></div>
              </div>
            ))
          }
        </div>

      </div>
    </>
  )
}
