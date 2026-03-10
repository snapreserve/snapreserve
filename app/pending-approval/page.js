'use client'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function PendingApprovalPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0F0D0A; font-family: 'DM Sans', sans-serif; color: #F5F0EB; }
        .pa-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .pa-card {
          background: #1A1712;
          border: 1px solid #2A2420;
          border-radius: 20px;
          padding: 48px 40px;
          width: 100%;
          max-width: 460px;
          text-align: center;
        }
        .pa-logo {
          font-size: 1.3rem;
          font-weight: 800;
          color: #F4601A;
          text-decoration: none;
          display: inline-block;
          margin-bottom: 36px;
          letter-spacing: -0.01em;
        }
        .pa-icon {
          width: 64px;
          height: 64px;
          background: rgba(244,96,26,0.1);
          border: 1.5px solid rgba(244,96,26,0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 1.75rem;
        }
        .pa-heading {
          font-size: 1.35rem;
          font-weight: 800;
          color: #F5F0EB;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }
        .pa-body {
          font-size: 0.9rem;
          color: #A08070;
          line-height: 1.65;
          margin-bottom: 32px;
        }
        .pa-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(251,191,36,0.1);
          border: 1px solid rgba(251,191,36,0.25);
          border-radius: 20px;
          padding: 5px 14px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #FBBF24;
          margin-bottom: 32px;
        }
        .pa-badge::before {
          content: '';
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #FBBF24;
        }
        .pa-signout {
          background: none;
          border: 1px solid #2A2420;
          border-radius: 10px;
          padding: 11px 24px;
          color: #A08070;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.13s;
          width: 100%;
        }
        .pa-signout:hover {
          border-color: #F4601A;
          color: #F4601A;
        }
      `}</style>
      <div className="pa-shell">
        <div className="pa-card">
          <a href="/home" className="pa-logo">SnapReserve™</a>
          <div className="pa-icon">⏳</div>
          <div className="pa-heading">Account Pending Approval</div>
          <div className="pa-badge">Under Review</div>
          <p className="pa-body">
            Your account and ID verification are under review. You won't be able to access any platform features until an admin has approved your account. We'll notify you once that's done—typically within 24 hours.
          </p>
          <button className="pa-signout" onClick={handleSignOut}>Sign Out</button>
        </div>
      </div>
    </>
  )
}
