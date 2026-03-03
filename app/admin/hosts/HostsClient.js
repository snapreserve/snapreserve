'use client'
import { useState } from 'react'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  .topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
  .topbar h1 { font-size:1.05rem; font-weight:700; color:#F5F0EB; }
  .content { padding:32px; }
  .toolbar { display:flex; gap:10px; margin-bottom:20px; align-items:center; flex-wrap:wrap; }
  .search-input { background:#1A1712; border:1px solid #2A2420; border-radius:8px; padding:8px 14px; color:#F5F0EB; font-size:0.85rem; min-width:240px; outline:none; }
  .search-input:focus { border-color:#F4601A; }
  .export-btn { margin-left:auto; background:#2A2420; border:1px solid #3A3028; border-radius:8px; padding:8px 16px; color:#F5F0EB; font-size:0.82rem; font-weight:600; cursor:pointer; }
  .export-btn:hover { border-color:#F4601A; }
  .table-wrap { background:#1A1712; border:1px solid #2A2420; border-radius:12px; overflow:hidden; }
  .table-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr 140px; gap:12px; padding:13px 20px; border-bottom:1px solid #2A2420; align-items:center; }
  .table-row:last-child { border-bottom:none; }
  .table-row.hdr { background:#141210; }
  .table-row.hdr span { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; }
  .cell-main { font-size:0.86rem; font-weight:600; color:#F5F0EB; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cell-sub { font-size:0.73rem; color:#A89880; margin-top:2px; }
  .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; }
  .badge-verified { background:rgba(74,222,128,0.15); color:#4ADE80; }
  .badge-unverified { background:rgba(107,94,82,0.2); color:#A89880; }
  .badge-pending { background:rgba(234,179,8,0.15); color:#FCD34D; }
  .badge-rejected { background:rgba(248,113,113,0.15); color:#F87171; }
  .badge-suspended { background:rgba(248,113,113,0.15); color:#F87171; }
  .badge-active { background:rgba(74,222,128,0.1); color:#4ADE80; }
  .actions { display:flex; gap:6px; flex-wrap:wrap; }
  .btn { padding:5px 12px; border-radius:6px; font-size:0.75rem; font-weight:600; cursor:pointer; border:1px solid transparent; transition:all 0.15s; }
  .btn-verify { background:rgba(74,222,128,0.1); color:#4ADE80; border-color:rgba(74,222,128,0.3); }
  .btn-verify:hover { background:rgba(74,222,128,0.2); }
  .btn-suspend { background:rgba(248,113,113,0.1); color:#F87171; border-color:rgba(248,113,113,0.3); }
  .btn-suspend:hover { background:rgba(248,113,113,0.2); }
  .btn-reactivate { background:rgba(244,96,26,0.1); color:#F4601A; border-color:rgba(244,96,26,0.3); }
  .btn-reactivate:hover { background:rgba(244,96,26,0.2); }
  .btn:disabled { opacity:0.4; cursor:not-allowed; }
  .empty-row { padding:48px; text-align:center; color:#6B5E52; font-size:0.84rem; }
  .date-text { font-size:0.76rem; color:#A89880; }
  /* Modal */
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:100; display:flex; align-items:center; justify-content:center; }
  .modal { background:#1A1712; border:1px solid #2A2420; border-radius:16px; padding:28px; width:100%; max-width:440px; }
  .modal h2 { font-size:1rem; font-weight:700; color:#F5F0EB; margin-bottom:8px; }
  .modal p { font-size:0.84rem; color:#A89880; margin-bottom:16px; }
  .modal textarea { width:100%; background:#0F0D0A; border:1px solid #2A2420; border-radius:8px; padding:10px 12px; color:#F5F0EB; font-size:0.85rem; resize:vertical; min-height:80px; outline:none; font-family:inherit; }
  .modal textarea:focus { border-color:#F4601A; }
  .modal-footer { display:flex; gap:10px; margin-top:16px; justify-content:flex-end; }
  .btn-cancel { background:#2A2420; color:#A89880; border:1px solid #3A3028; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; }
  .btn-confirm { background:#F4601A; color:#fff; border:none; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; }
  .btn-confirm:disabled { opacity:0.5; cursor:not-allowed; }
  .toast { position:fixed; bottom:24px; right:24px; background:#1A1712; border:1px solid #2A2420; border-radius:10px; padding:12px 18px; font-size:0.84rem; font-weight:500; z-index:200; color:#F5F0EB; }
  .toast.success { border-color:rgba(74,222,128,0.4); color:#4ADE80; }
  .toast.error { border-color:rgba(248,113,113,0.4); color:#F87171; }
  @media(max-width:900px) { .table-row{grid-template-columns:1fr 1fr 120px;} .table-row>*:nth-child(3),.table-row>*:nth-child(4){display:none;} }
`

function verifyBadge(status) {
  const map = { verified:'badge-verified', unverified:'badge-unverified', pending:'badge-pending', rejected:'badge-rejected' }
  return <span className={`badge ${map[status] ?? 'badge-unverified'}`}>{status}</span>
}

export default function HostsClient({ initialHosts, role }) {
  const [hosts, setHosts] = useState(initialHosts)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // { action, host }
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const canManage = role === 'admin' || role === 'super_admin'

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function openModal(action, host) {
    setReason('')
    setModal({ action, host })
  }

  async function confirmAction() {
    if (!modal) return
    if (modal.action === 'suspend' && !reason.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/hosts/${modal.host.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: modal.action, reason: reason.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      setHosts(prev => prev.map(h => {
        if (h.id !== modal.host.id) return h
        if (modal.action === 'verify') return { ...h, verification_status: 'verified' }
        if (modal.action === 'suspend') return { ...h, suspended_at: new Date().toISOString(), suspension_reason: reason }
        if (modal.action === 'reactivate') return { ...h, suspended_at: null, suspension_reason: null }
        return h
      }))
      showToast(`Host ${modal.action}d successfully`)
      setModal(null)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    window.location.href = '/api/admin/exports?type=hosts'
  }

  const filtered = hosts.filter(h => {
    const q = search.toLowerCase()
    return (
      h.users?.email?.toLowerCase().includes(q) ||
      h.users?.full_name?.toLowerCase().includes(q) ||
      h.verification_status?.includes(q)
    )
  })

  return (
    <>
      <style>{STYLES}</style>
      <div className="topbar">
        <h1>Hosts</h1>
      </div>
      <div className="content">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search by email or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="export-btn" onClick={exportCSV}>Export CSV</button>
        </div>

        <div className="table-wrap">
          <div className="table-row hdr">
            <span>Host</span>
            <span>Verification</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-row">No hosts found</div>
          ) : filtered.map(h => (
            <div key={h.id} className="table-row">
              <div>
                <div className="cell-main">{h.users?.full_name ?? '—'}</div>
                <div className="cell-sub">{h.users?.email ?? h.user_id}</div>
              </div>
              <div>{verifyBadge(h.verification_status)}</div>
              <div>
                {h.suspended_at
                  ? <span className="badge badge-suspended">Suspended</span>
                  : <span className="badge badge-active">Active</span>
                }
              </div>
              <div className="date-text">
                {h.created_at ? new Date(h.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'}
              </div>
              <div className="actions">
                {canManage && h.verification_status !== 'verified' && !h.suspended_at && (
                  <button className="btn btn-verify" onClick={() => openModal('verify', h)}>Verify</button>
                )}
                {canManage && !h.suspended_at && (
                  <button className="btn btn-suspend" onClick={() => openModal('suspend', h)}>Suspend</button>
                )}
                {canManage && h.suspended_at && (
                  <button className="btn btn-reactivate" onClick={() => openModal('reactivate', h)}>Reactivate</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>{modal.action === 'verify' ? 'Verify Host' : modal.action === 'suspend' ? 'Suspend Host' : 'Reactivate Host'}</h2>
            <p>{modal.host.users?.email}</p>
            {modal.action === 'suspend' && (
              <textarea
                placeholder="Reason for suspension (required)..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            )}
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn-confirm"
                disabled={loading || (modal.action === 'suspend' && !reason.trim())}
                onClick={confirmAction}
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
