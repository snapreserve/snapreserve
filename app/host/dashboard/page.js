'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

const STATUS_CONFIG = {
  live:               { label: '● Live',              color: '#4ADE80', bg: '#16A34A' },
  approved:           { label: '✅ Approved',          color: '#F4601A', bg: '#F4601A' },
  pending_review:     { label: '⏳ Pending Review',    color: '#FCD34D', bg: '#D97706' },
  changes_requested:  { label: '🔄 Changes Needed',   color: '#93C5FD', bg: '#2563EB' },
  rejected:           { label: '❌ Rejected',          color: '#F87171', bg: '#DC2626' },
  draft:              { label: '○ Draft',             color: 'rgba(255,255,255,0.4)', bg: '#374151' },
}

function statusCfg(s) {
  return STATUS_CONFIG[s] || STATUS_CONFIG.draft
}

export default function HostDashboard() {
  const router = useRouter()
  const [profile, setProfile]           = useState(null)
  const [listings, setListings]         = useState([])
  const [changeRequests, setChangeRequests] = useState({}) // { [listing_id]: [{notes, admin_email, created_at}] }
  const [loading, setLoading]           = useState(true)
  const [activeNav, setActiveNav]       = useState('properties')
  const [actionLoading, setActionLoading] = useState(null) // listing id currently acting on
  const [toast, setToast]               = useState(null)
  const [expandedCR, setExpandedCR]     = useState(null) // listing_id with expanded change notes
  const [switchModal, setSwitchModal]   = useState(false)
  const [switching, setSwitching]       = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: lists }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('listings').select('*').eq('host_id', user.id).order('created_at', { ascending: false }),
      ])

      setProfile(prof)
      const listArr = lists || []
      setListings(listArr)

      // Fetch change requests for all listings
      const ids = listArr.map(l => l.id)
      if (ids.length > 0) {
        const { data: crs } = await supabase
          .from('listing_change_requests')
          .select('listing_id, notes, admin_email, created_at')
          .in('listing_id', ids)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
        const crMap = {}
        ;(crs || []).forEach(cr => {
          if (!crMap[cr.listing_id]) crMap[cr.listing_id] = []
          crMap[cr.listing_id].push(cr)
        })
        setChangeRequests(crMap)
      }

      setLoading(false)
    }
    load()
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function callListingAction(listingId, action) {
    setActionLoading(listingId)
    try {
      const res = await fetch(`/api/host/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')

      const newStatus = { go_live: 'live', unpublish: 'approved', resubmit: 'pending_review' }[action]
      const newActive = action === 'go_live'
      setListings(prev => prev.map(l =>
        l.id === listingId ? { ...l, status: newStatus, is_active: newActive } : l
      ))
      if (action === 'resubmit') {
        setChangeRequests(prev => ({ ...prev, [listingId]: [] }))
      }

      const messages = {
        go_live:   '🚀 Your listing is now live!',
        unpublish: 'Listing unpublished.',
        resubmit:  '📤 Resubmitted for review.',
      }
      showToast(messages[action] || 'Done.')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleSwitchToGuest() {
    setSwitching(true)
    try {
      const res = await fetch('/api/account/switch-to-guest', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Something went wrong.')
      router.push('/account')
    } catch (err) {
      showToast(err.message, 'error')
      setSwitching(false)
      setSwitchModal(false)
    }
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
        .sidebar { width:220px; background:#0F0D0A; border-right:1px solid rgba(255,255,255,0.07); display:flex; flex-direction:column; position:fixed; top:0; left:0; bottom:0; z-index:100; }
        .sidebar-logo { padding:22px 20px 18px; border-bottom:1px solid rgba(255,255,255,0.07); }
        .logo-text { font-family:'Playfair Display',serif; font-size:1.15rem; font-weight:900; color:white; text-decoration:none; display:block; }
        .logo-text span { color:#F4601A; }
        .logo-sub { font-size:0.62rem; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.12em; margin-top:2px; }
        .sidebar-nav { flex:1; padding:16px 12px; overflow-y:auto; }
        .nav-item { display:flex; align-items:center; gap:10px; padding:10px 10px; border-radius:10px; cursor:pointer; margin-bottom:2px; color:rgba(255,255,255,0.45); font-size:0.86rem; font-weight:500; transition:all 0.15s; }
        .nav-item:hover { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.85); }
        .nav-item.active { background:#F4601A; color:white; font-weight:700; }
        .sidebar-footer { padding:12px 12px; border-top:1px solid rgba(255,255,255,0.07); }
        .mode-toggle { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:10px; margin-bottom:8px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); text-decoration:none; transition:all 0.15s; }
        .mode-toggle:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.12); }
        .mode-toggle-icon { font-size:0.9rem; width:20px; text-align:center; }
        .mode-toggle-label { font-size:0.78rem; font-weight:600; color:rgba(255,255,255,0.5); }
        .mode-toggle-sub { font-size:0.62rem; color:rgba(255,255,255,0.25); margin-top:1px; }
        .user-row { display:flex; align-items:center; gap:10px; padding:8px; border-radius:10px; cursor:pointer; }
        .user-row:hover { background:rgba(255,255,255,0.06); }
        .avatar { width:32px; height:32px; border-radius:50%; background:#F4601A; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.78rem; color:white; flex-shrink:0; }
        .user-name { font-size:0.78rem; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .user-role { font-size:0.64rem; color:rgba(255,255,255,0.35); }
        .logout-btn { background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:0.9rem; padding:4px; flex-shrink:0; }
        .logout-btn:hover { color:white; }
        .main { margin-left:220px; flex:1; display:flex; flex-direction:column; }
        .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 32px; height:64px; border-bottom:1px solid rgba(255,255,255,0.07); background:#0F0D0A; position:sticky; top:0; z-index:50; }
        .add-btn { background:#F4601A; color:white; border:none; border-radius:10px; padding:9px 18px; font-size:0.84rem; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-block; }
        .add-btn:hover { background:#FF7A35; }
        .content { padding:28px 32px; flex:1; }

        /* PROPERTY GRID */
        .prop-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .prop-card { background:#1A1712; border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; transition:all 0.2s; position:relative; }
        .prop-card:hover { border-color:rgba(255,255,255,0.15); transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,0.4); }
        .prop-img { height:160px; position:relative; overflow:hidden; background:#1F1C18; display:flex; align-items:center; justify-content:center; }
        .prop-img-placeholder { font-size:3rem; opacity:0.3; }
        .prop-status-badge { position:absolute; top:10px; left:10px; padding:3px 10px; border-radius:100px; font-size:0.66rem; font-weight:700; }
        .prop-body { padding:16px 18px; }
        .prop-name { font-size:0.96rem; font-weight:700; color:#F5F0EB; margin-bottom:4px; }
        .prop-loc { font-size:0.74rem; color:rgba(255,255,255,0.4); margin-bottom:14px; }
        .prop-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
        .prop-stat { background:rgba(255,255,255,0.04); border-radius:8px; padding:8px; text-align:center; }
        .prop-stat-val { font-size:0.92rem; font-weight:700; color:#F4601A; }
        .prop-stat-lbl { font-size:0.62rem; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.05em; margin-top:2px; }
        .prop-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .prop-btn { border-radius:8px; padding:9px; font-size:0.8rem; font-weight:700; cursor:pointer; font-family:inherit; border:none; text-align:center; text-decoration:none; display:block; transition:opacity 0.15s; }
        .prop-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .prop-btn.green { background:#16A34A; color:white; }
        .prop-btn.orange { background:#F4601A; color:white; }
        .prop-btn.secondary { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.6); }
        .prop-btn.danger { background:rgba(248,113,113,0.1); color:#F87171; border:1px solid rgba(248,113,113,0.2); }
        .prop-btn:hover:not(:disabled) { opacity:0.85; }

        /* Status info banners */
        .status-banner { border-radius:10px; padding:12px 14px; margin-bottom:12px; font-size:0.8rem; line-height:1.6; }
        .status-banner.pending { background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.15); color:#FCD34D; }
        .status-banner.changes { background:rgba(96,165,250,0.06); border:1px solid rgba(96,165,250,0.2); color:#93C5FD; }
        .status-banner.approved { background:rgba(244,96,26,0.06); border:1px solid rgba(244,96,26,0.2); color:#F4601A; }
        .status-banner.rejected { background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.15); color:#F87171; }

        /* Change notes */
        .cr-box { background:#0F0D0A; border:1px solid rgba(96,165,250,0.2); border-radius:10px; padding:14px; margin-bottom:12px; }
        .cr-box-title { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#93C5FD; margin-bottom:8px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
        .cr-note { font-size:0.82rem; color:#F5F0EB; line-height:1.65; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
        .cr-note:last-child { border-bottom:none; }
        .cr-date { font-size:0.7rem; color:#6B5E52; margin-top:3px; }

        /* ADD CARD */
        .add-card { background:rgba(255,255,255,0.02); border:2px dashed rgba(255,255,255,0.1); border-radius:16px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:280px; cursor:pointer; transition:all 0.2s; text-decoration:none; }
        .add-card:hover { border-color:rgba(244,96,26,0.4); background:rgba(244,96,26,0.04); }
        .add-icon { width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin-bottom:12px; }
        .add-title { font-size:0.92rem; font-weight:700; color:rgba(255,255,255,0.5); margin-bottom:4px; }
        .add-sub { font-size:0.74rem; color:rgba(255,255,255,0.25); }

        .empty { text-align:center; padding:72px 20px; }
        .empty-icon { font-size:2.8rem; margin-bottom:16px; }
        .empty-title { font-family:'Playfair Display',serif; font-size:1.3rem; font-weight:700; margin-bottom:8px; }
        .empty-sub { font-size:0.84rem; color:rgba(255,255,255,0.4); margin-bottom:24px; }

        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:12px; font-size:0.86rem; font-weight:600; z-index:9999; animation:fadeIn 0.2s; max-width:320px; }
        .toast.success { background:#16A34A; color:white; }
        .toast.error { background:#DC2626; color:white; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        @media(max-width:1100px) { .prop-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:768px) { .sidebar{display:none;} .main{margin-left:0;} .prop-grid{grid-template-columns:1fr;} .content{padding:20px;} }
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

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
            <a href="/dashboard" className="mode-toggle">
              <span className="mode-toggle-icon">🔍</span>
              <div>
                <div className="mode-toggle-label">Switch to Explore</div>
                <div className="mode-toggle-sub">Browse as a guest</div>
              </div>
            </a>
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
                {listings.map(l => {
                  const cfg    = statusCfg(l.status)
                  const crs    = changeRequests[l.id] || []
                  const isActing = actionLoading === l.id
                  const crOpen = expandedCR === l.id

                  return (
                    <div key={l.id} className="prop-card">
                      {/* Image / placeholder */}
                      <div className="prop-img">
                        {Array.isArray(l.images) && l.images[0]
                          ? <img src={l.images[0]} alt={l.title} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : <div className="prop-img-placeholder">{l.type === 'hotel' ? '🏨' : '🏠'}</div>
                        }
                        <div
                          className="prop-status-badge"
                          style={{background: cfg.bg + '22', color: cfg.color, border: `1px solid ${cfg.color}44`}}
                        >
                          {cfg.label}
                        </div>
                      </div>

                      <div className="prop-body">
                        <div className="prop-name">{l.title}</div>
                        <div className="prop-loc">📍 {l.city}{l.state ? `, ${l.state}` : ''}</div>

                        {/* Status banners */}
                        {l.status === 'pending_review' && (
                          <div className="status-banner pending">
                            ⏳ Your listing is under review. We'll notify you within 24 hours.
                          </div>
                        )}
                        {l.status === 'approved' && (
                          <div className="status-banner approved">
                            ✅ Approved! Click "Go Live" to publish your listing.
                          </div>
                        )}
                        {l.status === 'rejected' && (
                          <div className="status-banner rejected">
                            ❌ Your listing was rejected. Contact support for details.
                          </div>
                        )}

                        {/* Change request notes */}
                        {l.status === 'changes_requested' && (
                          <div>
                            <div className="status-banner changes">
                              🔄 Our team has requested changes. Review the notes below, make your edits, then resubmit.
                            </div>
                            {crs.length > 0 && (
                              <div className="cr-box">
                                <div
                                  className="cr-box-title"
                                  onClick={() => setExpandedCR(crOpen ? null : l.id)}
                                >
                                  <span>Admin notes ({crs.length})</span>
                                  <span>{crOpen ? '▲' : '▼'}</span>
                                </div>
                                {crOpen && crs.map((cr, i) => (
                                  <div key={i} className="cr-note">
                                    <div>{cr.notes}</div>
                                    <div className="cr-date">
                                      {new Date(cr.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

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

                        {/* Action buttons — status-gated */}
                        <div className="prop-actions">
                          {l.status === 'live' && (
                            <>
                              <a href={`/listings/${l.id}`} className="prop-btn secondary" target="_blank" rel="noreferrer">View listing</a>
                              <button
                                className="prop-btn secondary"
                                onClick={() => callListingAction(l.id, 'unpublish')}
                                disabled={isActing}
                              >
                                {isActing ? '…' : 'Unpublish'}
                              </button>
                            </>
                          )}

                          {l.status === 'approved' && (
                            <>
                              <button
                                className="prop-btn green"
                                onClick={() => callListingAction(l.id, 'go_live')}
                                disabled={isActing}
                              >
                                {isActing ? 'Publishing…' : '🚀 Go Live'}
                              </button>
                              <a href={`/listings/${l.id}`} className="prop-btn secondary" target="_blank" rel="noreferrer">Preview</a>
                            </>
                          )}

                          {l.status === 'pending_review' && (
                            <>
                              <button className="prop-btn secondary" disabled>⏳ In Review</button>
                              <a href={`/listings/${l.id}`} className="prop-btn secondary" target="_blank" rel="noreferrer">Preview</a>
                            </>
                          )}

                          {l.status === 'changes_requested' && (
                            <>
                              <button
                                className="prop-btn orange"
                                onClick={() => callListingAction(l.id, 'resubmit')}
                                disabled={isActing}
                              >
                                {isActing ? 'Submitting…' : '📤 Resubmit'}
                              </button>
                              <a href={`/listings/${l.id}`} className="prop-btn secondary" target="_blank" rel="noreferrer">Preview</a>
                            </>
                          )}

                          {l.status === 'rejected' && (
                            <>
                              <button className="prop-btn danger" disabled>❌ Rejected</button>
                              <a href="mailto:support@snapreserve.app" className="prop-btn secondary">Contact support</a>
                            </>
                          )}

                          {(!l.status || l.status === 'draft') && (
                            <>
                              <a href="/list-property" className="prop-btn orange">Edit draft</a>
                              <button className="prop-btn secondary" disabled>Submit</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                <a href="/list-property" className="add-card">
                  <div className="add-icon">+</div>
                  <div className="add-title">Add new property</div>
                  <div className="add-sub">List your space on SnapReserve</div>
                </a>
              </div>
            )}

            {activeNav === 'settings' && (
              <div style={{ maxWidth: '560px' }}>
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
                    Settings
                  </h2>
                  <p style={{ fontSize: '0.86rem', color: 'rgba(255,255,255,0.4)' }}>
                    Manage your hosting preferences.
                  </p>
                </div>

                {/* Switch to Customer */}
                <div style={{
                  background: '#1A1712', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px', padding: '24px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: '6px' }}>
                        Switch to Customer account
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                        Stop hosting and browse as a guest. Your listing history is saved — you can re-enable hosting any time from your account settings.
                      </p>
                    </div>
                    <button
                      onClick={() => setSwitchModal(true)}
                      style={{
                        flexShrink: 0, background: 'rgba(248,113,113,0.1)',
                        color: '#F87171', border: '1px solid rgba(248,113,113,0.2)',
                        borderRadius: '10px', padding: '9px 18px', fontSize: '0.84rem',
                        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Switch account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeNav !== 'properties' && activeNav !== 'settings' && (
              <div className="empty">
                <div className="empty-icon">{NAV.find(n => n.id === activeNav)?.icon}</div>
                <div className="empty-title">{NAV.find(n => n.id === activeNav)?.label}</div>
                <div className="empty-sub">This section is coming soon.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Switch to Guest confirmation modal */}
      {switchModal && (
        <div
          onClick={e => e.target === e.currentTarget && !switching && setSwitchModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            background: '#1A1712', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '14px', textAlign: 'center' }}>🔄</div>
            <h2 style={{
              fontFamily: "'Playfair Display',serif", fontSize: '1.25rem',
              fontWeight: 700, color: '#F5F0EB', marginBottom: '12px', textAlign: 'center',
            }}>
              Switch to Customer?
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: '16px', textAlign: 'center' }}>
              You'll be switched to a guest account. Any live listings will be unpublished automatically.
            </p>

            {listings.filter(l => l.status === 'live').length > 0 && (
              <div style={{
                background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: '10px', padding: '12px 14px', fontSize: '0.82rem',
                color: '#FCD34D', marginBottom: '20px', lineHeight: 1.6,
              }}>
                ⚠️ {listings.filter(l => l.status === 'live').length} live listing{listings.filter(l => l.status === 'live').length > 1 ? 's' : ''} will be unpublished. You can re-enable hosting and republish at any time.
              </div>
            )}

            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: '24px' }}>
              Your listing history and earnings data are preserved.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSwitchModal(false)}
                disabled={switching}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)',
                  border: 'none', borderRadius: '10px', padding: '12px',
                  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchToGuest}
                disabled={switching}
                style={{
                  flex: 2, background: switching ? 'rgba(248,113,113,0.3)' : 'rgba(248,113,113,0.15)',
                  color: '#F87171', border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '10px', padding: '12px', fontWeight: 700,
                  fontSize: '0.88rem', cursor: switching ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {switching ? 'Switching…' : 'Yes, switch account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
