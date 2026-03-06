'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function fmt(d) {
  if (!d) return ''
  const date = new Date(d)
  const now  = new Date()
  const diff = now - date
  if (diff < 60_000)   return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const REPORT_REASONS = [
  'Spam or unsolicited messages',
  'Harassment or abuse',
  'Inappropriate content',
  'Scam or fraud attempt',
  'Other',
]

function MessagesInner() {
  const searchParams   = useSearchParams()
  const [convs,        setConvs]        = useState([])
  const [userId,       setUserId]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [activeId,     setActiveId]     = useState(searchParams.get('c') || null)
  const [thread,       setThread]       = useState(null)   // { conversation, messages }
  const [threadLoading,setThreadLoading]= useState(false)
  const [draft,        setDraft]        = useState('')
  const [sending,      setSending]      = useState(false)
  const [reportModal,  setReportModal]  = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reporting,    setReporting]    = useState(false)
  const [toast,        setToast]        = useState(null)
  const bottomRef = useRef(null)

  // SnapReserve™ Support messages (host_messages for current user)
  const [supportMsgs,    setSupportMsgs]    = useState([])
  const [supportLoading, setSupportLoading] = useState(true)
  const [supportUnread,  setSupportUnread]  = useState(0)
  const [supportDraft,   setSupportDraft]   = useState('')
  const [supportSending, setSupportSending] = useState(false)
  const supportRef = useRef(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load conversation list
  useEffect(() => {
    fetch('/api/messages')
      .then(r => r.json())
      .then(data => {
        setConvs(data.conversations || [])
        setUserId(data.userId)
        setLoading(false)
      })
  }, [])

  // Load SnapReserve™ support messages
  useEffect(() => {
    fetch('/api/account/support-messages')
      .then(r => r.json())
      .then(data => {
        setSupportMsgs(data.messages || [])
        setSupportUnread(data.unreadCount || 0)
        setSupportLoading(false)
      })
  }, [])

  // Auto-open conv from URL param
  useEffect(() => {
    const c = searchParams.get('c')
    if (c && !activeId) openThread(c)
  }, [convs])

  async function openThread(convId) {
    setActiveId(convId)
    setThreadLoading(true)
    const res  = await fetch(`/api/messages/${convId}`)
    const data = await res.json()
    setThread(data)
    setThreadLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    // Clear unread in local list
    setConvs(prev => prev.map(c => {
      if (c.id !== convId) return c
      return c.guest_user_id === data.userId
        ? { ...c, guest_unread_count: 0 }
        : { ...c, host_unread_count:  0 }
    }))
  }

  async function sendMessage(e) {
    e?.preventDefault()
    if (!draft.trim() || !activeId || sending) return
    setSending(true)
    const res = await fetch(`/api/messages/${activeId}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: draft.trim() }),
    })
    const msg = await res.json()
    setSending(false)
    if (res.ok) {
      setThread(t => ({ ...t, messages: [...(t?.messages || []), msg] }))
      setDraft('')
      // Update preview in list
      setConvs(prev => prev.map(c => c.id === activeId
        ? { ...c, last_message_at: msg.created_at, last_message_preview: msg.body.slice(0, 80) }
        : c
      ))
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } else {
      showToast(msg.error || 'Failed to send message.', 'error')
    }
  }

  async function doAction(action) {
    const res = await fetch(`/api/messages/${activeId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action }),
    })
    const data = await res.json()
    if (res.ok) {
      setThread(t => ({ ...t, conversation: { ...t.conversation, status: action === 'block' ? 'blocked' : action === 'unblock' ? 'active' : 'archived' } }))
      setConvs(prev => prev.map(c => c.id === activeId
        ? { ...c, status: action === 'block' ? 'blocked' : action === 'archive' ? 'archived' : 'active' }
        : c
      ))
      showToast(action === 'block' ? 'User blocked.' : action === 'unblock' ? 'User unblocked.' : 'Archived.')
    } else {
      showToast(data.error || 'Failed.', 'error')
    }
  }

  async function sendReply(e) {
    e?.preventDefault()
    if (!supportDraft.trim() || supportSending) return
    // Reply goes to the most recent unreplied message
    const unreplied = [...supportMsgs].reverse().find(m => !m.reply_body)
    if (!unreplied) return
    setSupportSending(true)
    const res = await fetch(`/api/host/messages/${unreplied.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reply: supportDraft.trim() }),
    })
    setSupportSending(false)
    if (res.ok) {
      setSupportMsgs(prev => prev.map(m =>
        m.id === unreplied.id
          ? { ...m, reply_body: supportDraft.trim(), replied_at: new Date().toISOString() }
          : m
      ))
      setSupportDraft('')
      setTimeout(() => supportRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } else {
      showToast('Failed to send reply.', 'error')
    }
  }

  async function submitReport() {
    if (!reportReason) return
    setReporting(true)
    const res = await fetch(`/api/messages/${activeId}/report`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reason: reportReason }),
    })
    setReporting(false)
    setReportModal(false)
    showToast(res.ok ? 'Conversation reported. Thank you.' : 'Failed to submit report.', res.ok ? 'success' : 'error')
  }

  const conv     = thread?.conversation
  const isHost   = conv && userId && conv.host_user_id === userId
  const isGuest  = conv && userId && conv.guest_user_id === userId
  const unread   = convs.reduce((n, c) => n + (userId === c.guest_user_id ? c.guest_unread_count : c.host_unread_count), 0) + supportUnread
  const blocked  = conv?.status === 'blocked'

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 999,
          background: toast.type === 'error' ? '#DC2626' : '#16A34A',
          color: 'white', padding: '12px 20px', borderRadius: '12px',
          fontSize: '0.85rem', fontWeight: 600,
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 700, marginBottom: '4px' }}>
          Messages
          {unread > 0 && (
            <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#F4601A', color: 'white', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', verticalAlign: 'middle' }}>
              {unread}
            </span>
          )}
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#6B5F54' }}>Ask hosts questions before you book.</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', minHeight: '560px' }}>
        {/* ── Left: conversation list ─────────────────────────── */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>

          {/* SnapReserve™ Support entry — shown if any support messages exist */}
          {!supportLoading && supportMsgs.length > 0 && (
            <button
              onClick={() => { setActiveId('__support__'); setSupportUnread(0) }}
              style={{
                width: '100%', textAlign: 'left',
                background: activeId === '__support__' ? 'white' : 'transparent',
                border: activeId === '__support__' ? '1.5px solid #F4601A' : '1px solid #E8E2D9',
                borderRadius: '12px', padding: '12px 14px', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F4601A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white', fontWeight: 800, flexShrink: 0 }}>S</div>
                  <div style={{ fontWeight: supportUnread > 0 ? 700 : 600, fontSize: '0.84rem', color: '#1A1410', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    SnapReserve™ Support
                  </div>
                </div>
                <div style={{ fontSize: '0.66rem', color: '#A89880', flexShrink: 0 }}>{fmt(supportMsgs.at(-1)?.created_at)}</div>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6B5F54', marginTop: '2px', paddingLeft: '29px' }}>SnapReserve™ Team</div>
              <div style={{ fontSize: '0.74rem', color: '#A89880', marginTop: '3px', paddingLeft: '29px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {supportMsgs.at(-1)?.subject || 'No messages yet'}
              </div>
              {supportUnread > 0 && (
                <div style={{ marginTop: '6px', paddingLeft: '29px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F4601A' }} />
                  <span style={{ fontSize: '0.66rem', color: '#F4601A', fontWeight: 700 }}>{supportUnread} new</span>
                </div>
              )}
            </button>
          )}

          {loading && <div style={{ color: '#A89880', fontSize: '0.84rem' }}>Loading…</div>}
          {!loading && convs.length === 0 && supportMsgs.length === 0 && (
            <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#A89880', fontSize: '0.84rem' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>💬</div>
              No conversations yet.<br />
              <a href="/listings" style={{ color: '#F4601A', fontWeight: 600, fontSize: '0.84rem' }}>Browse listings →</a>
            </div>
          )}
          {convs.map(c => {
            const isMe    = userId === c.guest_user_id
            const other   = isMe ? c.host : c.guest
            const myUnread = isMe ? c.guest_unread_count : c.host_unread_count
            const isActive = activeId === c.id

            return (
              <button
                key={c.id}
                onClick={() => openThread(c.id)}
                style={{
                  width: '100%', textAlign: 'left', background: isActive ? 'white' : 'transparent',
                  border: isActive ? '1.5px solid #F4601A' : '1px solid #E8E2D9',
                  borderRadius: '12px', padding: '12px 14px', cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                  <div style={{ fontWeight: myUnread > 0 ? 700 : 600, fontSize: '0.84rem', color: '#1A1410', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {c.listing?.title || 'Listing'}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#A89880', flexShrink: 0 }}>{fmt(c.last_message_at)}</div>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#6B5F54', marginTop: '1px' }}>
                  {other?.full_name || '—'}
                  {c.is_booked_guest_chat && <span style={{ marginLeft: '6px', color: '#16A34A', fontWeight: 700 }}>✓ Booked</span>}
                  {c.status === 'blocked'  && <span style={{ marginLeft: '6px', color: '#DC2626', fontWeight: 700 }}>Blocked</span>}
                  {c.status === 'archived' && <span style={{ marginLeft: '6px', color: '#A89880' }}>Archived</span>}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#A89880', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.last_message_preview || 'No messages yet'}
                </div>
                {myUnread > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F4601A' }} />
                    <span style={{ fontSize: '0.66rem', color: '#F4601A', fontWeight: 700 }}>{myUnread} new</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Right: message thread ───────────────────────────── */}
        <div style={{ flex: 1, background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeId ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#A89880', gap: '8px' }}>
              <div style={{ fontSize: '2.5rem' }}>💬</div>
              <div style={{ fontSize: '0.88rem' }}>Select a conversation</div>
            </div>
          ) : activeId === '__support__' ? (
            // ── SnapReserve™ Support thread ──────────────────────
            <>
              {/* Header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E2D9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F4601A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'white', fontWeight: 800, flexShrink: 0 }}>S</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#1A1410' }}>SnapReserve™ Support</div>
                  <div style={{ fontSize: '0.74rem', color: '#A89880' }}>Official messages from the SnapReserve™ team</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {supportMsgs.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#A89880', fontSize: '0.84rem', marginTop: '40px' }}>No messages yet.</div>
                )}
                {supportMsgs.map(m => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* SnapReserve™ message */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F4601A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', color: 'white', fontWeight: 800, flexShrink: 0, marginTop: 2 }}>S</div>
                      <div style={{ maxWidth: '78%' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#A89880', marginBottom: '3px' }}>SnapReserve™ · {fmt(m.created_at)}</div>
                        {m.subject && <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1A1410', marginBottom: '5px' }}>{m.subject}</div>}
                        <div style={{ padding: '10px 14px', borderRadius: '4px 16px 16px 16px', background: '#F3F0EB', color: '#1A1410', fontSize: '0.88rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                          {m.body}
                        </div>
                      </div>
                    </div>
                    {/* User reply */}
                    {m.reply_body && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ maxWidth: '70%' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#A89880', marginBottom: '3px', textAlign: 'right' }}>You · {fmt(m.replied_at)}</div>
                          <div style={{ padding: '10px 14px', borderRadius: '16px 16px 4px 16px', background: '#F4601A', color: 'white', fontSize: '0.88rem', lineHeight: 1.65 }}>
                            {m.reply_body}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={supportRef} />
              </div>

              {/* Compose — only if most recent message has no reply */}
              {(() => {
                const unreplied = [...supportMsgs].reverse().find(m => !m.reply_body)
                if (!unreplied) return (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid #E8E2D9', textAlign: 'center', color: '#A89880', fontSize: '0.8rem' }}>
                    Your reply has been sent. Our team will follow up here.
                  </div>
                )
                return (
                  <>
                    {/* Quick replies */}
                    <div style={{ padding: '10px 16px 0', borderTop: '1px solid #E8E2D9', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['I\'ll re-upload clearer photos', 'Can you clarify what was wrong?', 'Please reconsider my application'].map(qr => (
                        <button
                          key={qr}
                          onClick={() => setSupportDraft(qr)}
                          style={{ padding: '4px 10px', border: '1px solid #E8E2D9', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 600, color: '#6B5F54', cursor: 'pointer', background: 'white', fontFamily: 'inherit', transition: 'all 0.14s' }}
                          onMouseOver={e => { e.currentTarget.style.borderColor = '#F4601A'; e.currentTarget.style.color = '#F4601A' }}
                          onMouseOut={e => { e.currentTarget.style.borderColor = '#E8E2D9'; e.currentTarget.style.color = '#6B5F54' }}
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                    <form onSubmit={sendReply} style={{ display: 'flex', gap: '8px', padding: '10px 16px 12px' }}>
                      <input
                        value={supportDraft}
                        onChange={e => setSupportDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                        placeholder="Reply to SnapReserve™ Support…"
                        maxLength={2000}
                        style={{ flex: 1, padding: '10px 14px', border: '1px solid #E8E2D9', borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }}
                      />
                      <button
                        type="submit"
                        disabled={supportSending || !supportDraft.trim()}
                        style={{ background: '#F4601A', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 22px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (supportSending || !supportDraft.trim()) ? 0.5 : 1 }}
                      >
                        {supportSending ? '…' : 'Send'}
                      </button>
                    </form>
                  </>
                )
              })()}
            </>
          ) : threadLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A89880', fontSize: '0.84rem' }}>Loading…</div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8E2D9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#1A1410' }}>
                    {conv?.listing_id && thread?.conversation
                      ? convs.find(c => c.id === activeId)?.listing?.title || 'Conversation'
                      : 'Conversation'
                    }
                    {conv?.is_booked_guest_chat && (
                      <span style={{ marginLeft: '8px', fontSize: '0.68rem', fontWeight: 700, background: 'rgba(22,163,74,0.1)', color: '#16A34A', padding: '2px 8px', borderRadius: '100px' }}>
                        ✓ Booked Guest Chat
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#A89880', marginTop: '2px' }}>
                    {isHost
                      ? `Guest: ${convs.find(c => c.id === activeId)?.guest?.full_name || '—'}`
                      : `Host: ${convs.find(c => c.id === activeId)?.host?.full_name || '—'}`
                    }
                    {blocked && <span style={{ marginLeft: '8px', color: '#DC2626', fontWeight: 700 }}>· Blocked</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {/* Host-only: block/unblock */}
                  {isHost && (
                    <button
                      onClick={() => doAction(blocked ? 'unblock' : 'block')}
                      style={{ fontSize: '0.74rem', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', borderColor: blocked ? '#16A34A' : '#FCA5A5', background: blocked ? 'rgba(22,163,74,0.07)' : 'rgba(248,113,113,0.08)', color: blocked ? '#16A34A' : '#DC2626' }}
                    >
                      {blocked ? 'Unblock' : '🚫 Block User'}
                    </button>
                  )}
                  {/* Archive */}
                  {conv?.status === 'active' && (
                    <button
                      onClick={() => doAction('archive')}
                      style={{ fontSize: '0.74rem', fontWeight: 600, padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #E8E2D9', background: 'white', color: '#6B5F54' }}
                    >
                      Archive
                    </button>
                  )}
                  {/* Report */}
                  <button
                    onClick={() => setReportModal(true)}
                    style={{ fontSize: '0.74rem', fontWeight: 600, padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #E8E2D9', background: 'white', color: '#6B5F54' }}
                  >
                    Report
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(thread?.messages || []).length === 0 && (
                  <div style={{ textAlign: 'center', color: '#A89880', fontSize: '0.84rem', marginTop: '40px' }}>
                    No messages yet. Say hello! 👋
                  </div>
                )}
                {(thread?.messages || []).map(m => {
                  const mine = m.sender_id === userId
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%', padding: '10px 14px', lineHeight: 1.6,
                        borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: mine ? '#F4601A' : '#F3F0EB',
                        color: mine ? 'white' : '#1A1410', fontSize: '0.88rem',
                      }}>
                        {m.body}
                        <div style={{ fontSize: '0.62rem', marginTop: '4px', opacity: 0.65, textAlign: 'right' }}>
                          {fmt(m.created_at)}
                          {mine && <span style={{ marginLeft: '4px' }}>{m.is_read ? ' ✓✓' : ' ✓'}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              {blocked ? (
                <div style={{ padding: '14px 20px', borderTop: '1px solid #E8E2D9', textAlign: 'center', color: '#DC2626', fontSize: '0.82rem', fontWeight: 600 }}>
                  {isHost ? 'You have blocked this user.' : 'This conversation has been blocked.'}
                </div>
              ) : (
                <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid #E8E2D9' }}>
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Type a message…"
                    maxLength={2000}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #E8E2D9', borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    style={{ background: '#F4601A', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 22px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (sending || !draft.trim()) ? 0.5 : 1 }}
                  >
                    {sending ? '…' : 'Send'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Report modal */}
      {reportModal && (
        <div
          onClick={e => e.target === e.currentTarget && setReportModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Report Conversation</h2>
            <p style={{ fontSize: '0.82rem', color: '#6B5F54', marginBottom: '16px' }}>Select a reason for reporting this conversation.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {REPORT_REASONS.map(r => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.86rem', color: '#1A1410' }}>
                  <input
                    type="radio"
                    name="report"
                    value={r}
                    checked={reportReason === r}
                    onChange={() => setReportReason(r)}
                    style={{ accentColor: '#F4601A' }}
                  />
                  {r}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setReportModal(false)} style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid #E8E2D9', background: 'white', color: '#6B5F54', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.84rem' }}>
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason || reporting}
                style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: reportReason ? '#F4601A' : '#E8E2D9', color: 'white', fontWeight: 700, cursor: reportReason ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '0.84rem' }}
              >
                {reporting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MessagesPage() {
  return <Suspense><MessagesInner /></Suspense>
}
