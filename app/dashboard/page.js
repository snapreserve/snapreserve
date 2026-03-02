'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const propertyImages = [
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
]

const navItems = [
  { id: 'overview', label: 'OVERVIEW', type: 'section' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'earnings', label: 'Earnings', icon: '💰' },
  { id: 'manage', label: 'MANAGE', type: 'section' },
  { id: 'properties', label: 'My Properties', icon: '🏠' },
  { id: 'bookings', label: 'Bookings', icon: '📅', badge: 0 },
  { id: 'calendar', label: 'Calendar', icon: '🗓️' },
  { id: 'communication', label: 'COMMUNICATION', type: 'section' },
  { id: 'messages', label: 'Messages', icon: '💬', badge: 0 },
  { id: 'reviews', label: 'Reviews', icon: '⭐' },
  { id: 'account', label: 'ACCOUNT', type: 'section' },
  { id: 'payouts', label: 'Payouts', icon: '💳' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('properties')
  const [menuOpen, setMenuOpen] = useState(null)
  const [dark, setDark] = useState(true)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  useEffect(() => {
    // Persist theme preference
    const saved = localStorage.getItem('dashboard_theme')
    if (saved) setDark(saved === 'dark')

    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: profileData } = await supabase.from('users').select('*').eq('id', user.id).single()
      setProfile(profileData)
      const { data: listingsData } = await supabase.from('listings').select('*').eq('host_id', user.id).order('created_at', { ascending: false })
      setListings(listingsData || [])
      setLoading(false)
    }
    loadData()
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('dashboard_theme', next ? 'dark' : 'light')
  }

  async function togglePublish(id, currentStatus) {
    await supabase.from('listings').update({ is_active: !currentStatus }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_active: !currentStatus } : l))
    setMenuOpen(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'

  // THEME TOKENS
  const t = dark ? {
    bg: '#0F0D0A',
    sidebar: '#0F0D0A',
    sidebarBorder: 'rgba(255,255,255,0.07)',
    topbar: '#0F0D0A',
    topbarBorder: 'rgba(255,255,255,0.07)',
    card: '#1A1712',
    cardBorder: 'rgba(255,255,255,0.08)',
    cardBorderHover: 'rgba(255,255,255,0.15)',
    propStat: 'rgba(255,255,255,0.04)',
    text: 'white',
    textMuted: 'rgba(255,255,255,0.4)',
    textFaint: 'rgba(255,255,255,0.25)',
    navText: 'rgba(255,255,255,0.5)',
    navHover: 'rgba(255,255,255,0.06)',
    navSection: 'rgba(255,255,255,0.25)',
    iconBtn: 'rgba(255,255,255,0.07)',
    iconBtnColor: 'rgba(255,255,255,0.6)',
    dateBadge: 'rgba(255,255,255,0.07)',
    dateBadgeBorder: 'rgba(255,255,255,0.1)',
    dateBadgeText: 'rgba(255,255,255,0.5)',
    dropdown: '#2A2420',
    dropdownBorder: 'rgba(255,255,255,0.1)',
    menuItem: 'rgba(255,255,255,0.7)',
    menuItemHover: 'rgba(255,255,255,0.07)',
    secondaryBtn: 'rgba(255,255,255,0.07)',
    secondaryBtnText: 'rgba(255,255,255,0.7)',
    addCard: 'rgba(255,255,255,0.03)',
    addCardBorder: 'rgba(255,255,255,0.1)',
    addIcon: 'rgba(255,255,255,0.07)',
    addTitle: 'rgba(255,255,255,0.6)',
    addSub: 'rgba(255,255,255,0.25)',
    notHostBg: 'rgba(244,96,26,0.08)',
    notHostBorder: 'rgba(244,96,26,0.2)',
    themeToggleBg: 'rgba(255,255,255,0.07)',
    themeToggleColor: 'rgba(255,255,255,0.6)',
  } : {
    bg: '#F5F3EF',
    sidebar: 'white',
    sidebarBorder: '#E8E2D9',
    topbar: 'white',
    topbarBorder: '#E8E2D9',
    card: 'white',
    cardBorder: '#E8E2D9',
    cardBorderHover: '#D4CEC5',
    propStat: '#FAF8F5',
    text: '#1A1410',
    textMuted: '#6B5F54',
    textFaint: '#A89880',
    navText: '#6B5F54',
    navHover: '#F3F0EB',
    navSection: '#A89880',
    iconBtn: '#F3F0EB',
    iconBtnColor: '#6B5F54',
    dateBadge: '#F3F0EB',
    dateBadgeBorder: '#E8E2D9',
    dateBadgeText: '#6B5F54',
    dropdown: 'white',
    dropdownBorder: '#E8E2D9',
    menuItem: '#1A1410',
    menuItemHover: '#FAF8F5',
    secondaryBtn: '#F3F0EB',
    secondaryBtnText: '#6B5F54',
    addCard: '#FAF8F5',
    addCardBorder: '#E8E2D9',
    addIcon: '#E8E2D9',
    addTitle: '#6B5F54',
    addSub: '#A89880',
    notHostBg: '#FFF3ED',
    notHostBorder: 'rgba(244,96,26,0.2)',
    themeToggleBg: '#F3F0EB',
    themeToggleColor: '#6B5F54',
  }

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background: dark ? '#0F0D0A' : '#F5F3EF',fontFamily:'sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:'2rem',marginBottom:'12px'}}>⏳</div>
        <div style={{color: dark ? 'rgba(255,255,255,0.5)' : '#6B5F54'}}>Loading your dashboard...</div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', -apple-system, sans-serif; }
        .layout { display: flex; min-height: 100vh; background: ${t.bg}; transition: background 0.3s; }
        .sidebar { width: 210px; background: ${t.sidebar}; border-right: 1px solid ${t.sidebarBorder}; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; transition: background 0.3s, border-color 0.3s; }
        .sidebar-logo { padding: 20px 20px 16px; border-bottom: 1px solid ${t.sidebarBorder}; }
        .logo-text { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 900; color: ${t.text}; text-decoration: none; display: block; }
        .logo-text span { color: #F4601A; }
        .logo-sub { font-size: 0.62rem; font-weight: 700; color: ${t.navSection}; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 2px; }
        .sidebar-nav { flex: 1; padding: 16px 12px; overflow-y: auto; }
        .nav-section { font-size: 0.6rem; font-weight: 700; color: ${t.navSection}; text-transform: uppercase; letter-spacing: 0.12em; padding: 12px 8px 6px; }
        .nav-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 10px; border-radius: 10px; cursor: pointer; transition: all 0.18s; margin-bottom: 2px; color: ${t.navText}; font-size: 0.86rem; font-weight: 500; }
        .nav-item:hover { background: ${t.navHover}; color: ${t.text}; }
        .nav-item.active { background: #F4601A; color: white; font-weight: 700; }
        .nav-item-left { display: flex; align-items: center; gap: 10px; }
        .nav-icon { font-size: 0.9rem; width: 20px; text-align: center; }
        .nav-badge { background: #F4601A; color: white; font-size: 0.62rem; font-weight: 800; padding: 2px 7px; border-radius: 100px; }
        .nav-item.active .nav-badge { background: white; color: #F4601A; }
        .sidebar-footer { padding: 16px 12px; border-top: 1px solid ${t.sidebarBorder}; }
        .user-row { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px; cursor: pointer; }
        .user-row:hover { background: ${t.navHover}; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #F4601A; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.78rem; color: white; flex-shrink: 0; }
        .user-name { font-size: 0.78rem; font-weight: 700; color: ${t.text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 0.66rem; color: ${t.textMuted}; }
        .logout-btn { background: none; border: none; color: ${t.textMuted}; cursor: pointer; font-size: 0.8rem; padding: 4px; }
        .logout-btn:hover { color: ${t.text}; }
        .main { margin-left: 210px; flex: 1; display: flex; flex-direction: column; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 64px; border-bottom: 1px solid ${t.topbarBorder}; background: ${t.topbar}; position: sticky; top: 0; z-index: 50; transition: background 0.3s; }
        .page-title { font-size: 1.3rem; font-weight: 700; color: ${t.text}; }
        .date-badge { background: ${t.dateBadge}; border: 1px solid ${t.dateBadgeBorder}; border-radius: 8px; padding: 6px 14px; font-size: 0.78rem; color: ${t.dateBadgeText}; }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .icon-btn { width: 36px; height: 36px; border-radius: 10px; background: ${t.iconBtn}; border: none; color: ${t.iconBtnColor}; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all 0.18s; }
        .icon-btn:hover { opacity: 0.8; }
        .theme-toggle { width: 72px; height: 36px; border-radius: 100px; background: ${t.themeToggleBg}; border: 1px solid ${t.sidebarBorder}; cursor: pointer; display: flex; align-items: center; padding: 3px; position: relative; transition: all 0.3s; }
        .theme-toggle-knob { width: 28px; height: 28px; border-radius: 50%; background: #F4601A; transition: transform 0.3s; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; transform: ${dark ? 'translateX(0)' : 'translateX(36px)'}; }
        .add-btn { background: #F4601A; color: white; border: none; border-radius: 10px; padding: 9px 18px; font-size: 0.84rem; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px; }
        .add-btn:hover { background: #FF7A35; }
        .content { padding: 28px 32px; flex: 1; }
        .property-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .prop-card { background: ${t.card}; border: 1px solid ${t.cardBorder}; border-radius: 16px; overflow: hidden; transition: all 0.22s; position: relative; }
        .prop-card:hover { border-color: ${t.cardBorderHover}; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,${dark ? '0.3' : '0.1'}); }
        .prop-img { height: 180px; position: relative; overflow: hidden; }
        .prop-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .prop-card:hover .prop-img img { transform: scale(1.04); }
        .prop-status { position: absolute; top: 12px; left: 12px; padding: 4px 12px; border-radius: 100px; font-size: 0.68rem; font-weight: 700; }
        .prop-status.live { background: #16A34A; color: white; }
        .prop-status.draft { background: rgba(0,0,0,0.45); color: rgba(255,255,255,0.85); }
        .prop-menu-btn { position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: white; cursor: pointer; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; letter-spacing: 1px; }
        .prop-body { padding: 16px 18px; }
        .prop-name { font-size: 1rem; font-weight: 700; color: ${t.text}; margin-bottom: 4px; }
        .prop-location { font-size: 0.76rem; color: ${t.textMuted}; margin-bottom: 16px; }
        .prop-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
        .prop-stat { background: ${t.propStat}; border-radius: 10px; padding: 10px; text-align: center; }
        .prop-stat-val { font-size: 0.96rem; font-weight: 700; color: #F4601A; margin-bottom: 2px; }
        .prop-stat-label { font-size: 0.64rem; color: ${t.textFaint}; text-transform: uppercase; letter-spacing: 0.05em; }
        .prop-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .prop-btn { border-radius: 10px; padding: 10px; font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: inherit; border: none; transition: all 0.18s; text-align: center; text-decoration: none; display: block; }
        .prop-btn.primary { background: #F4601A; color: white; }
        .prop-btn.primary:hover { background: #FF7A35; }
        .prop-btn.secondary { background: ${t.secondaryBtn}; color: ${t.secondaryBtnText}; }
        .prop-btn.secondary:hover { opacity: 0.8; }
        .prop-btn.publish { background: #16A34A; color: white; }
        .add-card { background: ${t.addCard}; border: 2px dashed ${t.addCardBorder}; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 340px; cursor: pointer; transition: all 0.22s; text-decoration: none; }
        .add-card:hover { border-color: rgba(244,96,26,0.4); background: rgba(244,96,26,0.04); }
        .add-icon { width: 48px; height: 48px; border-radius: 50%; background: ${t.addIcon}; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-bottom: 14px; color: ${t.text}; }
        .add-title { font-size: 0.94rem; font-weight: 700; color: ${t.addTitle}; margin-bottom: 4px; }
        .add-sub { font-size: 0.76rem; color: ${t.addSub}; }
        .empty-state { text-align: center; padding: 80px 20px; }
        .empty-title { font-family: 'Playfair Display', serif; font-size: 1.4rem; font-weight: 700; color: ${t.text}; margin-bottom: 8px; }
        .empty-sub { font-size: 0.86rem; color: ${t.textMuted}; margin-bottom: 24px; }
        .menu-dropdown { position: absolute; top: 44px; right: 10px; background: ${t.dropdown}; border: 1px solid ${t.dropdownBorder}; border-radius: 12px; padding: 6px; z-index: 50; min-width: 160px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
        .menu-item { padding: 9px 14px; border-radius: 8px; font-size: 0.82rem; cursor: pointer; color: ${t.menuItem}; transition: all 0.15s; display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .menu-item:hover { background: ${t.menuItemHover}; }
        .menu-item.danger { color: #F87171; }
        .menu-item.danger:hover { background: rgba(248,113,113,0.1); }
        .not-host-banner { background: ${t.notHostBg}; border: 1px solid ${t.notHostBorder}; border-radius: 16px; padding: 24px 28px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .nhb-text h3 { font-size: 1rem; font-weight: 700; color: ${t.text}; margin-bottom: 4px; }
        .nhb-text p { font-size: 0.82rem; color: ${t.textMuted}; }
        .nhb-btn { background: #F4601A; color: white; border: none; padding: 10px 24px; border-radius: 100px; font-weight: 700; font-size: 0.86rem; cursor: pointer; font-family: inherit; }
        @media (max-width: 1100px) { .property-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 768px) { .sidebar { display: none; } .main { margin-left: 0; } .property-grid { grid-template-columns: 1fr; } .content { padding: 20px; } }
      `}</style>

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <a href="/home" className="logo-text">Snap<span>Reserve™</span></a>
            <div className="logo-sub">Host Dashboard</div>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => {
              if (item.type === 'section') return <div key={item.id} className="nav-section">{item.label}</div>
              const badge = item.id === 'properties' ? listings.length : item.badge
              return (
                <div key={item.id} className={`nav-item ${activeNav === item.id ? 'active' : ''}`} onClick={() => setActiveNav(item.id)}>
                  <div className="nav-item-left">
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {badge > 0 && <span className="nav-badge">{badge}</span>}
                </div>
              )
            })}
          </nav>
          <div className="sidebar-footer">
            <div className="user-row">
              <div className="user-avatar">{initials}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="user-name">{profile?.full_name || 'Host'}</div>
                <div className="user-role">{profile?.is_host ? 'Host Account' : 'Guest Account'}</div>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Log out">↪</button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="main">
          <div className="topbar">
            <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
              <div className="page-title">
                {navItems.find(n => n.id === activeNav)?.label || 'Dashboard'}
              </div>
              <div className="date-badge">{today}</div>
            </div>
            <div className="topbar-right">
              {/* THEME TOGGLE */}
              <button className="theme-toggle" onClick={toggleTheme} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
                <div className="theme-toggle-knob">
                  {dark ? '🌙' : '☀️'}
                </div>
              </button>
              <button className="icon-btn">🔔</button>
              <button className="icon-btn">❓</button>
              <button className="add-btn" onClick={() => setActiveNav('properties')}>+ Add Property</button>
            </div>
          </div>

          <div className="content">
            {!profile?.is_host && (
              <div className="not-host-banner">
                <div className="nhb-text">
                  <h3>🏠 Switch to Host Mode</h3>
                  <p>You're currently a guest. Switch to host to list your properties.</p>
                </div>
                <button className="nhb-btn" onClick={async () => {
                  await supabase.from('users').update({ is_host: true }).eq('id', user.id)
                  setProfile(prev => ({ ...prev, is_host: true }))
                }}>Become a Host →</button>
              </div>
            )}

            {activeNav === 'properties' && (
              <div className="property-grid">
                {listings.map((listing, i) => (
                  <div key={listing.id} className="prop-card">
                    <div className="prop-img">
                      <img src={propertyImages[i % propertyImages.length]} alt={listing.title} />
                      <div className={`prop-status ${listing.is_active ? 'live' : 'draft'}`}>
                        {listing.is_active ? '● Live' : '○ Draft'}
                      </div>
                      <button className="prop-menu-btn" onClick={() => setMenuOpen(menuOpen === listing.id ? null : listing.id)}>···</button>
                      {menuOpen === listing.id && (
                        <div className="menu-dropdown">
                          <a href={`/listings/${listing.id}`} className="menu-item">👁 View listing</a>
                          <div className="menu-item" onClick={() => togglePublish(listing.id, listing.is_active)}>
                            {listing.is_active ? '⏸ Unpublish' : '▶ Publish'}
                          </div>
                          <div className="menu-item danger">🗑 Delete listing</div>
                        </div>
                      )}
                    </div>
                    <div className="prop-body">
                      <div className="prop-name">{listing.title}</div>
                      <div className="prop-location">📍 {listing.city}, {listing.state}</div>
                      <div className="prop-stats">
                        <div className="prop-stat">
                          <div className="prop-stat-val">${listing.price_per_night}</div>
                          <div className="prop-stat-label">Per night</div>
                        </div>
                        <div className="prop-stat">
                          <div className="prop-stat-val" style={{color:'#4ade80'}}>—%</div>
                          <div className="prop-stat-label">Occupancy</div>
                        </div>
                        <div className="prop-stat">
                          <div className="prop-stat-val" style={{color:'#FCD34D'}}>{listing.rating}</div>
                          <div className="prop-stat-label">Rating</div>
                        </div>
                      </div>
                      <div className="prop-actions">
                        {listing.is_active ? (
                          <>
                            <a href={`/listings/${listing.id}`} className="prop-btn primary">Edit Listing</a>
                            <button className="prop-btn secondary">Calendar</button>
                          </>
                        ) : (
                          <>
                            <button className="prop-btn publish" onClick={() => togglePublish(listing.id, listing.is_active)}>Publish</button>
                            <a href={`/listings/${listing.id}`} className="prop-btn secondary">Preview</a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <a href="/list-property" className="add-card">
                  <div className="add-icon">+</div>
                  <div className="add-title">Add New Property</div>
                  <div className="add-sub">List your space on SnapReserve™</div>
                </a>
              </div>
            )}

            {activeNav !== 'properties' && (
              <div className="empty-state">
                <div style={{fontSize:'3rem',marginBottom:'16px'}}>
                  {navItems.find(n => n.id === activeNav)?.icon}
                </div>
                <div className="empty-title">{navItems.find(n => n.id === activeNav)?.label}</div>
                <div className="empty-sub">This section is coming soon.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}