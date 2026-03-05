import SignOutButton from '../admin/_components/SignOutButton'
import ThemeToggle from '../components/ThemeToggle'
import SuperAdminNav from './_components/SuperAdminNav'

export const dynamic = 'force-dynamic'

export default function SuperAdminLayout({ children }) {
  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:var(--sr-bg); color:var(--sr-text); }
        .sa-shell { display:flex; min-height:100vh; }
        .sa-sidebar { width:220px; background:var(--sr-surface); border-right:1px solid var(--sr-border-solid); display:flex; flex-direction:column; padding:24px 0; flex-shrink:0; position:sticky; top:0; height:100vh; overflow-y:auto; }
        .sa-logo { padding:0 20px 24px; border-bottom:1px solid var(--sr-border-solid); margin-bottom:16px; }
        .sa-logo span { font-size:1rem; font-weight:800; color:var(--sr-orange); }
        .sa-logo small { display:block; font-size:0.62rem; color:var(--sr-orange); font-weight:700; margin-top:2px; text-transform:uppercase; letter-spacing:0.1em; opacity:0.7; }
        .sa-badge { margin:12px 20px 0; background:rgba(244,96,26,0.12); border:1px solid rgba(244,96,26,0.25); border-radius:8px; padding:8px 12px; font-size:0.7rem; font-weight:700; color:var(--sr-orange); text-transform:uppercase; letter-spacing:0.08em; text-align:center; }
        .sa-footer { margin-top:auto; padding:16px 12px; border-top:1px solid var(--sr-border-solid); }
        .sa-main { flex:1; overflow:auto; }
        @media(max-width:768px) { .sa-sidebar{display:none} }
      `}</style>
      <div className="sa-shell">
        <aside className="sa-sidebar">
          <div className="sa-logo">
            <span>SnapReserve</span>
            <small>⚡ Super Admin</small>
          </div>
          <SuperAdminNav />
          <div className="sa-badge">super_admin</div>
          <div className="sa-footer">
            <ThemeToggle style={{width:'100%',marginBottom:'8px',justifyContent:'center'}} />
            <SignOutButton />
          </div>
        </aside>
        <div className="sa-main">{children}</div>
      </div>
    </>
  )
}
