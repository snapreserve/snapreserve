'use client'
import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export default function ListingApprovalsPage() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [acting, setActing] = useState(false)
  const [toast, setToast] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const sb = supabase()
    const { data } = await sb
      .from('listing_approvals')
      .select('*, listings(*)')
      .order('submitted_at', { ascending: false })
    setApprovals(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function doAction(listingId, action, reason) {
    setActing(true)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: reason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')
      showToast(action === 'approve' ? 'Listing approved and published!' : action === 'reject' ? 'Listing rejected.' : 'Changes requested.')
      setSelected(null)
      setRejectionReason('')
      await loadData()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActing(false)
    }
  }

  function fmt(d) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const stats = {
    pending: approvals.filter(a => a.status === 'pending').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    rejected: approvals.filter(a => a.status === 'rejected').length,
  }
  const filtered = approvals.filter(a => a.status === activeTab)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:#F5F0EB; }
        .refresh-btn { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); color:#A89880; padding:7px 16px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-family:inherit; }
        .refresh-btn:hover { color:#F5F0EB; }
        .content { padding:28px 32px; }
        .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
        .stat { background:#1A1712; border:1px solid #2A2420; border-radius:12px; padding:18px 20px; }
        .stat-num { font-size:1.7rem; font-weight:800; line-height:1; margin-bottom:4px; }
        .stat-label { font-size:0.72rem; color:#A89880; text-transform:uppercase; letter-spacing:0.06em; font-weight:600; }
        .tabs { display:flex; gap:4px; background:rgba(255,255,255,0.05); border-radius:10px; padding:4px; margin-bottom:20px; width:fit-content; }
        .tab { padding:8px 20px; border-radius:7px; font-size:0.84rem; font-weight:600; border:none; cursor:pointer; font-family:inherit; color:#A89880; background:transparent; transition:all 0.15s; display:flex; align-items:center; gap:6px; }
        .tab.active { background:#F4601A; color:white; }
        .tab-badge { background:rgba(255,255,255,0.2); font-size:0.65rem; font-weight:800; padding:1px 7px; border-radius:100px; }
        .list { display:flex; flex-direction:column; gap:10px; }
        .card { background:#1A1712; border:1px solid #2A2420; border-radius:12px; padding:18px 22px; cursor:pointer; transition:all 0.15s; }
        .card:hover { border-color:#3A3430; }
        .card.open { border-color:#F4601A; background:rgba(244,96,26,0.04); }
        .card-top { display:flex; align-items:center; gap:14px; }
        .card-icon { width:44px; height:44px; border-radius:10px; background:#2A2420; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; }
        .card-info { flex:1; min-width:0; }
        .card-title { font-weight:700; font-size:0.92rem; color:#F5F0EB; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .card-meta { font-size:0.74rem; color:#A89880; display:flex; gap:12px; flex-wrap:wrap; }
        .card-right { display:flex; align-items:center; gap:8px; }
        .pill { padding:3px 12px; border-radius:100px; font-size:0.68rem; font-weight:700; text-transform:uppercase; }
        .pill.pending { background:rgba(251,191,36,0.1); color:#FCD34D; }
        .pill.approved { background:rgba(74,222,128,0.1); color:#4ADE80; }
        .pill.rejected { background:rgba(248,113,113,0.1); color:#F87171; }
        .pill.changes_requested { background:rgba(96,165,250,0.1); color:#93C5FD; }
        .chev { color:#6B5E52; font-size:0.8rem; margin-left:4px; }
        .detail { border-top:1px solid #2A2420; margin-top:16px; padding-top:18px; }
        .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
        .di { background:#0F0D0A; border-radius:8px; padding:12px; }
        .di-label { font-size:0.63rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; margin-bottom:4px; }
        .di-val { font-size:0.86rem; font-weight:600; color:#F5F0EB; }
        .desc-box { background:#0F0D0A; border-radius:8px; padding:12px; margin-bottom:16px; }
        .desc-box p { font-size:0.82rem; color:#A89880; line-height:1.7; }
        .action-row { display:flex; gap:10px; align-items:flex-start; flex-wrap:wrap; }
        .btn-approve { background:#16A34A; color:white; border:none; border-radius:9px; padding:11px 22px; font-size:0.87rem; font-weight:700; cursor:pointer; font-family:inherit; transition:background 0.15s; }
        .btn-approve:hover { background:#15803D; }
        .btn-approve:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-changes { background:rgba(96,165,250,0.1); border:1px solid rgba(96,165,250,0.2); color:#93C5FD; border-radius:9px; padding:11px 22px; font-size:0.87rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .btn-changes:hover { background:rgba(96,165,250,0.2); }
        .reject-wrap { flex:1; min-width:240px; display:flex; gap:8px; }
        .reject-input { flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:9px; padding:10px 13px; font-size:0.83rem; font-family:inherit; color:#F5F0EB; outline:none; }
        .reject-input:focus { border-color:#F87171; }
        .btn-reject { background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.25); color:#F87171; border-radius:9px; padding:10px 18px; font-size:0.87rem; font-weight:700; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .btn-reject:hover { background:rgba(248,113,113,0.2); }
        .btn-reject:disabled { opacity:0.5; cursor:not-allowed; }
        .info-approved { background:rgba(74,222,128,0.06); border:1px solid rgba(74,222,128,0.15); border-radius:10px; padding:14px; display:flex; align-items:center; gap:10px; }
        .info-rejected { background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.15); border-radius:10px; padding:14px; }
        .empty { text-align:center; padding:56px; color:#6B5E52; }
        .empty-icon { font-size:2.2rem; margin-bottom:10px; }
        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:12px; font-size:0.86rem; font-weight:600; z-index:9999; animation:fadeIn 0.2s; }
        .toast.success { background:#16A34A; color:white; }
        .toast.error { background:#DC2626; color:white; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @media(max-width:768px) { .content{padding:20px;} .stats-row{grid-template-columns:repeat(2,1fr);} .detail-grid{grid-template-columns:1fr;} .card-meta{display:none;} .topbar{padding:14px 20px;} }
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="topbar">
        <h1>Listing Approvals</h1>
        <button className="refresh-btn" onClick={loadData}>↻ Refresh</button>
      </div>

      <div className="content">
        <div className="stats-row">
          <div className="stat"><div className="stat-num" style={{color:'#FCD34D'}}>{stats.pending}</div><div className="stat-label">Pending</div></div>
          <div className="stat"><div className="stat-num" style={{color:'#4ADE80'}}>{stats.approved}</div><div className="stat-label">Approved</div></div>
          <div className="stat"><div className="stat-num" style={{color:'#F87171'}}>{stats.rejected}</div><div className="stat-label">Rejected</div></div>
          <div className="stat"><div className="stat-num" style={{color:'#F4601A'}}>{approvals.length}</div><div className="stat-label">Total</div></div>
        </div>

        <div className="tabs">
          {[['pending','⏳'],['approved','✅'],['rejected','❌']].map(([tab, icon]) => (
            <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); setSelected(null) }}>
              {icon} {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'pending' && stats.pending > 0 && <span className="tab-badge">{stats.pending}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty"><div className="empty-icon">⏳</div><div>Loading...</div></div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">{activeTab === 'pending' ? '📭' : activeTab === 'approved' ? '✅' : '❌'}</div>
            <div>No {activeTab} submissions</div>
          </div>
        ) : (
          <div className="list">
            {filtered.map(a => {
              const isOpen = selected?.id === a.id
              return (
                <div key={a.id} className={`card ${isOpen ? 'open' : ''}`}>
                  <div className="card-top" onClick={() => setSelected(isOpen ? null : a)}>
                    <div className="card-icon">{a.listings?.type === 'hotel' ? '🏨' : '🏠'}</div>
                    <div className="card-info">
                      <div className="card-title">{a.listing_title || 'Untitled'}</div>
                      <div className="card-meta">
                        <span>👤 {a.host_name || '—'}</span>
                        <span>📧 {a.host_email}</span>
                        {a.listings?.city && <span>📍 {a.listings.city}{a.listings.state ? `, ${a.listings.state}` : ''}</span>}
                        <span>🕐 {fmt(a.submitted_at)}</span>
                      </div>
                    </div>
                    <div className="card-right">
                      <span className={`pill ${a.status}`}>{a.status.replace('_', ' ')}</span>
                      <span className="chev">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="detail">
                      <div className="detail-grid">
                        <div className="di"><div className="di-label">Title</div><div className="di-val">{a.listings?.title || a.listing_title || '—'}</div></div>
                        <div className="di"><div className="di-label">Type</div><div className="di-val">{a.listings?.type === 'hotel' ? '🏨 Hotel' : '🏠 Private Stay'}</div></div>
                        <div className="di"><div className="di-label">Location</div><div className="di-val">{a.listings?.city || '—'}{a.listings?.state ? `, ${a.listings.state}` : ''}</div></div>
                        <div className="di"><div className="di-label">Price / night</div><div className="di-val">{a.listings?.price_per_night ? `$${a.listings.price_per_night}` : '—'}</div></div>
                        <div className="di"><div className="di-label">Host</div><div className="di-val">{a.host_name || '—'}</div></div>
                        <div className="di"><div className="di-label">Host email</div><div className="di-val">{a.host_email}</div></div>
                        <div className="di"><div className="di-label">Max guests</div><div className="di-val">{a.listings?.max_guests ?? '—'}</div></div>
                        <div className="di"><div className="di-label">Submitted</div><div className="di-val">{fmt(a.submitted_at)}</div></div>
                      </div>

                      {a.listings?.description && (
                        <div className="desc-box">
                          <div className="di-label" style={{marginBottom:'6px'}}>Description</div>
                          <p>{a.listings.description}</p>
                        </div>
                      )}

                      {a.status === 'pending' && (
                        <div className="action-row">
                          <button className="btn-approve" onClick={() => doAction(a.listing_id, 'approve')} disabled={acting}>
                            {acting ? 'Processing…' : '✅ Approve & publish'}
                          </button>
                          <button className="btn-changes" onClick={() => doAction(a.listing_id, 'request_changes')} disabled={acting}>
                            🔄 Request changes
                          </button>
                          <div className="reject-wrap">
                            <input
                              className="reject-input"
                              placeholder="Rejection reason (required)…"
                              value={rejectionReason}
                              onChange={e => setRejectionReason(e.target.value)}
                            />
                            <button className="btn-reject" onClick={() => doAction(a.listing_id, 'reject', rejectionReason)} disabled={acting || !rejectionReason.trim()}>
                              ❌ Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {a.status === 'approved' && (
                        <div className="info-approved">
                          <div style={{fontSize:'1.2rem'}}>✅</div>
                          <div>
                            <div style={{fontSize:'0.86rem',fontWeight:700,color:'#4ADE80'}}>Approved and live</div>
                            {a.reviewed_at && <div style={{fontSize:'0.74rem',color:'#A89880'}}>Reviewed {fmt(a.reviewed_at)}</div>}
                          </div>
                          <a href={`/listings/${a.listing_id}`} style={{marginLeft:'auto',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ADE80',padding:'6px 14px',borderRadius:'8px',fontSize:'0.76rem',fontWeight:700,textDecoration:'none'}}>View →</a>
                        </div>
                      )}

                      {a.status === 'rejected' && (
                        <div className="info-rejected">
                          <div style={{fontSize:'0.72rem',fontWeight:700,color:'#F87171',textTransform:'uppercase',marginBottom:'4px'}}>Rejection reason</div>
                          <div style={{fontSize:'0.84rem',color:'#A89880'}}>{a.rejection_reason || '—'}</div>
                          {a.reviewed_at && <div style={{fontSize:'0.73rem',color:'#6B5E52',marginTop:'6px'}}>Reviewed {fmt(a.reviewed_at)}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
