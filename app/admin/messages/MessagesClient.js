'use client'
import { useState } from 'react'
import Link from 'next/link'
import { hasPermission } from '@/lib/admin-permissions'

const TYPE_CFG = {
  info:         { label: 'Message',     color: '#2563EB', bg: '#EFF6FF' },
  warning:      { label: 'Warning',     color: '#92400E', bg: '#FEF3C7' },
  suspension:   { label: 'Suspension',  color: '#991B1B', bg: '#FEE2E2' },
  reactivation: { label: 'Reactivated', color: '#065F46', bg: '#D1FAE5' },
  rejection:    { label: 'Rejection',   color: '#991B1B', bg: '#FEE2E2' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const STYLES = `
.msg-wrap  { display:flex; flex-direction:column; min-height:100%; }
.msg-head  { padding:28px 32px 0; border-bottom:1px solid var(--sr-border-solid); }
.msg-head h1 { font-size:1.25rem; font-weight:700; color:var(--sr-text); margin:0 0 20px; }
.msg-tabs  { display:flex; gap:4px; }
.msg-tab   { padding:8px 18px; border-radius:8px 8px 0 0; font-size:0.84rem; font-weight:600; cursor:pointer;
             border:1px solid transparent; border-bottom:none; color:var(--sr-muted);
             background:transparent; transition:all .15s; }
.msg-tab:hover { color:var(--sr-text); }
.msg-tab.on { background:var(--sr-card); border-color:var(--sr-border-solid); color:var(--sr-text); }

.msg-body  { flex:1; padding:24px 32px; }
.msg-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
.msg-type-btn { padding:6px 14px; border-radius:100px; font-size:0.78rem; font-weight:600; cursor:pointer;
                border:1px solid var(--sr-border-solid); background:var(--sr-card); color:var(--sr-muted);
                transition:all .15s; }
.msg-type-btn:hover { color:var(--sr-text); }
.msg-type-btn.on { border-color:var(--sr-text); color:var(--sr-text); background:var(--sr-card); }

.msg-table { width:100%; border-collapse:collapse; border:1px solid var(--sr-border-solid); border-radius:10px; overflow:hidden; }
.msg-table thead th { padding:11px 16px; text-align:left; font-size:0.69rem; font-weight:700;
                      letter-spacing:.08em; text-transform:uppercase; color:var(--sr-muted);
                      background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); white-space:nowrap; }
.msg-table tbody tr.msg-row { cursor:pointer; transition:background .12s; }
.msg-table tbody tr.msg-row:hover td { background:var(--sr-surface); }
.msg-table tbody tr.msg-row.expanded td { background:var(--sr-surface); }
.msg-table tbody td { padding:13px 16px; font-size:0.84rem; color:var(--sr-text);
                      border-bottom:1px solid var(--sr-border-solid); vertical-align:middle; }
.msg-table tbody tr:last-child td,
.msg-table tbody tr.detail-row:last-child td { border-bottom:none; }
.msg-table tbody tr.detail-row td { padding:0; background:var(--sr-card); }

.msg-type-pill { display:inline-block; padding:3px 9px; border-radius:100px; font-size:0.72rem; font-weight:700; white-space:nowrap; }
.msg-closed-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:100px;
                    font-size:0.72rem; font-weight:700; background:#F1F5F9; color:#64748B; }
.msg-open-badge   { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:100px;
                    font-size:0.72rem; font-weight:700; background:#D1FAE5; color:#065F46; }

.msg-subject { font-weight:600; color:var(--sr-text); margin-bottom:2px; }
.msg-snippet { font-size:0.76rem; color:var(--sr-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:320px; }

.msg-detail { padding:20px 20px 20px 52px; border-top:1px solid var(--sr-border-solid); }
.msg-full-body { font-size:0.85rem; color:var(--sr-text); line-height:1.7; white-space:pre-wrap;
                 background:var(--sr-bg); padding:14px 16px; border-radius:8px; border:1px solid var(--sr-border-solid); }
.msg-host-reply { font-size:0.85rem; color:var(--sr-text); line-height:1.7; white-space:pre-wrap;
                  background:var(--sr-bg); padding:14px 16px; border-radius:8px;
                  border-left:3px solid #34D399; margin-top:12px; }
.msg-reply-label { font-size:0.69rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#059669; margin-bottom:6px; }

.msg-reply-area textarea { width:100%; min-height:90px; padding:11px 13px; border-radius:8px;
                            border:1px solid var(--sr-border-solid); background:var(--sr-bg);
                            color:var(--sr-text); font-size:0.84rem; font-family:inherit; resize:vertical; outline:none; }
.msg-reply-area textarea:focus { border-color:var(--sr-orange); box-shadow:0 0 0 3px rgba(244,96,26,.08); }

.msg-action-row { display:flex; align-items:center; justify-content:space-between; margin-top:14px; flex-wrap:wrap; gap:10px; }
.msg-btn { padding:8px 18px; border-radius:8px; font-size:0.82rem; font-weight:600; cursor:pointer;
           border:1px solid var(--sr-border-solid); background:var(--sr-card); color:var(--sr-text); transition:all .15s; }
.msg-btn:hover:not(:disabled) { background:var(--sr-surface); }
.msg-btn:disabled { opacity:.5; cursor:not-allowed; }
.msg-btn.primary { background:var(--sr-orange); color:white; border-color:var(--sr-orange); }
.msg-btn.primary:hover:not(:disabled) { opacity:.88; }

.msg-empty { text-align:center; padding:48px 24px; color:var(--sr-muted); font-size:0.88rem; }
.msg-toast { position:fixed; bottom:24px; right:24px; padding:11px 18px; border-radius:10px;
             font-size:0.83rem; font-weight:500; z-index:200; background:var(--sr-card);
             border:1px solid var(--sr-border-solid); color:var(--sr-text); box-shadow:0 4px 16px rgba(0,0,0,.1); }
.msg-toast.error   { border-color:rgba(239,68,68,.4); color:#EF4444; }
.msg-toast.success { border-color:rgba(52,211,153,.4); color:#059669; }
`

export default function MessagesClient({ initialMessages, role }) {
  const [messages, setMessages]     = useState(initialMessages)
  const [expandedId, setExpandedId] = useState(null)
  const [statusFilter, setStatusFilter] = useState('open')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [replyDraft, setReplyDraft]     = useState({})
  const [sendingId, setSendingId]       = useState(null)
  const [closingId, setClosingId]       = useState(null)
  const [toast, setToast]               = useState(null)
  const canReply = hasPermission(role, 'messaging', 'send')

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function setClosed(messageId, close) {
    const id = String(messageId)
    setClosingId(id)
    try {
      const res  = await fetch(`/api/admin/messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: close ? 'close' : 'reopen' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update ticket')
      const closedAt = close ? (data.closed_at || new Date().toISOString()) : null
      setMessages((prev) => prev.map((m) =>
        String(m.id) === id ? { ...m, closed_at: closedAt, closed_by: close ? (data.closed_by ?? null) : null } : m
      ))
      setStatusFilter(close ? 'closed' : 'open')
      showToast(close ? 'Ticket closed.' : 'Ticket reopened.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setClosingId(null)
    }
  }

  async function sendReply(messageId) {
    const body = replyDraft[messageId]?.trim()
    if (!body) return
    setSendingId(messageId)
    try {
      const res  = await fetch('/api/admin/messages/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, body }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send reply')
      setReplyDraft((prev) => ({ ...prev, [messageId]: '' }))
      showToast('Reply sent. The host will receive it in their inbox and by email.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSendingId(null)
    }
  }

  const openCount   = messages.filter((m) => !m.closed_at).length
  const closedCount = messages.filter((m) => !!m.closed_at).length

  const byStatus =
    statusFilter === 'open'   ? messages.filter((m) => !m.closed_at)
    : statusFilter === 'closed' ? messages.filter((m) => !!m.closed_at)
    : messages

  const filtered = typeFilter === 'all' ? byStatus : byStatus.filter((m) => m.type === typeFilter)

  // Type pills — only show types that actually appear in current messages
  const availableTypes = ['all', ...new Set(messages.map((m) => m.type).filter(Boolean))]

  return (
    <>
      <style>{STYLES}</style>
      <div className="msg-wrap">

        {/* Header + tab strip */}
        <div className="msg-head">
          <h1>Messages</h1>
          <div className="msg-tabs">
            <button className={`msg-tab${statusFilter === 'open'   ? ' on' : ''}`} onClick={() => setStatusFilter('open')}>
              Open ({openCount})
            </button>
            <button className={`msg-tab${statusFilter === 'closed' ? ' on' : ''}`} onClick={() => setStatusFilter('closed')}>
              Closed ({closedCount})
            </button>
            <button className={`msg-tab${statusFilter === 'all'    ? ' on' : ''}`} onClick={() => setStatusFilter('all')}>
              All ({messages.length})
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="msg-body">

          {/* Type filter pills */}
          {availableTypes.length > 1 && (
            <div className="msg-toolbar">
              {availableTypes.map((t) => (
                <button
                  key={t}
                  className={`msg-type-btn${typeFilter === t ? ' on' : ''}`}
                  onClick={() => setTypeFilter(t)}
                >
                  {t === 'all' ? 'All types' : (TYPE_CFG[t]?.label ?? t)}
                  {t !== 'all' && ` (${byStatus.filter((m) => m.type === t).length})`}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <table className="msg-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>Subject</th>
                <th>Type</th>
                <th>Sent</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="msg-empty">No messages.</td>
                </tr>
              ) : filtered.map((m) => {
                const cfg      = TYPE_CFG[m.type] || { label: m.type || 'Message', color: '#64748B', bg: '#F1F5F9' }
                const isOpen   = expandedId === m.id
                const isClosed = !!m.closed_at

                return (
                  <>
                    <tr
                      key={m.id}
                      className={`msg-row${isOpen ? ' expanded' : ''}`}
                      onClick={() => setExpandedId(isOpen ? null : m.id)}
                    >
                      {/* Host */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--sr-text)' }}>
                          {m.host_name || '—'}
                        </div>
                        {m.host_email && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--sr-muted)', marginTop: 2 }}>
                            {m.host_email}
                          </div>
                        )}
                      </td>

                      {/* Subject + snippet */}
                      <td>
                        <div className="msg-subject">{m.subject || '(no subject)'}</div>
                        {!isOpen && m.body && (
                          <div className="msg-snippet">{m.body}</div>
                        )}
                        {m.listing_title && m.listing_title !== '—' && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--sr-muted)', marginTop: 2 }}>
                            {m.listing_title}
                          </div>
                        )}
                      </td>

                      {/* Type */}
                      <td>
                        <span className="msg-type-pill" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>

                      {/* Sent */}
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--sr-muted)', fontSize: '0.8rem' }}>
                        {fmtDate(m.created_at)}
                      </td>

                      {/* Status */}
                      <td>
                        {isClosed
                          ? <span className="msg-closed-badge">Closed</span>
                          : <span className="msg-open-badge">Open</span>}
                      </td>

                      {/* Chevron */}
                      <td style={{ textAlign: 'right', color: 'var(--sr-muted)', fontSize: '0.75rem', paddingRight: 20 }}>
                        {isOpen ? '▲' : '▼'}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isOpen && (
                      <tr key={`${m.id}-detail`} className="detail-row">
                        <td colSpan={6} onClick={(e) => e.stopPropagation()}>
                          <div className="msg-detail">

                            {/* Full body */}
                            {m.body && <div className="msg-full-body">{m.body}</div>}

                            {/* Host reply */}
                            {m.reply_body && (
                              <div className="msg-host-reply">
                                <div className="msg-reply-label">Host reply</div>
                                {m.reply_body}
                                {m.replied_at && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)', marginTop: 8 }}>
                                    {fmtDate(m.replied_at)}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Closed note */}
                            {isClosed && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--sr-muted)', marginTop: 10 }}>
                                Closed {fmtDate(m.closed_at)}
                              </div>
                            )}

                            {/* Reply form */}
                            {canReply && (
                              <div className="msg-reply-area" style={{ marginTop: 16 }}>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--sr-text)', marginBottom: 8 }}>
                                  Reply to host
                                </label>
                                <textarea
                                  placeholder="Type your reply… The host will see this in their Messages and receive an email."
                                  value={replyDraft[m.id] ?? ''}
                                  onChange={(e) => setReplyDraft((prev) => ({ ...prev, [m.id]: e.target.value }))}
                                  disabled={!!sendingId}
                                />
                              </div>
                            )}

                            <div className="msg-action-row">
                              <span style={{ fontSize: '0.8rem', color: 'var(--sr-muted)' }}>
                                {isClosed ? 'This ticket is closed.' : 'Mark as resolved when done.'}
                              </span>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {canReply && (
                                  <button
                                    type="button"
                                    className="msg-btn primary"
                                    disabled={!replyDraft[m.id]?.trim() || sendingId === m.id}
                                    onClick={() => sendReply(m.id)}
                                  >
                                    {sendingId === m.id ? 'Sending…' : 'Send reply'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="msg-btn"
                                  disabled={closingId === String(m.id)}
                                  onClick={() => setClosed(m.id, !isClosed)}
                                >
                                  {closingId === String(m.id) ? '…' : isClosed ? 'Reopen' : 'Close ticket'}
                                </button>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>

        </div>
      </div>

      {toast && (
        <div className={`msg-toast${toast.type === 'error' ? ' error' : ' success'}`}>
          {toast.msg}
        </div>
      )}
    </>
  )
}
