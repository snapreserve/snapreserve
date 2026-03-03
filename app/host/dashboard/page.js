'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const propertyImages = [
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
]

const NAV = [
  { id: 'properties', label: 'My Properties', icon: '🏠' },
  { id: 'bookings',   label: 'Bookings',       icon: '📅' },
  { id: 'earnings',   label: 'Earnings',        icon: '💰' },
  { id: 'calendar',   label: 'Calendar',        icon: '🗓️' },
  { id: 'messages',   label: 'Messages',        icon: '💬' },
  { id: 'reviews',    label: 'Reviews',         icon: '⭐' },
  { id: 'payouts',    label: 'Payouts',         icon: '💳' },
  { id: 'settings',   label: 'Settings',        icon: '⚙️' },
]

export default function HostDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('properties')
  const [menuOpen, setMenuOpen] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const [{ data: prof }, { data: lists }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('listings').select('*').eq('host_id', user.id).order('created_at', { ascending: false }),
      ])
      setProfile(prof)
      setListings(lists || [])
      setLoading(false)
    }
    load()
  }, [])

  async function togglePublish(id, current) {
    await supabase.from('listings').update({ is_active: !current }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_active: !current } : l))
    setMenuOpen(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0F0D0A'}}>
      <div style={{color:'rgba(255,255,255,0.4)',fontSize:'0.9rem'}}>Loading…</div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#0F0D0A; color:#F5F0EB; }

        .layout { display:flex; min-height:100vh; }

        /* SIDEBAR */
        .sidebar { width:220px; background:#0F0D0A; border-right:1px solid rgba(255,255,255,0.07); display:flex; flex-direction:column; position:fixed; top:0; left:0; bottom:0; z-index:100; }
        .sidebar-logo { padding:22px 20px 18px; border-bottom:1px solid rgba(255,255,255,0.07); }
        .logo-text { font-family:'Playfair Display',serif; font-size:1.15rem; font-weight:900; color:white; text-decoration:none; display:block; }
        .logo-text span { color:#F4601A; }
        .logo-sub { font-size:0.62rem; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.12em; margin-top:2px; }
        .sidebar-nav { flex:1; padding:16px 12px; overflow-y:auto; }
        .nav-item { display:flex; align-items:center; gap:10px; padding:10px 10px; border-radius:10px; cursor:pointer; margin-bottom:2px; color:rgba(255,255,255,0.45); font-size:0.86rem; font-weight:500; transition:all 0.15s; }
        .nav-item:hover { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.85); }
        .nav-item.active { background:#F4601A; color:white; font-weight:700; }
        .sidebar-footer { padding:16px 12px; border-top:1px solid rgba(255,255,255,0.07); }
        .user-row { display:flex; align-items:center; gap:10px; padding:8px; border-radius:10px; cursor:pointer; }
        .user-row:hover { background:rgba(255,255,255,0.06); }
        .avatar { width:32px; height:32px; border-radius:50%; background:#F4601A; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.78rem; color:white; flex-shrink:0; }
        .user-name { font-size:0.78rem; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .user-role { font-size:0.64rem; color:rgba(255,255,255,0.35); }
        .logout-btn { background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:0.9rem; padding:4px; flex-shrink:0; }
        .logout-btn:hover { color:white; }

        /* MAIN */
        .main { margin-left:220px; flex:1; display:flex; flex-direction:column; }
        .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 32px; height:64px; border-bottom:1px solid rgba(255,255,255,0.07); background:#0F0D0A; position:sticky; top:0; z-index:50; }
        .page-title { font-size:1.1rem; font-weight:700; }
        .add-btn { background:#F4601A; color:white; border:none; border-radius:10px; padding:9px 18px; font-size:0.84rem; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-block; }
        .add-btn:hover { background:#FF7A35; }
        .content { padding:28px 32px; flex:1; }

        /* PROPERTY GRID */
        .prop-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .prop-card { background:#1A1712; border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; transition:all 0.2s; position:relative; }
        .prop-card:hover { border-color:rgba(255,255,255,0.15); transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,0.4); }
        .prop-img { height:180px; position:relative; overflow:hidden; }
        .prop-img img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s; }
        .prop-card:hover .prop-img img { transform:scale(1.04); }
        .prop-status { position:absolute; top:12px; left:12px; padding:4px 12px; border-radius:100px; font-size:0.68rem; font-weight:700; }
        .prop-status.live { background:#16A34A; color:white; }
        .prop-status.draft { background:rgba(0,0,0,0.5); color:rgba(255,255,255,0.8); }
        .prop-menu-btn { position:absolute; top:10px; right:10px; width:30px; height:30px; border-radius:50%; background:rgba(0,0,0,0.55); border:none; color:white; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; letter-spacing:1px; }
        .prop-body { padding:16px 18px; }
        .prop-name { font-size:0.96rem; font-weight:700; color:#F5F0EB; margin-bottom:4px; }
        .prop-loc { font-size:0.74rem; color:rgba(255,255,255,0.4); margin-bottom:14px; }
        .prop-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
        .prop-stat { background:rgba(255,255,255,0.04); border-radius:8px; padding:8px; text-align:center; }
        .prop-stat-val { font-size:0.92rem; font-weight:700; color:#F4601A; }
        .prop-stat-lbl { font-size:0.62rem; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.05em; margin-top:2px; }
        .prop-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .prop-btn { border-radius:8px; padding:9px; font-size:0.8rem; font-weight:700; cursor:pointer; font-family:inherit; border:none; text-align:center; text-decoration:none; display:block; transition:opacity 0.15s; }
        .prop-btn.primary { background:#F4601A; color:white; }
        .prop-btn.secondary { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.6); }
        .prop-btn.green { background:#16A34A; color:white; }
        .prop-btn:hover { opacity:0.85; }
        .menu-dropdown { position:absolute; top:44px; right:10px; background:#2A2420; border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:6px; z-index:50; min-width:160px; box-shadow:0 8px 32px rgba(0,0,0,0.4); }
        .menu-item { padding:9px 14px; border-radius:8px; font-size:0.82rem; cursor:pointer; color:rgba(255,255,255,0.7); transition:all 0.15s; display:flex; align-items:center; gap:8px; text-decoration:none; }
        .menu-item:hover { background:rgba(255,255,255,0.07); }
        .menu-item.danger { color:#F87171; }
        .menu-item.danger:hover { background:rgba(248,113,113,0.1); }

        /* ADD CARD */
        .add-card { background:rgba(255,255,255,0.02); border:2px dashed rgba(255,255,255,0.1); border-radius:16px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:320px; cursor:pointer; transition:all 0.2s; text-decoration:none; }
        .add-card:hover { border-color:rgba(244,96,26,0.4); background:rgba(244,96,26,0.04); }
        .add-icon { width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin-bottom:12px; }
        .add-title { font-size:0.92rem; font-weight:700; color:rgba(255,255,255,0.5); margin-bottom:4px; }
        .add-sub { font-size:0.74rem; color:rgba(255,255,255,0.25); }

        /* EMPTY STATE */
        .empty { text-align:center; padding:72px 20px; }
        .empty-icon { font-size:2.8rem; margin-bottom:16px; }
        .empty-title { font-family:'Playfair Display',serif; font-size:1.3rem; font-weight:700; margin-bottom:8px; }
        .empty-sub { font-size:0.84rem; color:rgba(255,255,255,0.4); margin-bottom:24px; }

        @media(max-width:1100px) { .prop-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:768px) { .sidebar{display:none;} .main{margin-left:0;} .prop-grid{grid-template-columns:1fr;} .content{padding:20px;} }
      `}</style>

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <a href="/" className="logo-text">Snap<span>Reserve</span></a>
            <div className="logo-sub">Host Dashboard</div>
          </div>
          <nav className="sidebar-nav">
            {NAV.map(item => (
              <div
                key={item.id}
                className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="user-row">
              <div className="avatar">{initials}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="user-name">{profile?.full_name || 'Host'}</div>
                <div className="user-role">Host Account</div>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Sign out">↪</button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="main">
          <div className="topbar">
            <div style={{fontWeight:700,fontSize:'1rem'}}>
              {NAV.find(n => n.id === activeNav)?.label}
            </div>
            {activeNav === 'properties' && (
              <a href="/list-property" className="add-btn">+ Add property</a>
            )}
          </div>

          <div className="content">
            {activeNav === 'properties' && (
              <div className="prop-grid">
                {listings.map((l, i) => (
                  <div key={l.id} className="prop-card">
                    <div className="prop-img">
                      <img src={propertyImages[i % propertyImages.length]} alt={l.title} />
                      <div className={`prop-status ${l.is_active ? 'live' : 'draft'}`}>
                        {l.is_active ? '● Live' : '○ Draft'}
                      </div>
                      <button className="prop-menu-btn" onClick={() => setMenuOpen(menuOpen === l.id ? null : l.id)}>···</button>
                      {menuOpen === l.id && (
                        <div className="menu-dropdown">
                          <a href={`/listings/${l.id}`} className="menu-item">👁 View listing</a>
                          <div className="menu-item" onClick={() => togglePublish(l.id, l.is_active)}>
                            {l.is_active ? '⏸ Unpublish' : '▶ Publish'}
                          </div>
                          <div className="menu-item danger">🗑 Delete</div>
                        </div>
                      )}
                    </div>
                    <div className="prop-body">
                      <div className="prop-name">{l.title}</div>
                      <div className="prop-loc">📍 {l.city}, {l.state}</div>
                      <div className="prop-stats">
                        <div className="prop-stat">
                          <div className="prop-stat-val">${l.price_per_night}</div>
                          <div className="prop-stat-lbl">Per night</div>
                        </div>
                        <div className="prop-stat">
                          <div className="prop-stat-val" style={{color:'#4ADE80'}}>—</div>
                          <div className="prop-stat-lbl">Occupancy</div>
                        </div>
                        <div className="prop-stat">
                          <div className="prop-stat-val" style={{color:'#FCD34D'}}>{l.rating ?? '—'}</div>
                          <div className="prop-stat-lbl">Rating</div>
                        </div>
                      </div>
                      <div className="prop-actions">
                        {l.is_active ? (
                          <>
                            <a href={`/listings/${l.id}`} className="prop-btn primary">Edit</a>
                            <button className="prop-btn secondary" onClick={() => togglePublish(l.id, l.is_active)}>Unpublish</button>
                          </>
                        ) : (
                          <>
                            <button className="prop-btn green" onClick={() => togglePublish(l.id, l.is_active)}>Publish</button>
                            <a href={`/listings/${l.id}`} className="prop-btn secondary">Preview</a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <a href="/list-property" className="add-card">
                  <div className="add-icon">+</div>
                  <div className="add-title">Add new property</div>
                  <div className="add-sub">List your space on SnapReserve</div>
                </a>
              </div>
            )}

            {activeNav !== 'properties' && (
              <div className="empty">
                <div className="empty-icon">{NAV.find(n => n.id === activeNav)?.icon}</div>
                <div className="empty-title">{NAV.find(n => n.id === activeNav)?.label}</div>
                <div className="empty-sub">This section is coming soon.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
