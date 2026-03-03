'use client'
import { useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function sb() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

const PRIORITY_CFG = {
  low:    { label: 'Low',    color: '#A89880', bg: 'rgba(168,152,128,0.12)' },
  normal: { label: 'Normal', color: '#93C5FD', bg: 'rgba(96,165,250,0.1)'  },
  high:   { label: 'High',   color: '#FCD34D', bg: 'rgba(251,191,36,0.1)'  },
  urgent: { label: 'Urgent', color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
}

const STATUS_CFG = {
  open:         { label: 'Open',         color: '#F87171', bg: 'rgba(248,113,113,0.1)'  },
  under_review: { label: 'Under Review', color: '#93C5FD', bg: 'rgba(96,165,250,0.1)'  },
  escalated:    { label: 'Escalated',    color: '#FCD34D', bg: 'rgba(251,191,36,0.1)'  },
  resolved:     { label: 'Resolved',     color: '#4ADE80', bg: 'rgba(74,222,128,0.1)'  },
  dismissed:    { label: 'Dismissed',    color: '#6B5E52', bg: 'rgba(107,94,82,0.15)'  },
}

const REASON_LABELS = {
  incorrect_info:       'Incorrect information',
  misleading_photos:    'Misleading photos',
  scam_fraud:           'Scam or fraud',
  safety_concern:       'Safety concern',
  inappropriate_content:'Inappropriate content',
  other:                'Other',
}

function Pill({ value, cfg }) {
  const c = cfg[value] || { label: value, color: '#A89880', bg: 'rgba(168,152,128,0.12)' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:'100px', fontSize:'0.68rem', fontWeight:700, background:c.bg, color:c.color }}>
      {c.label}
    </span>
  )
}

