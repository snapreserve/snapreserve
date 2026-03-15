'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

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
    description: 'Our full support centre is coming soon. For urgent help email us at hello@snapreserve.app',
    color: '#16A34A',
  },
}

function ComingSoonContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const page = searchParams.get('page') || 'cars'
  const config = pageConfig[page] || pageConfig.cars

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'waitlist_enabled')
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.value === false) router.replace('/')
      })
  }, [])

  async function handleNotify(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('waitlist').insert({ email })
    if (!error || error.code === '23505') setSubmitted(true)
    setLoading(false)
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; background: var(--sr-bg); color: var(--sr-text); }
        .nav { display: flex; align-items: center; justify-content: space-between; padding: 0 48px; height: 68px; background: var(--sr-card); border-bottom: 1px solid var(--sr-border-solid,#E8E2D9); }
        .logo { text-decoration: none; display: inline-flex; align-items: center; }
        .logo img { height: 26px; width: auto; }
        html[data-theme="light"] .logo img { filter: drop-shadow(0 0 3px rgba(0,0,0,0.45)); }
        .page { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
        .card { background: var(--sr-card); border: 1px solid var(--sr-border-solid,#E8E2D9); border-radius: 24px; padding: 64px 48px; max-width: 520px; width: 100%; text-align: center; box-shadow: 0 8px 40px rgba(0,0,0,0.06); }
        .icon { font-size: 4rem; margin-bottom: 20px; }
        .badge { display: inline-block; padding: 6px 16px; border-radius: 100px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 20px; }
        .title { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; margin-bottom: 12px; color: var(--sr-text); }
        .description { font-size: 0.92rem; color: var(--sr-muted); line-height: 1.7; margin-bottom: 32px; }
        .notify-form { display: flex; gap: 8px; max-width: 360px; margin: 0 auto 24px; }
        .notify-input { flex: 1; background: var(--sr-surface); border: 1px solid var(--sr-border-solid,#E8E2D9); border-radius: 12px; padding: 12px 16px; font-size: 0.86rem; font-family: inherit; outline: none; color: var(--sr-text); }
        .notify-input:focus { border-color: #F4601A; }
        .notify-btn { border: none; border-radius: 12px; padding: 12px 20px; font-size: 0.86rem; font-weight: 700; color: white; cursor: pointer; font-family: inherit; white-space: nowrap; }
        .back-link { font-size: 0.84rem; color: var(--sr-sub); text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
        .back-link:hover { color: var(--sr-muted); }
        .footer { background: var(--sr-bg); color: var(--sr-muted); padding: 32px 48px; display: flex; align-items: center; justify-content: space-between; margin-top: auto; border-top: 1px solid var(--sr-border); }
        .footer-logo { display: inline-flex; align-items: center; }
        .footer-logo img { height: 22px; width: auto; }
        html[data-theme="light"] .footer-logo img { filter: drop-shadow(0 0 3px rgba(0,0,0,0.45)); }
      `}</style>

      <nav className="nav">
        <a href="/" className="logo"><img src="/logo.png" alt="SnapReserve" /></a>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/login" style={{padding:'8px 20px',borderRadius:'100px',fontSize:'0.84rem',fontWeight:'700',border:'1px solid var(--sr-border-solid,#D4CEC5)',color:'var(--sr-text)',textDecoration:'none'}}>Log in</a>
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

          {!submitted ? (
            <form className="notify-form" onSubmit={handleNotify}>
              <input
                className="notify-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button className="notify-btn" style={{background: config.color}} disabled={loading}>
                {loading ? '...' : 'Notify me'}
              </button>
            </form>
          ) : (
            <p style={{fontSize:'0.88rem',color:'#4ADE80',marginBottom:'24px',padding:'12px 20px',background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'12px'}}>
              ✅ You're on the list! We'll email you at launch.
            </p>
          )}


          <a href="/" className="back-link">← Back to SnapReserve™</a>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-logo"><img src="/logo.png" alt="SnapReserve" /></div>
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