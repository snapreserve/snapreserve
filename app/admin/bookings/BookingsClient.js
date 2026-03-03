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
  .filter-select { background:#1A1712; border:1px solid #2A2420; border-radius:8px; padding:8px 12px; color:#F5F0EB; font-size:0.85rem; outline:none; cursor:pointer; }
  .export-btn { margin-left:auto; background:#2A2420; border:1px solid #3A3028; border-radius:8px; padding:8px 16px; color:#F5F0EB; font-size:0.82rem; font-weight:600; cursor:pointer; }
  .export-btn:hover { border-color:#F4601A; }
  .table-wrap { background:#1A1712; border:1px solid #2A2420; border-radius:12px; overflow:hidden; }
  .table-row { display:grid; grid-template-columns:2fr 1.2fr 1fr 1fr 1fr 90px; gap:12px; padding:13px 20px; border-bottom:1px solid #2A2420; align-items:center; }
  .table-row:last-child { border-bottom:none; }
  .table-row.hdr { background:#141210; }
  .table-row.hdr span { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; }
  .cell-main { font-size:0.86rem; font-weight:600; color:#F5F0EB; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cell-sub { font-size:0.73rem; color:#A89880; margin-top:2px; }
  .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; }
  .badge-confirmed { background:rgba(74,222,128,0.1); color:#4ADE80; }
  .badge-cancelled { background:rgba(248,113,113,0.15); color:#F87171; }
  .badge-pending { background:rgba(234,179,8,0.15); color:#FCD34D; }
  .badge-completed { background:rgba(110,164,244,0.15); color:#6EA4F4; }
  .date-text { font-size:0.76rem; color:#A89880; }
  .price-text { font-size:0.84rem; font-weight:600; color:#F5F0EB; }
  .btn-cancel-action { padding:5px 12px; border-radius:6px; font-size:0.75rem; font-weight:600; cursor:pointer; background:rgba(248,113,113,0.1); color:#F87171; border:1px solid rgba(248,113,113,0.3); transition:all 0.15s; }
  .btn-cancel-action:hover { background:rgba(248,113,113,0.2); }
  .btn-cancel-action:disabled { opacity:0.4; cursor:not-allowed; }
  .empty-row { padding:48px; text-align:center; color:#6B5E52; font-size:0.84rem; }
  /* Modal */
  .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:100; display:flex; align-items:center; justify-content:center; }
  .modal { background:#1A1712; border:1px solid #2A2420; border-radius:16px; padding:28px; width:100%; max-width:440px; }
  .modal h2 { font-size:1rem; font-weight:700; color:#F5F0EB; margin-bottom:8px; }
  .modal p { font-size:0.84rem; color:#A89880; margin-bottom:16px; }
  .modal textarea { width:100%; background:#0F0D0A; border:1px solid #2A2420; border-radius:8px; padding:10px 12px; color:#F5F0EB; font-size:0.85rem; resize:vertical; min-height:80px; outline:none; font-family:inherit; }
  .modal textarea:focus { border-color:#F4601A; }
  .modal-footer { display:flex; gap:10px; margin-top:16px; justify-content:flex-end; }
  .btn-cancel { background:#2A2420; color:#A89880; border:1px solid #3A3028; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; }
  .btn-confirm { background:#EF4444; color:#fff; border:none; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; }
  .btn-confirm:disabled { opacity:0.5; cursor:not-allowed; }
  .toast { position:fixed; bottom:24px; right:24px; background:#1A1712; border:1px solid #2A2420; border-radius:10px; padding:12px 18px; font-size:0.84rem; font-weight:500; z-index:200; color:#F5F0EB; }
  .toast.success { border-color:rgba(74,222,128,0.4); color:#4ADE80; }
  .toast.error { border-color:rgba(248,113,113,0.4); color:#F87171; }
  @media(max-width:1100px) { .table-row{grid-template-columns:2fr 1fr 1fr 80px;} .table-row>*:nth-child(3),.table-row>*:nth-child(5){display:none;} }
`

function statusBadge(status) {
  const map = { confirmed:'badge-confirmed', cancelled:'badge-cancelled', pending:'badge-pending', completed:'badge-completed' }
  return <span className={`badge ${map[status] ?? 'badge-pending'}`}>{status}</span>
}

export default function BookingsClient({ initialBookings, role }) {
  const [bookings, setBookings] = useState(initialBookings)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const canCancel = role === 'admin' || role === 'super_admin'

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function confirmCancel() {
    if (!modal || !reason.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/bookings/${modal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setBookings(prev => prev.map(b => b.id === modal.id ? { ...b, status: 'cancelled' } : b))
      showToast('Booking cancelled successfully')
      setModal(null)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function exportCSV() {
    window.location.href = '/api/admin/exports?type=bookings'
  }

  const filtered = bookings.filter(b => {
    const q = search.toLowerCase()
    const matchSearch = (
      b.listings?.title?.toLowerCase().includes(q) ||
      b.reference?.toLowerCase().includes(q) ||
      b.id.includes(q)
    )
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <>
      <style>{STYLES}</style>
      <div className="topbar"><h1>Bookings</h1></div>
      <div className="content">
        <div className="toolbar">
          <input
            className="search-input"
            placeholder="Search by listing, guest email, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="export-btn" onClick={exportCSV}>Export CSV</button>
        </div>

        <div className="table-wrap">
          <div className="table-row hdr">
            <span>Listing / Guest</span>
            <span>Dates</span>
            <span>Total</span>
            <span>Status</span>
            <span>Created</span>
            <span></span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-row">No bookings found</div>
          ) : filtered.map(b => (
            <div key={b.id} className="table-row">
              <div>
                <div className="cell-main">{b.listings?.title ?? 'Unknown Listing'}</div>
                <div className="cell-sub">{b.reference ?? b.guest_id?.slice(0,8) ?? '—'}</div>
              </div>
              <div className="date-text">
                {b.check_in ? new Date(b.check_in).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—'}
                {' → '}
                {b.check_out ? new Date(b.check_out).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—'}
              </div>
              <div className="price-text">{b.total_amount != null ? `$${Number(b.total_amount).toFixed(2)}` : '—'}</div>
              <div>{statusBadge(b.status)}</div>
              <div className="date-text">
                {b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'}
              </div>
              <div>
                {canCancel && b.status !== 'cancelled' && (
                  <button
                    className="btn-cancel-action"
                    onClick={() => { setReason(''); setModal(b) }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>Cancel Booking</h2>
            <p>{modal.listings?.title} · Ref: {modal.reference ?? modal.id?.slice(0,8)}</p>
            <textarea
              placeholder="Reason for cancellation (required)..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(null)}>Back</button>
              <button
                className="btn-confirm"
                disabled={loading || !reason.trim()}
                onClick={confirmCancel}
              >
                {loading ? 'Processing...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
