import SignOutButton from '../admin/_components/SignOutButton'
import ThemeToggle from '../components/ThemeToggle'
import SuperAdminNav from './_components/SuperAdminNav'

export const dynamic = 'force-dynamic'

export default function SuperAdminLayout({ children }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Syne', -apple-system, sans-serif; background: var(--sr-bg); color: var(--sr-text); }
        .sa-shell   { display: flex; min-height: 100vh; }
        .sa-sidebar { width: 240px; background: var(--sr-surface); border-right: 1px solid var(--sr-border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; overflow-y: auto; }
        .sa-main    { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }

        /* Logo */
        .sa-logo-wrap { padding: 24px 20px 20px; border-bottom: 1px solid var(--sr-border); flex-shrink: 0; }
        .sa-logo-text { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 700; color: var(--sr-text); letter-spacing: -0.01em; }
        .sa-logo-text span { color: var(--sr-orange); }
        .sa-logo-text sup { font-size: 0.55em; vertical-align: super; opacity: 0.7; }
        .sa-logo-sub { font-size: 0.6rem; font-weight: 700; color: var(--sr-orange); text-transform: uppercase; letter-spacing: 0.14em; margin-top: 4px; opacity: 0.8; }

        /* Footer */
        .sa-footer { margin-top: auto; padding: 14px 12px; border-top: 1px solid var(--sr-border); flex-shrink: 0; }

        @media (max-width: 768px) {
          .sa-sidebar { display: none; }
          .sa-main { margin-left: 0; }
        }
      `}</style>

      <div className="sa-shell">
        <aside className="sa-sidebar">
          <div className="sa-logo-wrap">
            <div className="sa-logo-text">Snap<span>Reserve</span><sup>™</sup></div>
            <div className="sa-logo-sub">⚡ Super Admin</div>
          </div>
          <SuperAdminNav />
          <div className="sa-footer">
            <ThemeToggle style={{ width: '100%', marginBottom: '8px', justifyContent: 'center' }} />
            <SignOutButton />
          </div>
        </aside>
        <div className="sa-main">{children}</div>
      </div>
    </>
  )
}
