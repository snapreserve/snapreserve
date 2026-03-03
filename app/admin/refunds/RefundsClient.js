'use client'
import { useState } from 'react'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  .topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
  .topbar h1 { font-size:1.05rem; font-weight:700; color:#F5F0EB; }
  .content { padding:32px; }
  .tabs { display:flex; gap:4px; margin-bottom:20px; background:#1A1712; border:1px solid #2A2420; border-radius:10px; padding:4px; width:fit-content; }
  .tab { padding:7px 18px; border-radius:7px; font-size:0.83rem; font-weight:600; cursor:pointer; color:#A89880; border:none; background:transparent; transition:all 0.15s; }
  .tab.active { background:#2A2420; color:#F5F0EB; }
  .toolbar { display:flex; gap:10px; margin-bottom:20px; align-items:center; }
  .export-btn { margin-left:auto; background:#2A2420; border:1px solid #3A3028; border-radius:8px; padding:8px 16px; color:#F5F0EB; font-size:0.82rem; font-weight:600; cursor:pointer; }
  .export-btn:hover { border-color:#F4601A; }
  .table-wrap { background:#1A1712; border:1px solid #2A2420; border-radius:12px; overflow:hidden; }
  .table-row { display:grid; grid-template-columns:1.5fr 1fr 1fr 2fr 1fr 160px; gap:12px; padding:13px 20px; border-bottom:1px solid #2A2420; align-items:center; }
  .table-row:last-child { border-bottom:none; }
  .table-row.hdr { background:#141210; }
  .table-row.hdr span { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; }
  .cell-main { font-size:0.83rem; font-weight:600; color:#F5F0EB; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cell-sub { font-size:0.73rem; color:#A89880; margin-top:2px; }
  .amount-text { font-size:0.9rem; font-weight:700; color:#F5F0EB; }
  .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; }
  .badge-pending { background:rgba(234,179,8,0.15); color:#FCD34D; }
  .badge-approved { background:rgba(74,222,128,0.1); color:#4ADE80; }
  .badge-denied { background:rgba(248,113,113,0.15); color:#F87171; }
  .date-text { font-size:0.76rem; color:#A89880; }
  .actions { display:flex; gap:6px; }
  .btn { padding:5px 12px; border-radius:6px; font-size:0.75rem; font-weight:600; cursor:pointer; border:1px solid transparent; transition:all 0.15s; }
  .btn-approve { background:rgba(74,222,128,0.1); color:#4ADE80; border-color:rgba(74,222,128,0.3); }
  .btn-approve:hover:not(:disabled) { background:rgba(74,222,128,0.2); }
  .btn-deny { background:rgba(248,113,113,0.1); color:#F87171; border-color:rgba(248,113,113,0.3); }
  .btn-deny:hover { background:rgba(248,113,113,0.2); }
  .btn:disabled { opacity:0.4; cursor:not-allowed; }
  .limit-tip { font-size:0.7rem; color:#A89880; margin-top:3px; }
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
  .btn-confirm { background:#F4601A; color:#fff; border:none; border-radius:8px; padding:8px 18px; font-size:0.84rem; font-weight:600; cursor:pointer; }
  .btn-confirm.deny { background:#EF4444; }
  .btn-confirm:disabled { opacity:0.5; cursor:not-allowed; }
  .toast { position:fixed; bottom:24px; right:24px; background:#1A1712; border:1px solid #2A2420; border-radius:10px; padding:12px 18px; font-size:0.84rem; font-weight:500; z-index:200; color:#F5F0EB; }
  .toast.success { border-color:rgba(74,222,128,0.4); color:#4ADE80; }
  .toast.error { border-color:rgba(248,113,113,0.4); color:#F87171; }
  @media(max-width:1100px) { .table-row{grid-template-columns:1.5fr 1fr 2fr 140px;} .table-row>*:nth-child(2),.table-row>*:nth-child(5){display:none;} }
`

const TABS = ['pending', 'approved', 'denied']

export default function RefundsClient({ initialRefunds, role }) {
  const [refunds, setRefunds] = useState(initialRefunds)
  const [activeTab, setActiveTab] = useState('pending')
  const [modal, setModal] = useState(null) // { action, refund }
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const canApprove = role === 'support' || role === 'admin' || role === 'super_admin'

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function isSupportLimited(refund) {
    if (role !== 'support') return false
    const bookingTotal = refund.bookings?.total_amount ?? 0
    return refund.amount > 100 || refund.amount > bookingTotal * 0.2
  }

  async function confirmAction() {
    if (!modal) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/refunds/${modal.refund.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: modal.action, notes: notes.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setRefunds(prev => prev.map(r => r.id === modal.refund.id ? { ...r, status: modal.action === 'approve' ? 'approved' : 'denied' } : r))
      showToast(`Refund ${modal.action === 'approve' ? 'approved' : 'denied'} successfully`)
      setModal(null)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtered = refunds.filter(r => r.status === activeTab)

  return (
    <>
      <style>{STYLES}</style>
      <div className="topbar"><h1>Refunds</h1></div>
      <div className="content">
        <div className="toolbar">
          <div className="tabs">
            {TABS.map(t => (
              <button key={t} className={`tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {' '}
                <span style={{opacity:0.6}}>({refunds.filter(r => r.status === t).length})</span>
              </button>
            ))}
          </div>
          <button className="export-btn" onClick={() => window.location.href = '/api/admin/exports?type=refunds'}>Export CSV</button>
        </div>

        <div className="table-wrap">
          <div className="table-row hdr">
            <span>Guest</span>
            <span>Amount</span>
            <span>Booking Total</span>
            <span>Reason</span>
            <span>Requested</span>
            <span>Actions</span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-row">No {activeTab} refunds</div>
          ) : filtered.map(r => {
            const limited = isSupportLimited(r)
            return (
              <div key={r.id} className="table-row">
                <div>
                  <div className="cell-main">{r.bookings?.reference ?? r.booking_id?.slice(0,8) ?? '—'}</div>
                  <div className="cell-sub" style={{fontFamily:'monospace', fontSize:'0.7rem'}}>{r.booking_id?.slice(0,8)}…</div>
                </div>
                <div className="amount-text">${Number(r.amount).toFixed(2)}</div>
                <div className="amount-text" style={{color:'#A89880', fontWeight:500}}>
                  {r.bookings?.total_amount != null ? `$${Number(r.bookings.total_amount).toFixed(2)}` : '—'}
                </div>
                <div>
                  <div className="cell-main" style={{fontWeight:500}}>{r.reason}</div>
                  {r.notes && <div className="cell-sub">{r.notes}</div>}
                </div>
                <div className="date-text">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'}
                </div>
                <div>
                  {r.status === 'pending' && canApprove && (
                    <div className="actions">
                      <div>
                        <button
                          className="btn btn-approve"
                          disabled={limited}
                          title={limited ? 'Exceeds support limit ($100 / 20% of booking)' : ''}
                          onClick={() => { setNotes(''); setModal({ action:'approve', refund:r }) }}
                        >
                          Approve
                        </button>
                        {limited && <div className="limit-tip">Exceeds limit</div>}
                      </div>
                      <button
                        className="btn btn-deny"
                        onClick={() => { setNotes(''); setModal({ action:'deny', refund:r }) }}
                      >
                        Deny
                      </button>
                    </div>
                  )}
                  {r.status !== 'pending' && (
                    <span className={`badge badge-${r.status}`}>{r.status}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modal && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>{modal.action === 'approve' ? 'Approve Refund' : 'Deny Refund'}</h2>
            <p>${Number(modal.refund.amount).toFixed(2)} · Ref: {modal.refund.bookings?.reference ?? modal.refund.booking_id?.slice(0,8)}</p>
            <textarea
              placeholder="Notes (optional)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button
                className={`btn-confirm${modal.action === 'deny' ? ' deny' : ''}`}
                disabled={loading}
                onClick={confirmAction}
              >
                {loading ? 'Processing...' : modal.action === 'approve' ? 'Approve' : 'Deny'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
