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
  .table-row { display:grid; grid-template-columns:2fr 1fr 1fr 160px; gap:12px; padding:13px 20px; border-bottom:1px solid #2A2420; align-items:center; }
  .table-row:last-child { border-bottom:none; }
  .table-row.hdr { background:#141210; }
  .table-row.hdr span { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; }
  .cell-main { font-size:0.86rem; font-weight:600; color:#F5F0EB; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cell-sub { font-size:0.73rem; color:#A89880; margin-top:2px; }
  .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; }
  .badge-active { background:rgba(74,222,128,0.1); color:#4ADE80; }
  .badge-suspended { background:rgba(248,113,113,0.15); color:#F87171; }
  .badge-inactive { background:rgba(107,94,82,0.2); color:#A89880; }
  .actions { display:flex; gap:6px; flex-wrap:wrap; }
  .btn { padding:5px 12px; border-radius:6px; font-size:0.75rem; font-weight:600; cursor:pointer; border:1px solid transparent; transition:all 0.15s; }
  .btn-suspend { background:rgba(248,113,113,0.1); color:#F87171; border-color:rgba(248,113,113,0.3); }
  .btn-suspend:hover { background:rgba(248,113,113,0.2); }
  .btn-deactivate { background:rgba(107,94,82,0.2); color:#A89880; border-color:rgba(107,94,82,0.4); }
  .btn-deactivate:hover { background:rgba(107,94,82,0.35); }
  .btn-reactivate { background:rgba(244,96,26,0.1); color:#F4601A; border-color:rgba(244,96,26,0.3); }
  .btn-reactivate:hover { background:rgba(244,96,26,0.2); }
  .btn:disabled { opacity:0.4; cursor:not-allowed; }
  .date-text { font-size:0.76rem; color:#A89880; }
  .empty-row { padding:48px; text-align:center; color:#6B5E52; font-size:0.84rem; }
  /* Modal */
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:100; display:flex; align-items:center; justify-content:center; }
  .modal { background:#1A1712; border:1px solid #2A2420; border-radius:16px; padding:28px; width:100%; max-width:440px; }
  .modal h2 { font-size:1rem; font-weight:700; color:#F5F0EB; margin-bottom:8px; }
  .modal p { font-size:0.84rem; color:#A89880; margin-bottom:16px; }
  .modal textarea { width:100%; background:#0F0D0A; border:1px solid #2A2420; border-radius:8px; padding:10px 12px; color:#F5F0EB; font-size:0.85rem; resize:vertical; min-height:80px; outline:none; font-family:inherit; }
  .modal textarea:focus { border-color:#F4601A; }
  .modal input[type=text] { width:100%; background:#0F0D0A; border:1px solid #2A2420; border-radius:8px; padding:10px 12px; color:#F5F0EB; font-size:0.85rem; outline:none; font-family:inherit; margin-top:8px; }
  .modal input[type=text]:focus { border-color:#F4601A; }
  .delete-warning { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.25); border-radius:8px; padding:10px 14px; font-size:0.82rem; color:#F87171; margin-bottom:12px; }
  .modal-footer { display:flex; gap:10px; margin-top:16px; justify-content:flex-end; }
  .btn-cancel { background:#2A2420; color:#A89880; border:1px solid #3A3028; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; }
  .btn-confirm { background:#F4601A; color:#fff; border:none; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; }
  .btn-confirm.danger { background:#EF4444; }
  .btn-confirm:disabled { opacity:0.5; cursor:not-allowed; }
  .toast { position:fixed; bottom:24px; right:24px; background:#1A1712; border:1px solid #2A2420; border-radius:10px; padding:12px 18px; font-size:0.84rem; font-weight:500; z-index:200; color:#F5F0EB; }
  .toast.success { border-color:rgba(74,222,128,0.4); color:#4ADE80; }
  .toast.error { border-color:rgba(248,113,113,0.4); color:#F87171; }
  @media(max-width:900px) { .table-row{grid-template-columns:1fr 1fr 120px;} .table-row>*:nth-child(3){display:none;} }
`

export default function GuestsClient({ initialGuests, role }) {
  const [guests, setGuests] = useState(initialGuests)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // { action, guest }
  const [reason, setReason] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const canManage = role === 'admin' || role === 'super_admin'

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function openModal(action, guest) {
    setReason('')
    setDeleteConfirm('')
    setModal({ action, guest })
  }

  async function confirmAction() {
    if (!modal) return
    if ((modal.action === 'suspend' || modal.action === 'deactivate') && !reason.trim()) return
    if (modal.action === 'deactivate' && deleteConfirm !== 'DELETE') return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/guests/${modal.guest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: modal.action, reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')

      setGuests(prev => prev.map(g => {
        if (g.id !== modal.guest.id) return g
        if (modal.action === 'suspend') return { ...g, suspended_at: new Date().toISOString(), is_active: false }
        if (modal.action === 'deactivate') return { ...g, deleted_at: new Date().toISOString(), is_active: false }
        if (modal.action === 'reactivate') return { ...g, suspended_at: null, deleted_at: null, is_active: true }
        return g
      }))
      showToast(`Guest ${modal.action === 'deactivate' ? 'deactivated' : modal.action + 'd'} successfully`)
      setModal(null)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    window.location.href = '/api/admin/exports?type=guests'
  }

  const filtered = guests.filter(g => {
    const q = search.toLowerCase()
    return g.email?.toLowerCase().includes(q) || g.full_name?.toLowerCase().includes(q)
  })

  function statusBadge(g) {
    if (g.suspended_at) return <span className="badge badge-suspended">Suspended</span>
    if (!g.is_active) return <span className="badge badge-inactive">Inactive</span>
    return <span className="badge badge-active">Active</span>
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="topbar"><h1>Guests</h1></div>
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
            <span>User</span>
            <span>Status</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-row">No guests found</div>
          ) : filtered.map(g => (
            <div key={g.id} className="table-row">
              <div>
                <div className="cell-main">{g.full_name ?? '—'}</div>
                <div className="cell-sub">{g.email}</div>
              </div>
              <div>{statusBadge(g)}</div>
              <div className="date-text">
                {g.created_at ? new Date(g.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'}
              </div>
              <div className="actions">
                {canManage && !g.suspended_at && g.is_active && (
                  <button className="btn btn-suspend" onClick={() => openModal('suspend', g)}>Suspend</button>
                )}
                {canManage && g.is_active && (
                  <button className="btn btn-deactivate" onClick={() => openModal('deactivate', g)}>Deactivate</button>
                )}
                {canManage && (!g.is_active || g.suspended_at) && (
                  <button className="btn btn-reactivate" onClick={() => openModal('reactivate', g)}>Reactivate</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>
              {modal.action === 'suspend' ? 'Suspend User' : modal.action === 'deactivate' ? 'Deactivate User' : 'Reactivate User'}
            </h2>
            <p>{modal.guest.email}</p>
            {modal.action === 'deactivate' && (
              <div className="delete-warning">
                This will mark the account as deleted. The user will lose access immediately.
              </div>
            )}
            {(modal.action === 'suspend' || modal.action === 'deactivate') && (
              <textarea
                placeholder="Reason (required)..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            )}
            {modal.action === 'deactivate' && (
              <>
                <p style={{marginTop:'12px',marginBottom:'4px'}}>Type <strong>DELETE</strong> to confirm:</p>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                />
              </>
            )}
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`btn-confirm${modal.action === 'deactivate' ? ' danger' : ''}`}
                disabled={
                  loading ||
                  ((modal.action === 'suspend' || modal.action === 'deactivate') && !reason.trim()) ||
                  (modal.action === 'deactivate' && deleteConfirm !== 'DELETE')
                }
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
