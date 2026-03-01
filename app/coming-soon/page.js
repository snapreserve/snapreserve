'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const pageConfig = {
  cars: {
    icon: '🚗',
    title: 'Cars',
    description: 'Rent premium cars from verified hosts — coming to SnapReserve™ soon.',
    color: '#1A6EF4',
  },
  experiences: {
    icon: '✨',
    title: 'Experiences',
    description: 'Book unique local experiences with expert hosts — coming to SnapReserve™ soon.',
    color: '#F4601A',
  },
  support: {
    icon: '💬',
    title: 'Support',
    description: 'Our full support centre is coming soon. For urgent help email us at hello@snapreserve.co',
    color: '#16A34A',
  },
}

function ComingSoonContent() {
  const searchParams = useSearchParams()
  const page = searchParams.get('page') || 'cars'
  const config = pageConfig[page] || pageConfig.cars

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: #FAF8F5; }
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: white; border-bottom: 1px solid #E8E2D9; }
        .logo { font-family: 'Playfair Display', serif; font-size: 1.3rem; font-weight: 900; text-decoration: none; color: #1A1410; }
        .logo span { color: #F4601A; }
        .page { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
        .card { background: white; border: 1px solid #E8E2D9; border-radius: 24px; padding: 64px 48px; max-width: 520px; width: 100%; text-align: center; box-shadow: 0 8px 40px rgba(0,0,0,0.06); }
        .icon { font-size: 4rem; margin-bottom: 20px; }
        .badge { display: inline-block; padding: 6px 16px; border-radius: 100px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 20px; }
        .title { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; margin-bottom: 12px; }
        .description { font-size: 0.92rem; color: #6B5F54; line-height: 1.7; margin-bottom: 32px; }
        .notify-form { display: flex; gap: 8px; max-width: 360px; margin: 0 auto 24px; }
        .notify-input { flex: 1; background: #FAF8F5; border: 1px solid #E8E2D9; border-radius: 12px; padding: 12px 16px; font-size: 0.86rem; font-family: inherit; outline: none; }
        .notify-input:focus { border-color: #F4601A; }
        .notify-btn { border: none; border-radius: 12px; padding: 12px 20px; font-size: 0.86rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; white-space: nowrap; }
        .back-link { font-size: 0.84rem; color: #A89880; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
        .back-link:hover { color: #6B5F54; }
        .footer { background: #1A1410; color: #A89880; padding: 32px 48px; display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
        .footer-logo { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 700; color: #F5EFE8; }
        .footer-logo span { color: #F4601A; }
      `}</style>

      <nav className="nav">
        <a href="/" className="logo">Snap<span>Reserve™</span></a>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/login" style={{padding:'8px 20px',borderRadius:'100px',fontSize:'0.84rem',fontWeight:'700',border:'1px solid #D4CEC5',color:'#1A1410',textDecoration:'none'}}>Log in</a>
          <a href="/signup" style={{padding:'8px 20px',borderRadius:'100px',fontSize:'0.84rem',fontWeight:'700',background:'#F4601A',color:'white',textDecoration:'none'}}>Sign up</a>
        </div>
      </nav>

      <div className="page">
        <div className="card">
          <div className="icon">{config.icon}</div>
          <div className="badge" style={{background: `${config.color}15`, color: config.color}}>
            Coming Soon
          </div>
          <div className="title">{config.title}</div>
          <p className="description">{config.description}</p>

          <div className="notify-form">
            <input className="notify-input" type="email" placeholder="your@email.com" />
            <button className="notify-btn" style={{background: config.color}}>Notify me</button>
          </div>

          <a href="/" className="back-link">← Back to SnapReserve™</a>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-logo">Snap<span>Reserve™</span></div>
        <div style={{fontSize:'0.74rem'}}>© 2026 SnapReserve™ · snapreserve.app</div>
      </footer>
    </>
  )
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ComingSoonContent />
    </Suspense>
  )
}