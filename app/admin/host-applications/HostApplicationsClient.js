'use client'
import { useState } from 'react'

const HOST_TYPE_LABELS = {
  hotel: '🏨 Hotel or Resort',
  property_manager: '🏢 Property Manager',
  individual: '🏠 Individual Host',
}

const STATUS_STYLES = {
  pending:  { bg: 'rgba(234,179,8,0.12)', color: '#D97706', border: 'rgba(234,179,8,0.3)', label: 'Pending' },
  approved: { bg: 'rgba(74,222,128,0.1)',  color: '#16A34A', border: 'rgba(74,222,128,0.25)', label: 'Approved' },
  rejected: { bg: 'rgba(248,113,113,0.1)', color: '#DC2626', border: 'rgba(248,113,113,0.25)', label: 'Rejected' },
}

export default function HostApplicationsClient({ applications: initial }) {
  const [applications, setApplications] = useState(initial)
  const [tab, setTab] = useState('pending')
  const [modal, setModal] = useState(null) // { id, action: 'approve'|'reject', app }
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const filtered = applications.filter(a => a.status === tab)

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function openModal(app, action) {
    setModal({ id: app.id, action, app })
    setReason('')
  }

  async function handleAction() {
    if (!modal) return
    if (modal.action === 'reject' && !reason.trim()) {
      showToast('Rejection reason is required.', false)
      return
    }
    setLoading(true)
    const res = await fetch(`/api/admin/host-applications/${modal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: modal.action, rejection_reason: reason }),
    })
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      showToast(json.error || 'Something went wrong.', false)
      return
    }

    setApplications(prev => prev.map(a =>
      a.id === modal.id ? { ...a, status: json.status } : a
    ))
    showToast(modal.action === 'approve' ? 'Host application approved.' : 'Application rejected.')
    setModal(null)
  }

  const TABS = [
    { key: 'pending',  label: 'Pending',  count: applications.filter(a => a.status === 'pending').length },
    { key: 'approved', label: 'Approved', count: applications.filter(a => a.status === 'approved').length },
    { key: 'rejected', label: 'Rejected', count: applications.filter(a => a.status === 'rejected').length },
  ]

  return (
    <>
      <style>{`
        .tabs { display:flex; gap:4px; background:#141210; border:1px solid var(--sr-border-solid); border-radius:10px; padding:4px; margin-bottom:24px; width:fit-content; }
        .tab-btn { padding:7px 18px; border-radius:7px; border:none; background:transparent; color:var(--sr-muted); font-size:0.82rem; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.15s; display:flex; align-items:center; gap:8px; }
        .tab-btn.active { background:var(--sr-border-solid); color:var(--sr-text); }
        .count-badge { background:#3A302A; border-radius:100px; padding:1px 7px; font-size:0.7rem; font-weight:700; }
        .tab-btn.active .count-badge { background:var(--sr-orange); color:white; }
        .table-wrap { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; overflow:hidden; }
        .table-hdr { display:grid; grid-template-columns:2fr 1.2fr 1fr 1fr 120px; gap:12px; padding:12px 20px; background:#141210; }
        .table-hdr span { font-size:0.66rem; font-weight:700; text-transform:uppercase; letter-spacing:0.09em; color:var(--sr-sub); }
        .table-row { display:grid; grid-template-columns:2fr 1.2fr 1fr 1fr 120px; gap:12px; padding:14px 20px; border-top:1px solid var(--sr-border-solid); align-items:center; }
        .applicant-name { font-size:0.88rem; font-weight:600; color:var(--sr-text); }
        .applicant-email { font-size:0.73rem; color:var(--sr-muted); margin-top:2px; }
        .display-name { font-size:0.84rem; color:#D4CEC5; }
        .host-type { font-size:0.78rem; color:var(--sr-muted); }
        .status-pill { display:inline-flex; align-items:center; padding:3px 10px; border-radius:100px; font-size:0.7rem; font-weight:700; border:1px solid; white-space:nowrap; }
        .date-text { font-size:0.76rem; color:var(--sr-muted); }
        .action-btns { display:flex; gap:6px; }
        .btn-approve { padding:6px 14px; border-radius:8px; font-size:0.76rem; font-weight:700; border:none; cursor:pointer; font-family:inherit; background:rgba(74,222,128,0.12); color:#4ADE80; transition:background 0.15s; }
        .btn-approve:hover { background:rgba(74,222,128,0.2); }
        .btn-reject { padding:6px 14px; border-radius:8px; font-size:0.76rem; font-weight:700; border:none; cursor:pointer; font-family:inherit; background:rgba(248,113,113,0.1); color:#F87171; transition:background 0.15s; }
        .btn-reject:hover { background:rgba(248,113,113,0.2); }
        .empty { padding:48px; text-align:center; color:var(--sr-sub); font-size:0.86rem; }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
        .modal { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:16px; padding:28px; width:100%; max-width:440px; }
        .modal h2 { font-size:1.05rem; font-weight:700; color:var(--sr-text); margin-bottom:8px; }
        .modal p { font-size:0.85rem; color:var(--sr-muted); margin-bottom:20px; line-height:1.6; }
        .modal textarea { width:100%; background:#141210; border:1px solid var(--sr-border-solid); border-radius:10px; padding:12px 14px; font-size:0.86rem; font-family:inherit; color:var(--sr-text); resize:vertical; min-height:80px; outline:none; margin-bottom:20px; }
        .modal textarea:focus { border-color:var(--sr-orange); }
        .modal-btns { display:flex; gap:10px; justify-content:flex-end; }
        .btn-cancel { padding:9px 20px; border-radius:9px; font-size:0.84rem; font-weight:600; border:1px solid var(--sr-border-solid); background:transparent; color:var(--sr-muted); cursor:pointer; font-family:inherit; }
        .btn-confirm-approve { padding:9px 20px; border-radius:9px; font-size:0.84rem; font-weight:700; border:none; background:#16A34A; color:white; cursor:pointer; font-family:inherit; }
        .btn-confirm-reject { padding:9px 20px; border-radius:9px; font-size:0.84rem; font-weight:700; border:none; background:#DC2626; color:white; cursor:pointer; font-family:inherit; }
        .btn-confirm-approve:disabled, .btn-confirm-reject:disabled { opacity:0.5; cursor:not-allowed; }
        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:10px; font-size:0.86rem; font-weight:600; z-index:2000; animation:fadeIn 0.2s; }
        .toast.ok { background:#16A34A; color:white; }
        .toast.err { background:#DC2626; color:white; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            <span className="count-badge">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-hdr">
          <span>Applicant</span>
          <span>Display Name</span>
          <span>Host Type</span>
          <span>Applied</span>
          <span></span>
        </div>
        {filtered.length === 0 ? (
          <div className="empty">No {tab} applications.</div>
        ) : filtered.map(app => {
          const st = STATUS_STYLES[app.status] ?? STATUS_STYLES.pending
          return (
            <div key={app.id} className="table-row">
              <div>
                <div className="applicant-name">{app.users?.full_name || '—'}</div>
                <div className="applicant-email">{app.users?.email || app.user_id}</div>
              </div>
              <div>
                <div className="display-name">{app.display_name || '—'}</div>
              </div>
              <div className="host-type">{HOST_TYPE_LABELS[app.host_type] ?? app.host_type ?? '—'}</div>
              <div className="date-text">
                {app.created_at ? new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </div>
              <div className="action-btns">
                {app.status === 'pending' ? (
                  <>
                    <button className="btn-approve" onClick={() => openModal(app, 'approve')}>Approve</button>
                    <button className="btn-reject" onClick={() => openModal(app, 'reject')}>Reject</button>
                  </>
                ) : (
                  <span className="status-pill" style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                    {st.label}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <h2>{modal.action === 'approve' ? 'Approve Host Application' : 'Reject Host Application'}</h2>
            <p>
              {modal.action === 'approve'
                ? `This will grant full host access to ${modal.app.users?.email ?? modal.app.user_id}. They'll be able to create and publish listings immediately.`
                : `${modal.app.users?.email ?? modal.app.user_id}'s application will be rejected and their role will be reset to user.`
              }
            </p>
            {modal.action === 'reject' && (
              <textarea
                placeholder="Reason for rejection (required)…"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            )}
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              {modal.action === 'approve' ? (
                <button className="btn-confirm-approve" onClick={handleAction} disabled={loading}>
                  {loading ? 'Approving…' : 'Approve'}
                </button>
              ) : (
                <button className="btn-confirm-reject" onClick={handleAction} disabled={loading}>
                  {loading ? 'Rejecting…' : 'Reject'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.ok ? 'ok' : 'err'}`}>{toast.msg}</div>
      )}
    </>
  )
}
