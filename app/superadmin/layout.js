import SignOutButton from '../admin/_components/SignOutButton'
import SuperAdminNav from './_components/SuperAdminNav'
import ThemeToggle from '../components/ThemeToggle'

export const dynamic = 'force-dynamic'

export default function SuperAdminLayout({ children }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: var(--sr-bg); color: var(--sr-text); }
        .sa-shell { display: flex; min-height: 100vh; }
        .sa-main  { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        @media (max-width: 768px) {
          .hs-sidebar { display: none; }
          .sa-main    { margin-left: 0; }
        }
      `}</style>

      <div className="sa-shell">
        <aside className="hs-sidebar">
          <div className="hs-logo-wrap">
            <a href="/" className="hs-logo-text">
              <img src="/logo.png" alt="SnapReserve" />
            </a>
            <div className="hs-logo-sub">⚡ Super Admin</div>
          </div>
          <SuperAdminNav />
          <div className="hs-sidebar-footer">
            <ThemeToggle style={{ width: '100%', justifyContent: 'center', marginBottom: '8px' }} />
            <SignOutButton />
          </div>
        </aside>
        <div className="sa-main">{children}</div>
      </div>
    </>
  )
}