export default function ReportsClient({ initialReports, role }) {
  const [reports, setReports] = useState(initialReports)
  const [selected, setSelected] = useState(null)

  // Filters
  const [statusFilter,   setStatusFilter]   = useState('open')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter,     setTypeFilter]     = useState('all')
  const [search,         setSearch]         = useState('')

  // Modal state
  const [modal,    setModal]    = useState(null) // { action, report }
  const [note,     setNote]     = useState('')
  const [loading,  setLoading]  = useState(false)

  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function doAction(reportId, action, extra = {}) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, resolution_note: extra.note?.trim() || undefined, priority: extra.priority }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      // Optimistically update local state
      const statusMap = { resolve:'resolved', dismiss:'dismissed', escalate:'escalated', under_review:'under_review' }
      setReports(prev => prev.map(r => {
        if (r.id !== reportId) return r
        const updates = {}
        if (statusMap[action]) updates.status = statusMap[action]
        if (action === 'set_priority') updates.priority = extra.priority
        if (action === 'under_review') updates.status = 'under_review'
        if (action === 'suspend_listing') updates.status = 'resolved'
        return { ...r, ...updates }
      }))

      const msgs = {
        resolve:         'Report resolved.',
        dismiss:         'Report dismissed.',
        escalate:        'Report escalated.',
        under_review:    'Marked as under review.',
        set_priority:    'Priority updated.',
        suspend_listing: 'Listing suspended and report resolved.',
      }
      showToast(msgs[action] || 'Done.')
      setModal(null)
      setNote('')
      if (selected?.id === reportId) setSelected(null)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function fmt(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
  }

  const stats = {
    open:         reports.filter(r => r.status === 'open').length,
    under_review: reports.filter(r => r.status === 'under_review').length,
    escalated:    reports.filter(r => r.status === 'escalated').length,
    resolved:     reports.filter(r => r.status === 'resolved').length,
    dismissed:    reports.filter(r => r.status === 'dismissed').length,
  }

  const filtered = reports.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false
    if (typeFilter !== 'all' && r.target_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.reason?.includes(q) && !r.description?.toLowerCase().includes(q) && !r.target_id?.includes(q)) return false
    }
    return true
  })

  const isActionable = r => r.status === 'open' || r.status === 'under_review' || r.status === 'escalated'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { font-family:'DM Sans',-apple-system,sans-serif; }
        .topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:#F5F0EB; }
        .content { padding:28px 32px; }
        .stats-row { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:22px; }
        .stat { background:#1A1712; border:1px solid #2A2420; border-radius:10px; padding:14px 16px; cursor:pointer; transition:border-color 0.15s; }
        .stat:hover { border-color:#3A3430; }
        .stat.active { border-color:#F4601A; }
        .stat-num { font-size:1.5rem; font-weight:800; line-height:1; margin-bottom:3px; }
        .stat-label { font-size:0.68rem; color:#A89880; text-transform:uppercase; letter-spacing:0.06em; font-weight:600; }
        .toolbar { display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap; }
        .search-input { background:#1A1712; border:1px solid #2A2420; border-radius:8px; padding:8px 14px; color:#F5F0EB; font-size:0.84rem; min-width:220px; outline:none; flex:1; }
        .search-input:focus { border-color:#F4601A; }
        .filter-sel { background:#1A1712; border:1px solid #2A2420; border-radius:8px; padding:8px 12px; color:#F5F0EB; font-size:0.83rem; outline:none; cursor:pointer; }
        .list { display:flex; flex-direction:column; gap:8px; }
        .card { background:#1A1712; border:1px solid #2A2420; border-radius:12px; overflow:hidden; transition:border-color 0.15s; }
        .card:hover { border-color:#3A3430; }
        .card.open-card { border-color:#F4601A; }
        .card-row { display:flex; align-items:center; gap:12px; padding:14px 18px; cursor:pointer; }
        .card-icon { width:38px; height:38px; border-radius:9px; background:#2A2420; display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
        .card-body { flex:1; min-width:0; }
        .card-title { font-size:0.88rem; font-weight:700; color:#F5F0EB; margin-bottom:3px; }
        .card-meta { font-size:0.72rem; color:#A89880; display:flex; gap:10px; flex-wrap:wrap; }
        .card-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .chev { color:#6B5E52; font-size:0.75rem; }
        .detail { border-top:1px solid #2A2420; padding:18px 20px; }
        .detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
        .di { background:#0F0D0A; border-radius:8px; padding:11px 13px; }
        .di-label { font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; margin-bottom:4px; }
        .di-val { font-size:0.84rem; font-weight:600; color:#F5F0EB; word-break:break-all; }
        .desc-box { background:#0F0D0A; border-radius:8px; padding:12px 14px; margin-bottom:14px; font-size:0.84rem; color:#D0C8BE; line-height:1.65; }
        .action-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .btn { padding:8px 16px; border-radius:8px; font-size:0.8rem; font-weight:700; cursor:pointer; border:1px solid transparent; transition:all 0.15s; font-family:inherit; }
        .btn-review { background:rgba(96,165,250,0.1); color:#93C5FD; border-color:rgba(96,165,250,0.25); }
        .btn-review:hover { background:rgba(96,165,250,0.2); }
        .btn-escalate { background:rgba(251,191,36,0.08); color:#FCD34D; border-color:rgba(251,191,36,0.2); }
        .btn-escalate:hover { background:rgba(251,191,36,0.18); }
        .btn-resolve { background:rgba(74,222,128,0.08); color:#4ADE80; border-color:rgba(74,222,128,0.2); }
        .btn-resolve:hover { background:rgba(74,222,128,0.18); }
        .btn-dismiss { background:rgba(107,94,82,0.15); color:#A89880; border-color:rgba(107,94,82,0.3); }
        .btn-dismiss:hover { background:rgba(107,94,82,0.28); }
        .btn-suspend { background:rgba(248,113,113,0.08); color:#F87171; border-color:rgba(248,113,113,0.2); }
        .btn-suspend:hover { background:rgba(248,113,113,0.18); }
        .btn:disabled { opacity:0.4; cursor:not-allowed; }
        .priority-sel { background:#0F0D0A; border:1px solid #2A2420; border-radius:7px; padding:6px 10px; color:#F5F0EB; font-size:0.78rem; outline:none; cursor:pointer; font-family:inherit; }
        .empty { text-align:center; padding:52px; color:#6B5E52; font-size:0.84rem; }
        /* Modal */
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; }
        .modal { background:#1A1712; border:1px solid #2A2420; border-radius:16px; padding:26px; width:100%; max-width:420px; }
        .modal h2 { font-size:1rem; font-weight:700; color:#F5F0EB; margin-bottom:6px; }
        .modal-sub { font-size:0.82rem; color:#A89880; margin-bottom:16px; line-height:1.6; }
        .modal textarea { width:100%; background:#0F0D0A; border:1px solid #2A2420; border-radius:8px; padding:10px 12px; color:#F5F0EB; font-size:0.84rem; resize:vertical; min-height:80px; outline:none; font-family:inherit; }
        .modal textarea:focus { border-color:#F4601A; }
        .modal-footer { display:flex; gap:8px; margin-top:16px; justify-content:flex-end; }
        .btn-cancel { background:#2A2420; color:#A89880; border:1px solid #3A3028; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; font-family:inherit; }
        .btn-confirm { background:#F4601A; color:#fff; border:none; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; font-family:inherit; }
        .btn-confirm:disabled { opacity:0.5; cursor:not-allowed; }
        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:12px; font-size:0.85rem; font-weight:600; z-index:300; animation:fadeIn 0.2s; max-width:340px; }
        .toast.success { background:#16A34A; color:white; }
        .toast.error { background:#DC2626; color:white; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @media(max-width:768px) { .content{padding:16px;} .stats-row{grid-template-columns:repeat(3,1fr);} .detail-grid{grid-template-columns:1fr;} }
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="topbar">
        <h1>Reports Queue</h1>
        <span style={{fontSize:'0.8rem',color:'#A89880'}}>{filtered.length} showing</span>
      </div>

      <div className="content">
        {/* Stats */}
        <div className="stats-row">
          {[
            { key:'open',         label:'Open',         color:'#F87171' },
            { key:'under_review', label:'Under Review',  color:'#93C5FD' },
            { key:'escalated',    label:'Escalated',     color:'#FCD34D' },
            { key:'resolved',     label:'Resolved',      color:'#4ADE80' },
            { key:'dismissed',    label:'Dismissed',     color:'#A89880' },
          ].map(s => (
            <div
              key={s.key}
              className={`stat ${statusFilter === s.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === s.key ? 'all' : s.key)}
            >
              <div className="stat-num" style={{color:s.color}}>{stats[s.key]}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search reason, description, target ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-sel" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <select className="filter-sel" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <select className="filter-sel" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="listing">Listing</option>
            <option value="user">User</option>
            <option value="booking">Booking</option>
            <option value="host">Host</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="empty">No reports match the current filters.</div>
        ) : (
          <div className="list">
            {filtered.map(r => {
              const isOpen = selected?.id === r.id
              const actionable = isActionable(r)
              const typeIcon = { listing:'🏠', user:'👤', booking:'📅', host:'🏢' }[r.target_type] || '📋'

              return (
                <div key={r.id} className={`card ${isOpen ? 'open-card' : ''}`}>
                  <div className="card-row" onClick={() => setSelected(isOpen ? null : r)}>
                    <div className="card-icon">{typeIcon}</div>
                    <div className="card-body">
                      <div className="card-title">{REASON_LABELS[r.reason] || r.reason}</div>
                      <div className="card-meta">
                        <span>{r.target_type}</span>
                        {r.description && <span>{r.description.slice(0, 60)}{r.description.length > 60 ? '…' : ''}</span>}
                        <span>{fmt(r.created_at)}</span>
                      </div>
                    </div>
                    <div className="card-right">
                      <Pill value={r.priority} cfg={PRIORITY_CFG} />
                      <Pill value={r.status}   cfg={STATUS_CFG}   />
                      <span className="chev">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="detail">
                      <div className="detail-grid">
                        <div className="di"><div className="di-label">Report ID</div><div className="di-val">{r.id.slice(0,16)}…</div></div>
                        <div className="di"><div className="di-label">Target type</div><div className="di-val">{r.target_type}</div></div>
                        <div className="di">
                          <div className="di-label">Target ID</div>
                          <div className="di-val">
                            {r.target_type === 'listing'
                              ? <a href={`/listings/${r.target_id}`} target="_blank" rel="noreferrer" style={{color:'#F4601A'}}>{r.target_id.slice(0,16)}… →</a>
                              : <span>{r.target_id.slice(0,16)}…</span>
                            }
                          </div>
                        </div>
                        <div className="di"><div className="di-label">Reason</div><div className="di-val">{REASON_LABELS[r.reason] || r.reason}</div></div>
                        <div className="di"><div className="di-label">Status</div><div className="di-val"><Pill value={r.status} cfg={STATUS_CFG} /></div></div>
                        <div className="di"><div className="di-label">Reported</div><div className="di-val">{fmt(r.created_at)}</div></div>
                        {r.resolved_at && <div className="di"><div className="di-label">Resolved</div><div className="di-val">{fmt(r.resolved_at)}</div></div>}
                      </div>

                      {r.description && (
                        <div>
                          <div style={{fontSize:'0.63rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#6B5E52',marginBottom:'6px'}}>Description</div>
                          <div className="desc-box">{r.description}</div>
                        </div>
                      )}

                      {r.resolution_note && (
                        <div style={{marginBottom:'14px'}}>
                          <div style={{fontSize:'0.63rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#4ADE80',marginBottom:'6px'}}>Resolution note</div>
                          <div className="desc-box" style={{borderLeft:'2px solid #4ADE80'}}>{r.resolution_note}</div>
                        </div>
                      )}

                      {/* Priority selector */}
                      {actionable && (
                        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
                          <span style={{fontSize:'0.72rem',color:'#6B5E52',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>Priority:</span>
                          <select
                            className="priority-sel"
                            value={r.priority || 'normal'}
                            onChange={e => doAction(r.id, 'set_priority', { priority: e.target.value })}
                          >
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      )}

                      {/* Action buttons */}
                      {actionable && (
                        <div className="action-bar">
                          {r.status !== 'under_review' && (
                            <button className="btn btn-review" onClick={() => doAction(r.id, 'under_review')} disabled={loading}>
                              🔍 Under Review
                            </button>
                          )}
                          {r.status !== 'escalated' && (
                            <button className="btn btn-escalate" onClick={() => doAction(r.id, 'escalate')} disabled={loading}>
                              ⬆ Escalate
                            </button>
                          )}
                          <button className="btn btn-resolve" onClick={() => { setNote(''); setModal({ action:'resolve', report:r }) }} disabled={loading}>
                            ✅ Resolve
                          </button>
                          <button className="btn btn-dismiss" onClick={() => { setNote(''); setModal({ action:'dismiss', report:r }) }} disabled={loading}>
                            ✕ Dismiss
                          </button>
                          {r.target_type === 'listing' && (
                            <button className="btn btn-suspend" onClick={() => { setNote(''); setModal({ action:'suspend_listing', report:r }) }} disabled={loading}>
                              🚫 Suspend Listing
                            </button>
                          )}
                        </div>
                      )}

                      {!actionable && (
                        <div style={{fontSize:'0.78rem',color:'#6B5E52'}}>
                          This report has been {r.status}.
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

      {/* Confirmation modal */}
      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>
              {modal.action === 'resolve'          && 'Resolve Report'}
              {modal.action === 'dismiss'          && 'Dismiss Report'}
              {modal.action === 'suspend_listing'  && 'Suspend Listing'}
            </h2>
            <div className="modal-sub">
              {modal.action === 'suspend_listing'
                ? 'This will immediately take the listing offline and mark the report as resolved. This action is logged.'
                : `Target: ${modal.report.target_type} · ${REASON_LABELS[modal.report.reason] || modal.report.reason}`
              }
            </div>
            <textarea
              placeholder={modal.action === 'suspend_listing' ? 'Optional note…' : 'Resolution note (optional)…'}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn-confirm"
                disabled={loading}
                onClick={() => doAction(modal.report.id, modal.action, { note })}
                style={modal.action === 'suspend_listing' ? {background:'#DC2626'} : {}}
              >
                {loading ? 'Processing…' : modal.action === 'suspend_listing' ? 'Suspend Listing' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
