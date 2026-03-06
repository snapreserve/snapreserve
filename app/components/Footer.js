'use client'
// Shared site footer — used on home page, listings, and public pages

const SECTIONS = [
  {
    title: 'Company',
    links: [
      { label: 'About',   href: '/coming-soon?page=about' },
      { label: 'Careers', href: '/coming-soon?page=careers' },
      { label: 'Press',   href: '/coming-soon?page=press' },
    ],
  },
  {
    title: 'Hosting',
    links: [
      { label: 'Host with SnapReserve™', href: '/become-a-host' },
      { label: 'Host Resources',        href: '/coming-soon?page=host-resources' },
      { label: 'Host FAQ',              href: '/coming-soon?page=host-faq' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center',     href: '/coming-soon?page=support' },
      { label: 'Contact',         href: '/coming-soon?page=contact' },
      { label: 'Trust & Safety',  href: '/coming-soon?page=trust' },
      { label: 'Report a Listing', href: '/coming-soon?page=report' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy',   href: '/privacy' },
      { label: 'Cookie Policy',    href: '/coming-soon?page=cookies' },
      { label: 'Host Terms',       href: '/host-agreement' },
    ],
  },
]

// US destinations — live
const US_DESTINATIONS = ['New York', 'Los Angeles', 'Miami', 'Chicago', 'New Orleans', 'Las Vegas', 'San Francisco', 'Nashville']

// Coming soon — global expansion
const COMING_SOON = ['Dubai', 'London', 'Paris', 'Istanbul', 'Tokyo', 'Singapore', 'Sydney', 'Barcelona']

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://instagram.com/snapreserve',
    icon: (
      <svg width="17" height="17" fill="none" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    label: 'X',
    href: 'https://twitter.com/snapreserve',
    icon: (
      <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com/@snapreserve',
    icon: (
      <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://facebook.com/snapreserve',
    icon: (
      <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/snapreserve',
    icon: (
      <svg width="17" height="17" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
]

export default function Footer({ darkBg = true }) {
  const bg      = darkBg ? '#120E0A'      : '#faf6f0'
  const text    = darkBg ? '#F5F0EB'      : '#1a1208'
  const muted   = darkBg ? '#A89880'      : '#5a4a38'
  const dim     = darkBg ? '#6B5E52'      : '#8a7a6a'
  const border  = darkBg ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const logoAcc = '#F4601A'

  return (
    <footer style={{ background: bg, color: muted, paddingTop: 60, paddingBottom: 0, borderTop: `1px solid ${border}` }}>
      {/* MAIN GRID */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 48px 40px', display: 'grid', gridTemplateColumns: '1fr repeat(5, auto)', gap: 40, alignItems: 'start' }}>

        {/* Brand column */}
        <div>
          <div style={{ fontFamily: 'Playfair Display, Cormorant Garamond, serif', fontSize: '1.2rem', fontWeight: 700, color: text, marginBottom: 10 }}>
            Snap<span style={{ color: logoAcc }}>Reserve™</span>
          </div>
          <p style={{ fontSize: '0.8rem', lineHeight: 1.75, maxWidth: 200, color: dim, marginBottom: 20 }}>
            Book unique hotels and spaces, instantly. A next-generation booking platform built for modern travellers.
          </p>
          {/* Social icons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {SOCIALS.map(s => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                title={s.label}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: darkBg ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  border: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: dim, textDecoration: 'none', transition: 'all 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = logoAcc; e.currentTarget.style.borderColor = 'rgba(244,96,26,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.color = dim; e.currentTarget.style.borderColor = border }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Link sections */}
        {SECTIONS.map(sec => (
          <div key={sec.title}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted, marginBottom: 14 }}>
              {sec.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {sec.links.map(l => (
                <a
                  key={l.label}
                  href={l.href}
                  style={{ fontSize: '0.82rem', color: dim, textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = text }}
                  onMouseLeave={e => { e.currentTarget.style.color = dim }}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* POPULAR DESTINATIONS */}
      <div style={{ borderTop: `1px solid ${border}`, maxWidth: 1280, margin: '0 auto', padding: '32px 48px' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted, marginBottom: 16 }}>
          Popular Destinations
        </div>
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', alignItems: 'start' }}>
          {/* Live destinations */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: muted, marginBottom: 10 }}>United States</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
              {US_DESTINATIONS.map(city => (
                <a
                  key={city}
                  href={`/listings?country=United+States&city=${encodeURIComponent(city)}`}
                  style={{ fontSize: '0.8rem', color: dim, textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = text }}
                  onMouseLeave={e => { e.currentTarget.style.color = dim }}
                >
                  {city}
                </a>
              ))}
            </div>
          </div>

          {/* Coming soon */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: dim, marginBottom: 10 }}>Coming Soon</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
              {COMING_SOON.map(city => (
                <span key={city} style={{ fontSize: '0.8rem', color: dim, opacity: 0.55 }}>
                  {city} <span style={{ fontSize: '0.62rem', color: logoAcc, fontWeight: 700, opacity: 0.7 }}>Soon</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BETA NOTICE + COPYRIGHT */}
      <div style={{ borderTop: `1px solid ${border}`, maxWidth: 1280, margin: '0 auto', padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: '0.72rem', color: dim }}>
          <span style={{ background: darkBg ? 'rgba(244,96,26,0.1)' : 'rgba(244,96,26,0.08)', border: '1px solid rgba(244,96,26,0.2)', color: logoAcc, borderRadius: 100, padding: '2px 8px', fontSize: '0.62rem', fontWeight: 700, marginRight: 8 }}>BETA</span>
          SnapReserve™™ is currently in beta. Features may change during early access.
        </div>
        <div style={{ fontSize: '0.72rem', color: dim }}>© 2026 SnapReserve™™, Inc. All rights reserved.</div>
      </div>

      {/* Bottom padding */}
      <div style={{ height: 24 }} />

      <style>{`
        @media (max-width: 1024px) {
          footer > div:first-child { grid-template-columns: 1fr 1fr 1fr !important; }
        }
        @media (max-width: 768px) {
          footer > div:first-child { grid-template-columns: 1fr 1fr !important; padding: 0 20px 32px !important; }
          footer > div:nth-child(2), footer > div:nth-child(3) { padding-left: 20px !important; padding-right: 20px !important; }
        }
        @media (max-width: 480px) {
          footer > div:first-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  )
}
