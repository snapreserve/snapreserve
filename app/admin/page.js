'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const ADMIN_PASSWORD = 'snapreserve2026'

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [acting, setActing] = useState(false)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })

  useEffect(() => {
    const a = sessionStorage.getItem('admin_authed')
    if (a === 'true') { setAuthed(true); loadData() }
  }, [])

  function handleAuth(e) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', 'true')
      setAuthed(true)
      loadData()
    } else {
      setPwError('Incorrect password')
    }
  }

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('listing_approvals')
      .select('*, listings(*)')
      .order('submitted_at', { ascending: false })

    const all = data || []
    setApprovals(all)
    setStats({
      pending: all.filter(a => a.status === 'pending').length,
      approved: all.filter(a => a.status === 'approved').length,
      rejected: all.filter(a => a.status === 'rejected').length,
      total: all.length,
    })
    setLoading(false)
  }

  async function handleApprove(approval) {
    setActing(true)
    // Activate the listing
    await supabase.from('listings').update({ is_active: true }).eq('id', approval.listing_id)
    // Update approval record
    await supabase.from('listing_approvals').update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    }).eq('id', approval.id)
    // Update user status
    await supabase.from('users').update({ listing_status: 'approved', is_verified: true }).eq('id', approval.host_id)

    await loadData()
    setSelected(null)
    setActing(false)
  }

  async function handleReject(approval) {
    if (!rejectionReason.trim()) { alert('Please provide a rejection reason.'); return }
    setActing(true)
    await supabase.from('listings').update({ is_active: false }).eq('id', approval.listing_id)
    await supabase.from('listing_approvals').update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    }).eq('id', approval.id)
    await supabase.from('users').update({ listing_status: 'rejected' }).eq('id', approval.host_id)

    await loadData()
    setSelected(null)
    setRejectionReason('')
    setActing(false)
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const filtered = approvals.filter(a => a.status === activeTab)

  // LOGIN GATE
  if (!authed) return (
    <>
      <style>{`* { margin:0;padding:0;box-sizing:border-box; } body { font-family:'DM Sans',-apple-system,sans-serif; background:#0F0D0A; color:white; min-height:100vh; display:flex; align-items:center; justify-content:center; }`}</style>
      <div style={{background:'#1A1712',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'24px',padding:'48px',width:'100%',maxWidth:'380px',margin:'20px'}}>
        <div style={{fontFamily:'Playfair Display,serif',fontSize:'1.4rem',fontWeight:700,marginBottom:'6px'}}>Admin Panel</div>
        <div style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.4)',marginBottom:'28px'}}>SnapReserve™ listing approvals</div>
        <form onSubmit={handleAuth}>
          {pwError && <div style={{color:'#F87171',fontSize:'0.78rem',marginBottom:'12px'}}>⚠️ {pwError}</div>}
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'12px 14px',fontSize:'0.9rem',fontFamily:'inherit',outline:'none',color:'white',marginBottom:'12px'}}
          />
          <button type="submit" style={{width:'100%',background:'#F4601A',border:'none',borderRadius:'10px',padding:'13px',fontSize:'0.9rem',fontWeight:700,color:'white',cursor:'pointer',fontFamily:'inherit'}}>
            Enter admin panel →
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#0F0D0A; color:white; }
        .nav { display:flex; align-items:center; justify-content:space-between; padding:0 40px; height:64px; background:#1A1712; border-bottom:1px solid rgba(255,255,255,0.08); position:sticky; top:0; z-index:100; }
        .logo { font-family:'Playfair Display',serif; font-size:1.2rem; font-weight:900; color:white; text-decoration:none; }
        .logo span { color:#F4601A; }
        .admin-badge { background:rgba(244,96,26,0.15); border:1px solid rgba(244,96,26,0.3); color:#F4601A; font-size:0.72rem; font-weight:700; padding:4px 12px; border-radius:100px; text-transform:uppercase; letter-spacing:0.08em; }
        .page { max-width:1100px; margin:0 auto; padding:32px 40px 80px; }
        .page-title { font-family:'Playfair Display',serif; font-size:1.8rem; font-weight:700; margin-bottom:4px; }
        .page-sub { font-size:0.86rem; color:rgba(255,255,255,0.4); margin-bottom:28px; }
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
        .stat { background:#1A1712; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px 20px; }
        .stat-num { font-family:'Playfair Display',serif; font-size:1.8rem; font-weight:700; margin-bottom:4px; }
        .stat-label { font-size:0.74rem; color:rgba(255,255,255,0.4); font-weight:600; text-transform:uppercase; letter-spacing:0.06em; }
        .tabs { display:flex; gap:4px; background:rgba(255,255,255,0.05); border-radius:10px; padding:4px; margin-bottom:20px; width:fit-content; }
        .tab { padding:8px 20px; border-radius:7px; font-size:0.84rem; font-weight:600; border:none; cursor:pointer; font-family:inherit; color:rgba(255,255,255,0.45); background:transparent; transition:all 0.18s; display:flex; align-items:center; gap:6px; }
        .tab.active { background:#F4601A; color:white; }
        .tab-badge { background:rgba(255,255,255,0.2); font-size:0.66rem; font-weight:800; padding:1px 7px; border-radius:100px; }
        .tab.active .tab-badge { background:rgba(255,255,255,0.25); }
        .approval-list { display:flex; flex-direction:column; gap:12px; }
        .approval-card { background:#1A1712; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px 24px; display:flex; align-items:center; justify-content:space-between; gap:20px; cursor:pointer; transition:all 0.18s; }
        .approval-card:hover { border-color:rgba(255,255,255,0.15); background:#211E1A; }
        .approval-card.selected { border-color:#F4601A; background:rgba(244,96,26,0.06); }
        .card-left { display:flex; align-items:center; gap:16px; flex:1; min-width:0; }
        .card-icon { width:48px; height:48px; border-radius:12px; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; font-size:1.4rem; flex-shrink:0; }
        .card-info { flex:1; min-width:0; }
        .card-title { font-weight:700; font-size:0.96rem; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .card-meta { font-size:0.76rem; color:rgba(255,255,255,0.4); display:flex; gap:12px; flex-wrap:wrap; }
        .card-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
        .status-pill { padding:4px 12px; border-radius:100px; font-size:0.7rem; font-weight:700; }
        .status-pill.pending { background:rgba(251,191,36,0.1); color:#FCD34D; }
        .status-pill.approved { background:rgba(74,222,128,0.1); color:#4ade80; }
        .status-pill.rejected { background:rgba(248,113,113,0.1); color:#F87171; }
        .expand-btn { background:rgba(255,255,255,0.06); border:none; color:rgba(255,255,255,0.5); width:32px; height:32px; border-radius:8px; cursor:pointer; font-size:0.9rem; }

        /* DETAIL PANEL */
        .detail-panel { background:#1A1712; border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:28px; margin-top:16px; }
        .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
        .detail-item { background:rgba(255,255,255,0.04); border-radius:10px; padding:14px; }
        .detail-label { font-size:0.66rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:rgba(255,255,255,0.3); margin-bottom:4px; }
        .detail-val { font-size:0.9rem; font-weight:600; color:white; }
        .action-row { display:flex; gap:10px; margin-top:20px; }
        .approve-btn { flex:1; background:#16A34A; color:white; border:none; border-radius:10px; padding:13px; font-size:0.9rem; font-weight:700; cursor:pointer; font-family:inherit; transition:background 0.18s; }
        .approve-btn:hover { background:#15803D; }
        .approve-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .reject-section { margin-top:16px; }
        .reject-input { width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 14px; font-size:0.84rem; font-family:inherit; color:white; outline:none; margin-bottom:8px; }
        .reject-input:focus { border-color:#F87171; }
        .reject-btn { background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.3); color:#F87171; padding:10px 24px; border-radius:10px; font-size:0.86rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .reject-btn:hover { background:rgba(248,113,113,0.2); }
        .reject-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .empty { text-align:center; padding:60px; color:rgba(255,255,255,0.3); }
        .empty-icon { font-size:2.5rem; margin-bottom:12px; }
        .refresh-btn { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); padding:8px 18px; border-radius:8px; font-size:0.82rem; cursor:pointer; font-family:inherit; }
        .refresh-btn:hover { background:rgba(255,255,255,0.12); color:white; }
        @media(max-width:768px) { .page,.nav{padding-left:20px;padding-right:20px;} .stats-row{grid-template-columns:repeat(2,1fr);} .detail-grid{grid-template-columns:1fr;} .card-meta{display:none;} }
      `}</style>

      <nav className="nav">
        <a href="/" className="logo">Snap<span>Reserve™</span></a>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div className="admin-badge">🔒 Admin Panel</div>
          <button className="refresh-btn" onClick={loadData}>↻ Refresh</button>
          <a href="/home" style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.4)',textDecoration:'none'}}>← Back to site</a>
        </div>
      </nav>

      <div className="page">
        <div className="page-title">Listing Approvals</div>
        <div className="page-sub">Review and approve host listing submissions before they go live</div>

        <div className="stats-row">
          <div className="stat">
            <div className="stat-num" style={{color:'#FCD34D'}}>{stats.pending}</div>
            <div className="stat-label">Pending review</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{color:'#4ade80'}}>{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{color:'#F87171'}}>{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{color:'#F4601A'}}>{stats.total}</div>
            <div className="stat-label">Total submissions</div>
          </div>
        </div>

        <div className="tabs">
          {['pending','approved','rejected'].map(tab => (
            <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'pending' ? '⏳' : tab === 'approved' ? '✅' : '❌'} {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'pending' && stats.pending > 0 && <span className="tab-badge">{stats.pending}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty"><div className="empty-icon">⏳</div><div>Loading submissions...</div></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">{activeTab === 'pending' ? '📭' : activeTab === 'approved' ? '✅' : '❌'}</div>
            <div>No {activeTab} submissions</div>
          </div>
        ) : (
          <div className="approval-list">
            {filtered.map(approval => (
              <div key={approval.id}>
                <div
                  className={`approval-card ${selected?.id === approval.id ? 'selected' : ''}`}
                  onClick={() => setSelected(selected?.id === approval.id ? null : approval)}
                >
                  <div className="card-left">
                    <div className="card-icon">{approval.listings?.type === 'hotel' ? '🏨' : '🏠'}</div>
                    <div className="card-info">
                      <div className="card-title">{approval.listing_title || 'Untitled listing'}</div>
                      <div className="card-meta">
                        <span>👤 {approval.host_name || 'Unknown host'}</span>
                        <span>📧 {approval.host_email}</span>
                        <span>🕐 {formatDate(approval.submitted_at)}</span>
                        {approval.listings?.city && <span>📍 {approval.listings.city}, {approval.listings.state}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="card-right">
                    <span className={`status-pill ${approval.status}`}>{approval.status}</span>
                    <button className="expand-btn">{selected?.id === approval.id ? '▲' : '▼'}</button>
                  </div>
                </div>

                {/* EXPANDED DETAIL */}
                {selected?.id === approval.id && (
                  <div className="detail-panel">
                    <div style={{fontWeight:700,marginBottom:'16px',fontSize:'0.9rem',color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Listing Details</div>
                    <div className="detail-grid">
                      <div className="detail-item"><div className="detail-label">Title</div><div className="detail-val">{approval.listings?.title || '—'}</div></div>
                      <div className="detail-item"><div className="detail-label">Type</div><div className="detail-val">{approval.listings?.type === 'hotel' ? '🏨 Hotel' : '🏠 Private Stay'}</div></div>
                      <div className="detail-item"><div className="detail-label">Location</div><div className="detail-val">{approval.listings?.city}, {approval.listings?.state}</div></div>
                      <div className="detail-item"><div className="detail-label">Price</div><div className="detail-val">${approval.listings?.price_per_night}/night</div></div>
                      <div className="detail-item"><div className="detail-label">Host</div><div className="detail-val">{approval.host_name}</div></div>
                      <div className="detail-item"><div className="detail-label">Host email</div><div className="detail-val">{approval.host_email}</div></div>
                      <div className="detail-item"><div className="detail-label">Guests</div><div className="detail-val">{approval.listings?.max_guests} guests</div></div>
                      <div className="detail-item"><div className="detail-label">Submitted</div><div className="detail-val">{formatDate(approval.submitted_at)}</div></div>
                    </div>

                    {approval.listings?.description && (
                      <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'14px',marginBottom:'16px'}}>
                        <div style={{fontSize:'0.66rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'rgba(255,255,255,0.3)',marginBottom:'6px'}}>Description</div>
                        <div style={{fontSize:'0.84rem',color:'rgba(255,255,255,0.7)',lineHeight:1.7}}>{approval.listings.description}</div>
                      </div>
                    )}

                    {approval.status === 'pending' && (
                      <>
                        <div className="action-row">
                          <button className="approve-btn" onClick={() => handleApprove(approval)} disabled={acting}>
                            {acting ? 'Processing...' : '✅ Approve & publish listing'}
                          </button>
                        </div>
                        <div className="reject-section">
                          <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.4)',marginBottom:'8px',marginTop:'12px'}}>Rejection reason (required to reject):</div>
                          <input className="reject-input" placeholder="e.g. Photos are too low quality, please re-upload..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                          <button className="reject-btn" onClick={() => handleReject(approval)} disabled={acting}>❌ Reject listing</button>
                        </div>
                      </>
                    )}

                    {approval.status === 'rejected' && approval.rejection_reason && (
                      <div style={{background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.15)',borderRadius:'10px',padding:'14px',marginTop:'8px'}}>
                        <div style={{fontSize:'0.72rem',fontWeight:700,color:'#F87171',textTransform:'uppercase',marginBottom:'4px'}}>Rejection reason</div>
                        <div style={{fontSize:'0.84rem',color:'rgba(255,255,255,0.6)'}}>{approval.rejection_reason}</div>
                      </div>
                    )}

                    {approval.status === 'approved' && (
                      <div style={{background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:'10px',padding:'14px',marginTop:'8px',display:'flex',alignItems:'center',gap:'10px'}}>
                        <div style={{fontSize:'1.2rem'}}>✅</div>
                        <div>
                          <div style={{fontSize:'0.84rem',fontWeight:700,color:'#4ade80'}}>Approved and live</div>
                          <div style={{fontSize:'0.76rem',color:'rgba(255,255,255,0.4)'}}>Reviewed on {formatDate(approval.reviewed_at)}</div>
                        </div>
                        <a href={`/listings/${approval.listing_id}`} style={{marginLeft:'auto',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',padding:'6px 14px',borderRadius:'8px',fontSize:'0.78rem',fontWeight:700,textDecoration:'none'}}>View listing →</a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}