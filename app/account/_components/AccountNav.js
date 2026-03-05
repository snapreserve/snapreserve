'use client'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAV_SECTIONS = [
  {
    label: 'My Account',
    items: [
      { href: '/dashboard',        icon: '🏡', label: 'Dashboard' },
      { href: '/account/trips',    icon: '🧳', label: 'My Trips' },
      { href: '/account/saved',    icon: '❤️',  label: 'Saved Stays' },
      { href: '/account/messages', icon: '💬', label: 'Messages' },
    ],
  },
  {
    label: 'History & Reviews',
    items: [
      { href: '/account/trips?tab=past',      icon: '⭐', label: 'My Reviews' },
      { href: '/account/trips?tab=past',      icon: '📜', label: 'Booking History' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/account/payments',      icon: '💳', label: 'Payments' },
      { href: '/account/profile',       icon: '👤', label: 'Profile & Settings' },
      { href: '/account/notifications', icon: '🔔', label: 'Notifications' },
      { href: '/account/security',      icon: '🔒', label: 'Security' },
    ],
  },
]

export default function AccountNav({ profile, isHost }) {
  const pathname = usePathname()
  const router = useRouter()

  const initials = profile?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  const isVerified = profile?.verification_status === 'verified'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function isActive(href) {
    const path = href.split('?')[0]
    return pathname === path || (pathname.startsWith(path + '/') && path !== '/dashboard')
  }

  return (
    <aside style={{
      width: '240px', flexShrink: 0, background: 'var(--sr-card)',
      borderRight: '1px solid var(--sr-border2)', display: 'flex',
      flexDirection: 'column', minHeight: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <a href="/" style={{
        display: 'block', padding: '20px 24px 16px',
        fontFamily: "'Playfair Display', serif", fontSize: '1.15rem',
        fontWeight: 900, textDecoration: 'none', color: 'var(--sr-text)',
        borderBottom: '1px solid var(--sr-border2)',
      }}>
        Snap<span style={{ color: 'var(--sr-orange)' }}>Reserve</span>
      </a>

      {/* User info */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--sr-border2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--sr-orange)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--sr-card)',
            flexShrink: 0,
          }}>{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--sr-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name || 'My Account'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.email}
            </div>
            {isVerified && (
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#34D399', marginTop: '2px', display: 'flex', alignItems: 'center', gap: 3 }}>
                ✓ Verified Guest
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            <div style={{
              fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--sr-sub)',
              padding: '10px 24px 4px',
            }}>
              {section.label}
            </div>
            {section.items.map(item => {
              const active = isActive(item.href)
              return (
                <a key={item.href + item.label} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 24px', fontSize: '0.86rem', fontWeight: active ? 700 : 500,
                  textDecoration: 'none', transition: 'background 0.12s',
                  color: active ? 'var(--sr-orange)' : 'var(--sr-text)',
                  background: active ? 'rgba(244,96,26,0.06)' : 'transparent',
                  borderLeft: active ? '3px solid var(--sr-orange)' : '3px solid transparent',
                }}>
                  <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{item.icon}</span>
                  {item.label}
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--sr-border2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isHost ? (
          <a href="/host/dashboard" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: '0.82rem', fontWeight: 700, color: '#fff',
            textDecoration: 'none', padding: '10px 14px',
            background: 'var(--sr-orange)', borderRadius: '8px',
            border: '1px solid var(--sr-orange)',
          }}>
            <span>🏠 Switch to Host Portal</span>
            <span style={{ opacity: 0.8 }}>→</span>
          </a>
        ) : (
          <a href="/become-a-host" style={{
            fontSize: '0.78rem', fontWeight: 700, color: 'var(--sr-orange)',
            textDecoration: 'none', padding: '8px 14px',
            background: 'rgba(244,96,26,0.06)', borderRadius: '8px',
            border: '1px solid rgba(244,96,26,0.15)',
          }}>
            List your property →
          </a>
        )}
        <a href="/" style={{ fontSize: '0.78rem', color: 'var(--sr-muted)', textDecoration: 'none' }}>
          ← Browse properties
        </a>
        <button onClick={handleSignOut} style={{
          background: 'none', border: '1px solid var(--sr-border2)', borderRadius: '8px',
          padding: '7px 14px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--sr-sub)',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
