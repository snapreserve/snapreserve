'use client'
import { useState, useEffect, useCallback } from 'react'

const STATUS_TABS = [
  { key: 'pending',      label: 'Pending',      color: '#FCD34D' },
  { key: 'under_review', label: 'Under Review',  color: '#93C5FD' },
  { key: 'approved',     label: 'Approved',      color: '#4ADE80' },
  { key: 'rejected',     label: 'Rejected',      color: '#F87171' },
]

export default function AppealsPage() {
  const [appeals, setAppeals]       = useState([])
  const [activeTab, setActiveTab]   = useState('pending')
  const [selected, setSelected]     = useState(null)
  const [response, setResponse]     = useState('')
  const [acting, setActing]         = useState(false)
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState(null)

  const loadAppeals = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/appeals?status=${activeTab}`)
    const json = await res.json()
    setAppeals(json.appeals ?? [])
    setLoading(false)
  }, [activeTab])

  useEffect(() => { loadAppeals() }, [loadAppeals])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function doAction(appealId, action) {
    if ((action === 'approve' || action === 'reject') && !response.trim()) return
    setActing(true)
    try {
      const res = await fetch(`/api/admin/appeals/${appealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_response: response.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      showToast(action === 'approve' ? 'Appeal approved — account reinstated.' : action === 'reject' ? 'Appeal rejected.' : 'Marked as under review.')
      setSelected(null)
      setResponse('')
      await loadAppeals()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setActing(false)
    }
  }

  function fmt(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
        .topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }
        .content { padding:28px 32px; }
        .tabs { display:flex; gap:4px; background:rgba(255,255,255,0.05); border-radius:10px; padding:4px; margin-bottom:24px; width:fit-content; }
        .tab { padding:8px 20px; border-radius:7px; font-size:0.84rem; font-weight:600; border:none; cursor:pointer; font-family:inherit; color:var(--sr-muted); background:transparent; transition:all 0.15s; }
        .tab.active { background:var(--sr-orange); color:white; }
        .list { display:flex; flex-direction:column; gap:10px; }
        .card { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; padding:18px 22px; cursor:pointer; transition:border-color 0.15s; }
        .card:hover { border-color:#3A3430; }
        .card.open { border-color:var(--sr-orange); }
        .card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
        .card-email { font-size:0.9rem; font-weight:700; color:var(--sr-text); margin-bottom:3px; }
        .card-date  { font-size:0.73rem; color:var(--sr-sub); }
        .pill { padding:3px 12px; border-radius:100px; font-size:0.68rem; font-weight:700; flex-shrink:0; }
        .pill-pending      { background:rgba(251,191,36,0.1); color:#FCD34D; }
        .pill-under_review { background:rgba(147,197,253,0.1); color:#93C5FD; }
        .pill-approved     { background:rgba(74,222,128,0.1); color:#4ADE80; }
        .pill-rejected     { background:rgba(248,113,113,0.1); color:#F87171; }
        .detail { border-top:1px solid var(--sr-border-solid); margin-top:14px; padding-top:16px; }
        .detail-label { font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-bottom:6px; }
        .appeal-text { font-size:0.86rem; color:var(--sr-text); line-height:1.75; white-space:pre-wrap; }
        .response-box { background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:12px; margin-top:12px; font-size:0.84rem; color:var(--sr-muted); white-space:pre-wrap; }
        .action-area { margin-top:16px; }
        .textarea { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:10px 12px; color:var(--sr-text); font-size:0.84rem; resize:vertical; min-height:90px; outline:none; font-family:inherit; }
        .textarea:focus { border-color:var(--sr-orange); }
        .action-row { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
        .btn { padding:9px 20px; border-radius:8px; font-size:0.84rem; font-weight:700; cursor:pointer; border:none; font-family:inherit; transition:all 0.15s; }
        .btn:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-approve { background:#16A34A; color:white; }
        .btn-reject  { background:rgba(248,113,113,0.15); color:#F87171; border:1px solid rgba(248,113,113,0.3); }
        .btn-review  { background:rgba(147,197,253,0.15); color:#93C5FD; border:1px solid rgba(147,197,253,0.3); }
        .empty { text-align:center; padding:56px; color:var(--sr-sub); }
        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:12px; font-size:0.86rem; font-weight:600; z-index:9999; }
        .toast.success { background:#16A34A; color:white; }
        .toast.error { background:#DC2626; color:white; }
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="topbar">
        <h1>⚖️ Appeals</h1>
        <button style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',color:'var(--sr-muted)',padding:'7px 16px',borderRadius:'8px',fontSize:'0.8rem',cursor:'pointer',fontFamily:'inherit'}} onClick={loadAppeals}>↻ Refresh</button>
      </div>

      <div className="content">
        <div className="tabs">
          {STATUS_TABS.map(t => (
            <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => { setActiveTab(t.key); setSelected(null); setResponse('') }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty">Loading…</div>
        ) : appeals.length === 0 ? (
          <div className="empty">No {activeTab.replace('_', ' ')} appeals</div>
        ) : (
          <div className="list">
            {appeals.map(a => {
              const isOpen = selected?.id === a.id
              return (
                <div key={a.id} className={`card ${isOpen ? 'open' : ''}`} onClick={() => { setSelected(isOpen ? null : a); setResponse('') }}>
                  <div className="card-top">
                    <div>
                      <div className="card-email">{a.user_email}</div>
                      <div className="card-date">Submitted {fmt(a.created_at)}</div>
                    </div>
                    <span className={`pill pill-${a.status}`}>{a.status.replace('_', ' ')}</span>
                  </div>

                  {isOpen && (
                    <div className="detail" onClick={e => e.stopPropagation()}>
                      <div className="detail-label">Appeal statement</div>
                      <div className="appeal-text">{a.appeal_text}</div>

                      {a.admin_response && (
                        <>
                          <div className="detail-label" style={{marginTop:'14px'}}>Admin response · {fmt(a.reviewed_at)}</div>
                          <div className="response-box">{a.admin_response}</div>
                        </>
                      )}

                      {(a.status === 'pending' || a.status === 'under_review') && (
                        <div className="action-area">
                          <div className="detail-label">Your response to the user <span style={{color:'#F87171'}}>*</span> (required for approve/reject)</div>
                          <textarea
                            className="textarea"
                            placeholder="Write a clear response explaining the decision…"
                            value={response}
                            onChange={e => setResponse(e.target.value)}
                          />
                          <div className="action-row">
                            <button className="btn btn-approve" disabled={acting || !response.trim()} onClick={() => doAction(a.id, 'approve')}>
                              {acting ? 'Processing…' : '✅ Approve — reinstate account'}
                            </button>
                            <button className="btn btn-reject" disabled={acting || !response.trim()} onClick={() => doAction(a.id, 'reject')}>
                              ❌ Reject appeal
                            </button>
                            {a.status === 'pending' && (
                              <button className="btn btn-review" disabled={acting} onClick={() => doAction(a.id, 'under_review')}>
                                🔍 Mark under review
                              </button>
                            )}
                          </div>
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
