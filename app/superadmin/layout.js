import Link from 'next/link'
import SignOutButton from '../admin/_components/SignOutButton'

export const dynamic = 'force-dynamic'

export default function SuperAdminLayout({ children }) {
  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#0F0D0A; color:#F5F0EB; }
        .sa-shell { display:flex; min-height:100vh; }
        .sa-sidebar { width:220px; background:#1A1712; border-right:1px solid #2A2420; display:flex; flex-direction:column; padding:24px 0; flex-shrink:0; position:sticky; top:0; height:100vh; }
        .sa-logo { padding:0 20px 24px; border-bottom:1px solid #2A2420; margin-bottom:16px; }
        .sa-logo span { font-size:1rem; font-weight:800; color:#F4601A; }
        .sa-logo small { display:block; font-size:0.62rem; color:#F4601A; font-weight:700; margin-top:2px; text-transform:uppercase; letter-spacing:0.1em; opacity:0.7; }
        .nav-section { padding:0 12px; margin-bottom:8px; }
        .nav-label { font-size:0.6rem; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#6B5E52; padding:0 8px; margin-bottom:6px; }
        .nav-link { display:flex; align-items:center; gap:10px; padding:9px 8px; border-radius:8px; color:#A89880; font-size:0.85rem; font-weight:500; text-decoration:none; transition:all 0.15s; }
        .nav-link:hover { background:#2A2420; color:#F5F0EB; }
        .icon { font-size:1rem; width:20px; text-align:center; }
        .sa-badge { margin:12px 20px 0; background:rgba(244,96,26,0.12); border:1px solid rgba(244,96,26,0.25); border-radius:8px; padding:8px 12px; font-size:0.7rem; font-weight:700; color:#F4601A; text-transform:uppercase; letter-spacing:0.08em; text-align:center; }
        .sa-footer { margin-top:auto; padding:16px 12px; border-top:1px solid #2A2420; }
        .sa-main { flex:1; overflow:auto; }
        @media(max-width:768px) { .sa-sidebar{display:none} }
      `}</style>
      <div className="sa-shell">
        <aside className="sa-sidebar">
          <div className="sa-logo">
            <span>SnapReserve</span>
            <small>⚡ Super Admin</small>
          </div>
          <div className="nav-section">
            <div className="nav-label">Admin</div>
            <Link href="/admin" className="nav-link"><span className="icon">📊</span>Overview</Link>
            <Link href="/admin/listings" className="nav-link"><span className="icon">🏨</span>Listings</Link>
            <Link href="/admin/hosts" className="nav-link"><span className="icon">👤</span>Hosts</Link>
            <Link href="/admin/guests" className="nav-link"><span className="icon">🧳</span>Guests</Link>
            <Link href="/admin/bookings" className="nav-link"><span className="icon">📅</span>Bookings</Link>
            <Link href="/admin/reports" className="nav-link"><span className="icon">🚩</span>Reports</Link>
            <Link href="/admin/refunds" className="nav-link"><span className="icon">💸</span>Refunds</Link>
            <Link href="/admin/waitlist" className="nav-link"><span className="icon">📩</span>Waitlist</Link>
          </div>
          <div className="nav-section">
            <div className="nav-label">Super Admin</div>
            <Link href="/superadmin" className="nav-link"><span className="icon">⚡</span>Dashboard</Link>
            <Link href="/superadmin/roles" className="nav-link"><span className="icon">🔑</span>Roles</Link>
            <Link href="/superadmin/audit" className="nav-link"><span className="icon">📋</span>Audit Log</Link>
            <Link href="/superadmin/invites" className="nav-link"><span className="icon">✉️</span>Invites</Link>
            <Link href="/superadmin/settings" className="nav-link"><span className="icon">⚙️</span>Settings</Link>
          </div>
          <div className="sa-badge">super_admin</div>
          <div className="sa-footer">
            <SignOutButton />
          </div>
        </aside>
        <div className="sa-main">{children}</div>
      </div>
    </>
  )
}
