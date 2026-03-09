'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ThemeToggle from '@/app/components/ThemeToggle'
import HostSidebar from '@/app/host/_components/HostSidebar'
import { ROLE_NAV } from '@/app/host/_components/nav-config'

const MSG_TYPE_CFG = {
  info:         { label: 'Message',      color: '#93C5FD', bg: 'rgba(96,165,250,0.1)'   },
  warning:      { label: 'Warning',      color: '#FCD34D', bg: 'rgba(251,191,36,0.1)'   },
  suspension:   { label: 'Suspension',   color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  reactivation: { label: 'Reactivated',  color: '#4ADE80', bg: 'rgba(74,222,128,0.1)'  },
  rejection:    { label: 'Rejection',    color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
}

function fmtMsg(d) {
  if (!d) return ''
  const date = new Date(d), now = new Date(), diff = now - date
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtDue(d) {
  if (!d) return 'No due date'
  const today     = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const tomorrow  = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (d === today)     return 'Today'
  if (d === yesterday) return 'Yesterday'
  if (d === tomorrow)  return 'Tomorrow'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MessagesTab({ userId, onRead }) {
  const [msgs, setMsgs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [replies, setReplies] = useState({})
  const [sending, setSending] = useState(null)
  const [reopening, setReopening] = useState(null)
  const [toast, setToast]     = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!userId) return
    async function load() {
      let data
      const { data: withClosed, error } = await supabase
        .from('host_messages')
        .select('id, listing_id, type, subject, body, is_read, created_at, reply_body, replied_at, closed_at')
        .eq('host_user_id', userId)
        .order('created_at', { ascending: false })
      if (error && (error.message?.includes('closed_at') || error.code === 'PGRST204')) {
        const { data: fallback } = await supabase
          .from('host_messages')
          .select('id, listing_id, type, subject, body, is_read, created_at, reply_body, replied_at')
          .eq('host_user_id', userId)
          .order('created_at', { ascending: false })
        data = (fallback || []).map(m => ({ ...m, closed_at: null }))
      } else {
        data = withClosed || []
      }
      setMsgs(data)
      setLoading(false)
      const unreadIds = (data || []).filter(m => !m.is_read).map(m => m.id)
      if (unreadIds.length) {
        await supabase.from('host_messages').update({ is_read: true }).in('id', unreadIds)
        onRead?.()
      }
    }
    load()
  }, [userId])

  async function submitReply(msgId) {
    const reply = replies[msgId]?.trim()
    if (!reply) return
    setSending(msgId)
    try {
      const res = await fetch(`/api/host/messages/${msgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send reply')
      setMsgs(prev => prev.map(m =>
        m.id === msgId ? { ...m, reply_body: reply, replied_at: new Date().toISOString() } : m
      ))
      setReplies(prev => ({ ...prev, [msgId]: '' }))
      showToast('Reply sent.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSending(null)
    }
  }

  async function reopenMessage(msgId) {
    setReopening(msgId)
    try {
      const res = await fetch(`/api/host/messages/${msgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reopen' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reopen')
      setMsgs(prev => prev.map(m =>
        m.id === msgId ? { ...m, closed_at: null } : m
      ))
      showToast('Conversation reopened. You can reply again.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setReopening(null)
    }
  }

  function fmtDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  if (loading) return <div style={{ color: 'var(--sr-muted)', fontSize: '0.86rem' }}>Loading…</div>

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px',
          borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, zIndex: 9999,
          background: toast.type === 'error' ? 'var(--sr-red)' : 'var(--sr-green)', color: 'white',
        }}>
          {toast.msg}
        </div>
      )}
      {!msgs.length ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sr-muted)', fontSize: '0.86rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🛡️</div>
          <div style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--sr-text)' }}>No messages from SnapReserve™ yet.</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--sr-sub)', maxWidth: '260px', margin: '0 auto', lineHeight: 1.6 }}>
            If there is an issue with your listing or account, our support team will reach out here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '720px' }}>
          <div style={{ background: 'rgba(244,96,26,0.06)', border: '1px solid rgba(244,96,26,0.18)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.1rem' }}>🛡️</span>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sr-text)' }}>SnapReserve™ Support</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)', marginTop: '1px' }}>Official messages from the SnapReserve™ team about your listings and account. You can reply directly here.</div>
            </div>
          </div>
          {msgs.map(m => {
            const cfg = MSG_TYPE_CFG[m.type] || MSG_TYPE_CFG.info
            const hasReplied = !!m.reply_body
            const isClosed = !!m.closed_at
            const draft = replies[m.id] || ''
            return (
              <div key={m.id} style={{ background: 'var(--sr-card)', border: `1px solid ${!m.is_read ? 'rgba(244,96,26,0.35)' : 'var(--sr-border)'}`, borderRadius: '14px', padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '100px', fontSize: '0.62rem', fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </div>
                  {isClosed && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '100px', fontSize: '0.62rem', fontWeight: 700, background: 'var(--sr-overlay-sm)', color: 'var(--sr-sub)' }}>
                      Closed by support
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: !m.is_read ? 'var(--sr-orange)' : 'var(--sr-text)' }}>
                    {m.subject || '(no subject)'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', flexShrink: 0 }}>{fmtDate(m.created_at)}</div>
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--sr-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                {hasReplied && (
                  <div style={{ marginTop: '12px', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: '10px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: '4px' }}>
                      Your reply · {fmtDate(m.replied_at)}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--sr-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.reply_body}</div>
                  </div>
                )}
                {isClosed ? (
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--sr-overlay-xs)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--sr-sub)' }}>
                    <p style={{ margin: '0 0 12px 0' }}>This conversation was closed by SnapReserve™ support. If you need further help, you can reopen it to reply again.</p>
                    <button
                      type="button"
                      onClick={() => reopenMessage(m.id)}
                      disabled={reopening === m.id}
                      style={{ background: 'var(--sr-orange)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700, cursor: reopening === m.id ? 'wait' : 'pointer', fontFamily: 'inherit' }}
                    >
                      {reopening === m.id ? 'Reopening…' : 'Reopen conversation'}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: '12px' }}>
                    <textarea
                      style={{ width: '100%', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: '10px', padding: '10px 14px', color: 'var(--sr-text)', fontSize: '0.82rem', resize: 'vertical', minHeight: '64px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      placeholder={hasReplied ? 'Send a follow-up…' : 'Write a reply…'}
                      value={draft}
                      onChange={e => setReplies(prev => ({ ...prev, [m.id]: e.target.value }))}
                      onFocus={e => { e.target.style.borderColor = 'var(--sr-orange)' }}
                      onBlur={e => { e.target.style.borderColor = 'var(--sr-border)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        onClick={() => submitReply(m.id)}
                        disabled={!draft || sending === m.id}
                        style={{ background: draft ? 'var(--sr-orange)' : 'var(--sr-card2)', color: draft ? 'white' : 'var(--sr-sub)', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '0.8rem', fontWeight: 700, cursor: draft ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.15s' }}
                      >
                        {sending === m.id ? 'Sending…' : hasReplied ? 'Send follow-up' : 'Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function HostInbox({ userId, onAdminRead, unreadAdminCount = 0 }) {
  const [tab,           setTab]          = useState('inbox')
  const [convs,         setConvs]        = useState([])
  const [convLoading,   setConvLoading]  = useState(true)
  const [activeId,      setActiveId]     = useState(null)
  const [thread,        setThread]       = useState(null)
  const [threadLoading, setThreadLoading]= useState(false)
  const [draft,         setDraft]        = useState('')
  const [sending,       setSending]      = useState(false)
  const [toast,         setToast]        = useState(null)
  const bottomRef = useRef(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!userId) return
    fetch('/api/messages')
      .then(r => r.json())
      .then(data => {
        setConvs(data.conversations || [])
        setConvLoading(false)
      })
  }, [userId])

  async function openThread(convId) {
    setActiveId(convId)
    setThreadLoading(true)
    const res  = await fetch(`/api/messages/${convId}`)
    const data = await res.json()
    setThread(data)
    setThreadLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
    setConvs(prev => prev.map(c =>
      c.id === convId ? { ...c, host_unread_count: 0 } : c
    ))
  }

  async function sendMsg(e) {
    e?.preventDefault()
    if (!draft.trim() || !activeId || sending) return
    setSending(true)
    const res = await fetch(`/api/messages/${activeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: draft.trim() }),
    })
    const msg = await res.json()
    setSending(false)
    if (res.ok) {
      setThread(t => ({ ...t, messages: [...(t?.messages || []), msg] }))
      setDraft('')
      setConvs(prev => prev.map(c => c.id === activeId
        ? { ...c, last_message_at: msg.created_at, last_message_preview: msg.body.slice(0, 80) }
        : c
      ))
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } else {
      showToast(msg.error || 'Failed to send.', 'error')
    }
  }

  async function doBlock(conv) {
    const action = conv.status === 'blocked' ? 'unblock' : 'block'
    const res = await fetch(`/api/messages/${activeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      const newStatus = action === 'block' ? 'blocked' : 'active'
      setThread(t => ({ ...t, conversation: { ...t.conversation, status: newStatus } }))
      setConvs(prev => prev.map(c => c.id === activeId ? { ...c, status: newStatus } : c))
      showToast(action === 'block' ? 'User blocked.' : 'User unblocked.')
    }
  }

  const conv    = thread?.conversation
  const blocked = conv?.status === 'blocked'
  const totalConvUnread = convs.reduce((n, c) => n + (c.host_unread_count || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 130px)' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999, background: toast.type === 'error' ? 'var(--sr-red)' : 'var(--sr-green)', color: 'white', padding: '12px 20px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        <button
          onClick={() => setTab('inbox')}
          style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', fontFamily: 'inherit', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', background: tab === 'inbox' ? 'var(--sr-orange)' : 'var(--sr-card2)', color: tab === 'inbox' ? 'white' : 'var(--sr-sub)' }}
        >
          Guest Inbox {totalConvUnread > 0 && <span style={{ marginLeft: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '100px', padding: '1px 6px', fontSize: '0.68rem' }}>{totalConvUnread}</span>}
        </button>
        <button
          onClick={() => setTab('notifications')}
          style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', fontFamily: 'inherit', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', background: tab === 'notifications' ? 'var(--sr-orange)' : 'var(--sr-card2)', color: tab === 'notifications' ? 'white' : 'var(--sr-sub)' }}
        >
          🛡️ SnapReserve™ Support {unreadAdminCount > 0 && <span style={{ marginLeft: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '100px', padding: '1px 6px', fontSize: '0.68rem' }}>{unreadAdminCount}</span>}
        </button>
      </div>

      {tab === 'notifications' && (
        <MessagesTab userId={userId} onRead={onAdminRead} />
      )}

      {tab === 'inbox' && (
        <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
          {/* Conversation list */}
          <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
            {convLoading && <div style={{ color: 'var(--sr-sub)', fontSize: '0.82rem' }}>Loading…</div>}
            {!convLoading && convs.length === 0 && (
              <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '12px', padding: '28px', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.82rem' }}>
                No guest messages yet.
              </div>
            )}
            {convs.map(c => {
              const unread   = c.host_unread_count || 0
              const isActive = activeId === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => openThread(c.id)}
                  style={{ width: '100%', textAlign: 'left', background: isActive ? 'var(--sr-card2)' : 'transparent', border: isActive ? '1px solid var(--sr-orange)' : '1px solid transparent', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: unread > 0 ? 700 : 600, color: 'var(--sr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {c.listing?.title || 'Listing'}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--sr-sub)', flexShrink: 0 }}>{fmtMsg(c.last_message_at)}</div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)' }}>
                    {c.guest?.full_name || '—'}
                    {c.is_booked_guest_chat && <span style={{ marginLeft: '4px', color: 'var(--sr-green)', fontWeight: 700 }}>✓</span>}
                    {c.status === 'blocked' && <span style={{ marginLeft: '4px', color: 'var(--sr-red)' }}> · Blocked</span>}
                  </div>
                  <div style={{ fontSize: '0.71rem', color: 'var(--sr-sub)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message_preview || 'No messages yet'}
                  </div>
                  {unread > 0 && (
                    <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--sr-orange)' }} />
                      <span style={{ fontSize: '0.62rem', color: 'var(--sr-orange)', fontWeight: 700 }}>{unread} new</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Thread pane */}
          <div style={{ flex: 1, background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {!activeId ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--sr-sub)', gap: '8px' }}>
                <div style={{ fontSize: '2rem' }}>💬</div>
                <div style={{ fontSize: '0.84rem' }}>Select a conversation</div>
              </div>
            ) : threadLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sr-sub)', fontSize: '0.84rem' }}>Loading…</div>
            ) : (
              <>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--sr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--sr-text)' }}>
                      {convs.find(c => c.id === activeId)?.listing?.title || 'Conversation'}
                      {conv?.is_booked_guest_chat && <span style={{ marginLeft: '8px', fontSize: '0.62rem', fontWeight: 700, background: 'var(--sr-greenl)', color: 'var(--sr-green)', padding: '2px 6px', borderRadius: '100px' }}>✓ Booked</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)', marginTop: '2px' }}>
                      Guest: {convs.find(c => c.id === activeId)?.guest?.full_name || '—'}
                      {blocked && <span style={{ marginLeft: '6px', color: 'var(--sr-red)', fontWeight: 700 }}>· Blocked</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => doBlock(conv)}
                    style={{ fontSize: '0.72rem', fontWeight: 700, padding: '5px 12px', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', borderColor: blocked ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)', background: blocked ? 'var(--sr-greenl)' : 'var(--sr-redl)', color: blocked ? 'var(--sr-green)' : 'var(--sr-red)' }}
                  >
                    {blocked ? 'Unblock' : '🚫 Block'}
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(thread?.messages || []).length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.82rem', marginTop: '32px' }}>No messages yet.</div>
                  )}
                  {(thread?.messages || []).map(m => {
                    const mine = m.sender_id === userId
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '72%', padding: '9px 13px', fontSize: '0.84rem', lineHeight: 1.6, borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: mine ? 'var(--sr-orange)' : 'var(--sr-card2)', color: mine ? 'white' : 'var(--sr-text)' }}>
                          {m.body}
                          <div style={{ fontSize: '0.6rem', marginTop: '3px', opacity: 0.6, textAlign: 'right' }}>
                            {fmtMsg(m.created_at)}
                            {mine && <span style={{ marginLeft: '3px' }}>{m.is_read ? ' ✓✓' : ' ✓'}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>

                {blocked ? (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--sr-border)', textAlign: 'center', color: 'var(--sr-red)', fontSize: '0.8rem', fontWeight: 600 }}>
                    You have blocked this user.
                  </div>
                ) : (
                  <form onSubmit={sendMsg} style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderTop: '1px solid var(--sr-border)' }}>
                    <input
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
                      placeholder="Type a message…"
                      maxLength={2000}
                      style={{ flex: 1, padding: '9px 13px', background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: '9px', color: 'var(--sr-text)', fontSize: '0.84rem', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      style={{ background: 'var(--sr-orange)', color: 'white', border: 'none', borderRadius: '9px', padding: '9px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (sending || !draft.trim()) ? 0.5 : 1 }}
                    >
                      {sending ? '…' : 'Send'}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const STATUS_CONFIG = {
  live:               { label: '● Live',              color: '#4ADE80', bg: '#16A34A' },
  approved:           { label: '✅ Approved',          color: '#F4601A', bg: '#F4601A' },
  pending_review:     { label: '⏳ Pending Review',    color: '#FCD34D', bg: '#D97706' },
  changes_requested:  { label: '🔄 Changes Needed',   color: '#93C5FD', bg: '#2563EB' },
  rejected:           { label: '❌ Rejected',          color: '#F87171', bg: '#DC2626' },
  draft:              { label: '○ Draft',              color: 'rgba(255,255,255,0.4)', bg: '#374151' },
  suspended:          { label: '🚫 Suspended',         color: '#DC2626', bg: '#DC2626' },
  pending_reapproval: { label: '⏳ Under Review',      color: '#D97706', bg: '#D97706' },
}

function statusCfg(s) {
  return STATUS_CONFIG[s] || STATUS_CONFIG.draft
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}


export default function HostDashboard() {
  const router = useRouter()
  const [profile,       setProfile]       = useState(null)
  const [listings,      setListings]      = useState([])
  const [changeRequests,setChangeRequests]= useState({})
  const [loading,       setLoading]       = useState(true)
  const [activeNav,     setActiveNav]     = useState('overview')
  const [actionLoading, setActionLoading] = useState(null)
  const [toast,         setToast]         = useState(null)
  const [expandedCR,    setExpandedCR]    = useState(null)
  const [switchModal,   setSwitchModal]   = useState(false)
  const [switching,     setSwitching]     = useState(false)
  const [explanations,  setExplanations]  = useState({})
  const [unreadMsgCount,  setUnreadMsgCount]  = useState(0)
  const [convUnreadCount, setConvUnreadCount] = useState(0)
  const [policiesOpen,    setPoliciesOpen]    = useState({})
  const [policiesDraft,   setPoliciesDraft]   = useState({})
  const [policiesSaving,  setPoliciesSaving]  = useState(null)
  const [followupDraft,   setFollowupDraft]   = useState({})
  const [followupSending, setFollowupSending] = useState(null)
  const [deleteModalListing, setDeleteModalListing] = useState(null) // listing id when confirm delete modal is open
  // Caller identity
  const [myRole,         setMyRole]         = useState(null)   // 'owner'|'manager'|'staff'|'finance'
  const [myHostId,       setMyHostId]       = useState(null)
  const [orgName,        setOrgName]        = useState(null)
  // Team management
  const [teamData,       setTeamData]       = useState(null)   // { host_id, host_name, caller_role, members }
  const [teamLoading,    setTeamLoading]     = useState(false)
  const [inviteEmail,    setInviteEmail]     = useState('')
  const [inviteRole,     setInviteRole]      = useState('staff')
  const [inviteSending,  setInviteSending]   = useState(false)
  const [inviteLink,     setInviteLink]      = useState(null)
  const [memberActions,  setMemberActions]   = useState({})    // { [memberId]: 'removing'|'changing' }
  const [accessLoading,  setAccessLoading]   = useState({})    // { 'memberId:listingId': true }
  const [inviteModal,          setInviteModal]          = useState(false)
  const [inviteNote,           setInviteNote]           = useState('')
  const [invitePropertyAccess, setInvitePropertyAccess] = useState(['all'])
  const [inviteCustomRoleId,   setInviteCustomRoleId]   = useState(null)
  // Bookings + Earnings
  const [hostBookings,         setHostBookings]         = useState([])
  const [hostBookingsMeta,     setHostBookingsMeta]     = useState({ total: 0, page: 1, limit: 25 })
  const [hostBookingsLoading,  setHostBookingsLoading]  = useState(false)
  const [hostMetrics,          setHostMetrics]          = useState(null)
  const [bkFilter,             setBkFilter]             = useState('all')      // 'all'|'upcoming'|'completed'|'cancelled'
  const [bkPropFilter,         setBkPropFilter]         = useState('all')
  const [hostCancelModal,      setHostCancelModal]      = useState(null)   // booking to cancel
  const [hostCancelReason,     setHostCancelReason]     = useState('')
  const [hostCancelling,       setHostCancelling]       = useState(false)
  const [hostCancelResult,     setHostCancelResult]     = useState(null)
  // Calendar
  const [calYear,          setCalYear]          = useState(new Date().getFullYear())
  const [calMonth,         setCalMonth]         = useState(new Date().getMonth())    // 0-indexed
  const [calSelected,      setCalSelected]      = useState(null)                     // 'YYYY-MM-DD'
  const [calBookings,      setCalBookings]      = useState([])
  const [calLoading,       setCalLoading]       = useState(false)
  const [calPropFilter,    setCalPropFilter]    = useState('all')
  // Reviews
  const [hostReviews,          setHostReviews]          = useState([])
  const [hostReviewsMeta,      setHostReviewsMeta]      = useState({ total: 0, page: 1, limit: 20 })
  const [hostReviewsMetrics,   setHostReviewsMetrics]   = useState(null)
  const [hostReviewsLoading,   setHostReviewsLoading]   = useState(false)
  const [reviewsListings,      setReviewsListings]      = useState([])
  const [reviewsListingFilter, setReviewsListingFilter] = useState('all')
  const [replyModal,           setReplyModal]           = useState(null)   // review to reply to
  const [replyText,            setReplyText]            = useState('')
  const [replySaving,          setReplySaving]          = useState(false)
  // Custom roles
  const [customRoles,          setCustomRoles]          = useState([])
  const [rolesLoading,         setRolesLoading]         = useState(false)
  const [myCustomRole,         setMyCustomRole]         = useState(null) // { id, name, permissions }
  // "View As" preview mode — owner can temporarily see the portal as a team member
  const [viewingAs, setViewingAs] = useState(null) // { id, name, role, email, allowed_listing_ids }
  // Property access editor modal (per-member)
  const [accessEditMember, setAccessEditMember] = useState(null) // member object being edited
  // Property access modal (per-property — manage which members can access a listing)
  const [propAccessModal, setPropAccessModal] = useState(null) // listing object being edited
  // Property Access page UI state
  const [accessFilter, setAccessFilter] = useState('all')  // 'all'|'full'|'partial'|'none'
  const [accessView,   setAccessView]   = useState('grid') // 'grid'|'list'
  // Team sub-tabs + tasks (DB-backed)
  const [teamSubTab,         setTeamSubTab]         = useState('overview')
  const [taskFilter,         setTaskFilter]         = useState('all')
  const [taskPropertyFilter, setTaskPropertyFilter] = useState('all')
  const [tasks,              setTasks]              = useState([])
  const [tasksLoaded,        setTasksLoaded]        = useState(false)
  const [taskModal,          setTaskModal]          = useState(false)
  const [taskForm,           setTaskForm]           = useState({ title: '', description: '', listing_id: '', assigned_to: '', due_date: '', status: 'scheduled' })
  const [taskFormErr,        setTaskFormErr]        = useState('')
  const [taskSaving,         setTaskSaving]         = useState(false)
  // Expenses
  const [expCatFilter,    setExpCatFilter]    = useState('all')
  const [expPropFilter,   setExpPropFilter]   = useState('all')
  const [expAnalyticsTab, setExpAnalyticsTab] = useState('category')
  const [expenseModal,    setExpenseModal]    = useState(false)
  const [customCats,      setCustomCats]      = useState([])
  const [addCatModal,     setAddCatModal]     = useState(false)
  const [newCatName,      setNewCatName]      = useState('')
  const [expenses,        setExpenses]        = useState([
    { id: 1,  date: '2026-03-01',  desc: 'Professional cleaning service', category: 'Cleaning',    property: 'All Properties', amount: 280, notes: '',                             recurring: 'monthly', receiptName: '' },
    { id: 2,  date: '2026-02-28',  desc: 'Plumbing repair — master bath', category: 'Maintenance', property: 'Beach Villa',    amount: 195, notes: 'Emergency call-out',           recurring: 'none',    receiptName: 'plumbing-invoice.pdf' },
    { id: 3,  date: '2026-02-25',  desc: 'Guest toiletries & supplies',   category: 'Supplies',    property: 'City Loft',      amount: 64,  notes: '',                             recurring: 'none',    receiptName: '' },
    { id: 4,  date: '2026-02-20',  desc: 'Property insurance premium',    category: 'Insurance',   property: 'All Properties', amount: 420, notes: 'Annual policy · monthly split', recurring: 'monthly', receiptName: 'insurance-q1.pdf' },
    { id: 5,  date: '2026-02-15',  desc: 'Photography for new listing',   category: 'Marketing',   property: 'Garden Studio',  amount: 350, notes: '',                             recurring: 'none',    receiptName: '' },
    { id: 6,  date: '2026-01-31',  desc: 'HOA dues',                      category: 'HOA',         property: 'Beach Villa',    amount: 180, notes: '',                             recurring: 'monthly', receiptName: '' },
    { id: 7,  date: '2026-01-20',  desc: 'Internet & utilities',          category: 'Utilities',   property: 'City Loft',      amount: 95,  notes: '',                             recurring: 'monthly', receiptName: '' },
    { id: 8,  date: '2025-12-30',  desc: 'Year-end deep clean',           category: 'Cleaning',    property: 'All Properties', amount: 340, notes: '',                             recurring: 'none',    receiptName: '' },
    { id: 9,  date: '2025-12-15',  desc: 'HVAC servicing',                category: 'Maintenance', property: 'Beach Villa',    amount: 220, notes: 'Annual service contract',      recurring: 'yearly',  receiptName: 'hvac-service.pdf' },
    { id: 10, date: '2025-11-18',  desc: 'Property management fee',       category: 'Management',  property: 'Garden Studio',  amount: 290, notes: '',                             recurring: 'monthly', receiptName: '' },
  ])
  const [newExp, setNewExp] = useState({ date: '', desc: '', category: 'Cleaning', property: '', amount: '', notes: '', recurring: 'none', receiptName: '' })
  // Promotions
  const [promotions,    setPromotions]    = useState([])
  const [promoLoaded,   setPromoLoaded]   = useState(false)
  const [promoModal,    setPromoModal]    = useState(false)
  const [editingPromo,  setEditingPromo]  = useState(null) // null = create, obj = edit
  const [promoForm,     setPromoForm]     = useState({ code: '', name: '', description: '', discount_type: 'percentage', discount_value: '', min_nights: 1, min_booking_amount: 0, max_uses: '', is_active: true, auto_apply: false, starts_at: '', ends_at: '', listing_scope: 'all', listing_ids: [] })
  const [promoSaving,   setPromoSaving]   = useState(false)
  const [promoToast,    setPromoToast]    = useState(null)
  // Custom role create form
  const [newRoleName,          setNewRoleName]          = useState('')
  const [newRolePerms,         setNewRolePerms]         = useState([])
  const [newRoleSaving,        setNewRoleSaving]        = useState(false)
  // Activity log (booking + team events)
  const [activityEvents,      setActivityEvents]        = useState([])
  const [activityLoading,     setActivityLoading]       = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: hostRow } = await supabase
        .from('hosts').select('id').eq('user_id', user.id).maybeSingle()

      // Resolve role: owner if they have a hosts row, else check team membership
      let resolvedRole = null
      let resolvedHostId = null
      if (hostRow) {
        resolvedRole = 'owner'
        resolvedHostId = hostRow.id
      } else {
        const { data: membership } = await supabase
          .from('host_team_members')
          .select('host_id, role, custom_role_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
        if (membership) {
          resolvedRole = membership.role
          resolvedHostId = membership.host_id
          if (membership.custom_role_id) {
            const { data: cr } = await supabase
              .from('host_custom_roles')
              .select('id, name, permissions')
              .eq('id', membership.custom_role_id)
              .maybeSingle()
            if (cr) setMyCustomRole(cr)
          }
        }
      }
      setMyRole(resolvedRole)
      setMyHostId(resolvedHostId)

      const [{ data: prof }, { data: lists }, { data: hostOrg }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
        resolvedHostId
          ? supabase.from('listings').select('*').eq('host_id', resolvedHostId).is('deleted_at', null).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        resolvedHostId
          ? supabase.from('hosts').select('display_name').eq('id', resolvedHostId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      setProfile(prof)
      if (hostOrg?.display_name) setOrgName(hostOrg.display_name)
      const listArr = lists || []
      setListings(listArr)

      const { count: msgCount } = await supabase
        .from('host_messages')
        .select('id', { count: 'exact', head: true })
        .eq('host_user_id', user.id)
        .eq('is_read', false)
      setUnreadMsgCount(msgCount || 0)

      const { data: convData } = await supabase
        .from('conversations')
        .select('host_unread_count')
        .eq('host_user_id', user.id)
        .eq('status', 'active')
      const totalConvUnread = (convData || []).reduce((n, c) => n + (c.host_unread_count || 0), 0)
      setConvUnreadCount(totalConvUnread)

      const ids = listArr.map(l => l.id)
      if (ids.length > 0) {
        const { data: crs } = await supabase
          .from('listing_change_requests')
          .select('listing_id, notes, admin_email, created_at')
          .in('listing_id', ids)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
        const crMap = {}
        ;(crs || []).forEach(cr => {
          if (!crMap[cr.listing_id]) crMap[cr.listing_id] = []
          crMap[cr.listing_id].push(cr)
        })
        setChangeRequests(crMap)
      }

      setLoading(false)
    }
    load()
  }, [])

  // Load earnings/refund metrics when overview is shown (so Overview shows Total Earned & Total Refunded)
  useEffect(() => {
    if (activeNav === 'overview' && !loading && !hostMetrics && !hostBookingsLoading) {
      loadHostBookings('all', 'all', 1)
    }
  }, [activeNav, loading, hostMetrics, hostBookingsLoading])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function fmt12(t) {
    if (!t) return null
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  function openPolicies(l) {
    setPoliciesDraft(prev => ({
      ...prev,
      [l.id]: {
        checkinStartTime:   l.checkin_start_time   || '15:00',
        checkinEndTime:     l.checkin_end_time      || '',
        checkoutTime:       l.checkout_time         || '11:00',
        cancellationPolicy: l.cancellation_policy   || 'flexible',
        petPolicy:          l.pet_policy            || 'no_pets',
        smokingPolicy:      l.smoking_policy        || 'no_smoking',
        quietHoursStart:    l.quiet_hours_start     || '',
        quietHoursEnd:      l.quiet_hours_end       || '',
        securityDeposit:    l.security_deposit != null ? String(l.security_deposit) : '',
        minBookingAge:      l.min_booking_age  != null ? String(l.min_booking_age)  : '18',
        extraGuestFee:      l.extra_guest_fee  != null ? String(l.extra_guest_fee)  : '',
        cleaningFee:        l.cleaning_fee     != null ? String(l.cleaning_fee)     : '',
        houseRules:         l.house_rules      || '',
      },
    }))
    setPoliciesOpen(prev => ({ ...prev, [l.id]: !prev[l.id] }))
  }

  function updatePolicy(listingId, key, val) {
    setPoliciesDraft(prev => ({ ...prev, [listingId]: { ...prev[listingId], [key]: val } }))
  }

  async function savePolicies(listingId) {
    const d = policiesDraft[listingId]
    if (!d) return
    setPoliciesSaving(listingId)
    try {
      const res = await fetch(`/api/host/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:              'update_policies',
          checkin_start_time:  d.checkinStartTime  || '15:00',
          checkin_end_time:    d.checkinEndTime     || null,
          checkout_time:       d.checkoutTime       || '11:00',
          cancellation_policy: d.cancellationPolicy,
          pet_policy:          d.petPolicy,
          smoking_policy:      d.smokingPolicy,
          quiet_hours_start:   d.quietHoursStart    || null,
          quiet_hours_end:     d.quietHoursEnd      || null,
          security_deposit:    d.securityDeposit    || 0,
          min_booking_age:     d.minBookingAge      || 18,
          extra_guest_fee:     d.extraGuestFee      || 0,
          cleaning_fee:        d.cleaningFee        || 0,
          house_rules:         d.houseRules         || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setListings(prev => prev.map(l => l.id === listingId ? {
        ...l,
        checkin_start_time:  d.checkinStartTime  || null,
        checkin_end_time:    d.checkinEndTime     || null,
        checkout_time:       d.checkoutTime       || null,
        cancellation_policy: d.cancellationPolicy,
        pet_policy:          d.petPolicy,
        smoking_policy:      d.smokingPolicy,
        quiet_hours_start:   d.quietHoursStart    || null,
        quiet_hours_end:     d.quietHoursEnd      || null,
        security_deposit:    parseFloat(d.securityDeposit) || 0,
        min_booking_age:     parseInt(d.minBookingAge)     || 18,
        extra_guest_fee:     parseFloat(d.extraGuestFee)   || 0,
        cleaning_fee:        parseFloat(d.cleaningFee)     || 0,
        house_rules:         d.houseRules || null,
      } : l))
      setPoliciesOpen(prev => ({ ...prev, [listingId]: false }))
      showToast('Policies updated. Changes apply to new bookings only.')
    } catch (err) {
      showToast(err.message || 'Failed to save policies.', 'error')
    }
    setPoliciesSaving(null)
  }

  async function sendFollowup(listingId) {
    const msg = followupDraft[listingId]?.trim()
    if (!msg || followupSending) return
    setFollowupSending(listingId)
    try {
      const res = await fetch(`/api/host/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_followup', message: msg }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      setFollowupDraft(prev => ({ ...prev, [listingId]: '' }))
      showToast("Message sent to admin. We'll get back to you soon.")
    } catch (err) {
      showToast(err.message || 'Failed to send message.', 'error')
    }
    setFollowupSending(null)
  }

  async function callListingAction(listingId, action) {
    setActionLoading(listingId)
    try {
      const res = await fetch(`/api/host/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')

      if (action === 'delete_listing') {
        setListings(prev => prev.filter(l => l.id !== listingId))
        setDeleteModalListing(null)
        showToast('Listing removed.')
        setActionLoading(null)
        return
      }

      const newStatus = { go_live: 'live', unpublish: 'approved', resubmit: 'pending_review' }[action]
      const newActive = action === 'go_live'
      setListings(prev => prev.map(l =>
        l.id === listingId ? { ...l, status: newStatus, is_active: newActive } : l
      ))
      if (action === 'resubmit') {
        setChangeRequests(prev => ({ ...prev, [listingId]: [] }))
      }

      const messages = {
        go_live:   'Your listing is now live!',
        unpublish: 'Listing unpublished.',
        resubmit:  'Resubmitted for review.',
      }
      showToast(messages[action] || 'Done.')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function submitExplanation(listingId) {
    const explanation = explanations[listingId]?.trim()
    if (!explanation) return showToast('Please enter an explanation.', 'error')
    setActionLoading(listingId)
    try {
      const res = await fetch(`/api/host/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_explanation', explanation }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit')
      setListings(prev => prev.map(l =>
        l.id === listingId ? { ...l, status: 'pending_reapproval' } : l
      ))
      setExplanations(prev => ({ ...prev, [listingId]: '' }))
      showToast("Explanation submitted. We'll review it shortly.")
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleSwitchToGuest() {
    setSwitching(true)
    try {
      const res = await fetch('/api/account/switch-to-guest', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Something went wrong.')
      router.push('/account')
    } catch (err) {
      showToast(err.message, 'error')
      setSwitching(false)
      setSwitchModal(false)
    }
  }

  async function loadPromotions() {
    try {
      const res  = await fetch('/api/host/promotions')
      const data = await res.json()
      if (res.ok) setPromotions(data.promotions || [])
    } catch {}
    finally { setPromoLoaded(true) }
  }

  async function loadTasks() {
    try {
      const res  = await fetch('/api/host/tasks')
      if (!res.ok) return
      const data = await res.json()
      setTasks(data.tasks || [])
      setTasksLoaded(true)
    } catch {}
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    setTaskFormErr('')
    if (!taskForm.listing_id) { setTaskFormErr('Please select a property.'); return }
    if (!taskForm.title.trim()) { setTaskFormErr('Please enter a task title.'); return }
    setTaskSaving(true)
    try {
      const res  = await fetch('/api/host/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:       taskForm.title.trim(),
          description: taskForm.description.trim() || null,
          listing_id:  taskForm.listing_id,
          assigned_to: taskForm.assigned_to || null,
          due_date:    taskForm.due_date || null,
          status:      taskForm.status,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setTaskFormErr(data.error || 'Failed to create task.'); return }
      setTasks(prev => [data.task, ...prev])
      setTaskModal(false)
      setTaskForm({ title: '', description: '', listing_id: '', assigned_to: '', due_date: '', status: 'scheduled' })
    } catch {
      setTaskFormErr('Something went wrong. Please try again.')
    } finally {
      setTaskSaving(false)
    }
  }

  async function handleTaskStatus(id, newStatus) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
    await fetch(`/api/host/tasks/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    }).catch(() => {})
  }

  async function handleDeleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/host/tasks/${id}`, { method: 'DELETE' }).catch(() => {})
  }

  async function loadTeam() {
    if (teamLoading) return
    setTeamLoading(true)
    try {
      const [teamRes, rolesRes] = await Promise.all([
        fetch('/api/host/team'),
        fetch('/api/host/team/roles'),
      ])
      const teamJson  = await teamRes.json().catch(() => ({}))
      const rolesJson = await rolesRes.json().catch(() => ({ roles: [] }))
      if (teamRes.ok)  setTeamData(teamJson)
      if (rolesRes.ok) setCustomRoles(rolesJson.roles || [])
    } finally {
      setTeamLoading(false)
    }
  }

  async function loadActivity() {
    if (activityLoading) return
    setActivityLoading(true)
    try {
      const res = await fetch('/api/host/activity')
      const data = await res.json().catch(() => ({}))
      if (res.ok) setActivityEvents(data.events || [])
      else setActivityEvents([])
    } finally {
      setActivityLoading(false)
    }
  }

  async function createCustomRole() {
    if (!newRoleName.trim() || newRoleSaving) return
    setNewRoleSaving(true)
    try {
      const res = await fetch('/api/host/team/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoleName.trim(), permissions: newRolePerms }),
      })
      const data = await res.json()
      if (res.ok) {
        setCustomRoles(prev => [...prev, data.role])
        setNewRoleName('')
        setNewRolePerms([])
        showToast('Custom role created!', 'success')
      } else {
        showToast(data.error || 'Failed to create role', 'error')
      }
    } finally {
      setNewRoleSaving(false)
    }
  }

  async function deleteCustomRole(roleId) {
    try {
      const res = await fetch(`/api/host/team/roles/${roleId}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setCustomRoles(prev => prev.filter(r => r.id !== roleId))
        showToast('Role deleted', 'success')
        // Reload team in case members were affected
        loadTeam()
      } else {
        showToast(data.error || 'Failed to delete role', 'error')
      }
    } catch {
      showToast('Failed to delete role', 'error')
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || inviteSending) return
    setInviteSending(true)
    try {
      const res = await fetch('/api/host/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          ...(inviteRole === 'custom' && inviteCustomRoleId ? { custom_role_id: inviteCustomRoleId } : {}),
          allowed_listing_ids: invitePropertyAccess.includes('all') ? null : invitePropertyAccess,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setInviteLink(data.invite_link)
        setInviteEmail('')
        setInviteNote('')
        setInvitePropertyAccess(['all'])
        setInviteCustomRoleId(null)
        setInviteModal(false)
        loadTeam()
        showToast('Invite sent!', 'success')
      } else {
        showToast(data.error || 'Failed to send invite', 'error')
      }
    } finally {
      setInviteSending(false)
    }
  }

  async function handleMemberAction(memberId, action, extra = {}) {
    setMemberActions(p => ({ ...p, [memberId]: action }))
    try {
      const res = await fetch(`/api/host/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (data.success) {
        if ((action === 'resend_invite' || action === 'get_invite_link') && data.invite_link) {
          setInviteLink(data.invite_link)
          navigator.clipboard.writeText(data.invite_link).catch(() => {})
          showToast(action === 'resend_invite' ? 'Invite resent & link copied!' : 'Invite link copied!', 'success')
        } else {
          showToast(action === 'remove' ? 'Invite cancelled' : 'Role updated', 'success')
        }
        loadTeam()
      } else {
        showToast(data.error || 'Action failed', 'error')
      }
    } finally {
      setMemberActions(p => { const n = { ...p }; delete n[memberId]; return n })
    }
  }

  async function togglePropertyAccess(memberId, listingId, currentlyHasAccess) {
    const key = `${memberId}:${listingId}`
    setAccessLoading(p => ({ ...p, [key]: true }))
    try {
      const res = await fetch(`/api/host/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_property_access', listing_id: listingId, allow: !currentlyHasAccess }),
      })
      const data = await res.json()
      if (data.success) {
        loadTeam()
        showToast(currentlyHasAccess ? 'Property access removed' : 'Property access granted', 'success')
      } else {
        showToast(data.error || 'Failed to update access', 'error')
      }
    } catch {
      showToast('Failed to update access', 'error')
    } finally {
      setAccessLoading(p => { const n = { ...p }; delete n[key]; return n })
    }
  }

  async function loadHostBookings(status = bkFilter, propId = bkPropFilter, pg = 1) {
    setHostBookingsLoading(true)
    try {
      const p = new URLSearchParams({ page: String(pg) })
      if (status !== 'all') p.set('status', status)
      if (propId !== 'all') p.set('listing_id', propId)
      const res  = await fetch(`/api/host/bookings?${p.toString()}`)
      const data = await res.json()
      if (!res.ok) return
      setHostBookings(data.bookings || [])
      setHostBookingsMeta({ total: data.total || 0, page: data.page || 1, limit: data.limit || 25 })
      if (data.metrics) setHostMetrics(data.metrics)
    } finally {
      setHostBookingsLoading(false)
    }
  }

  async function loadCalBookings(propId = calPropFilter) {
    setCalLoading(true)
    try {
      const p = new URLSearchParams({ page: '1', limit: '300' })
      if (propId !== 'all') p.set('listing_id', propId)
      const res  = await fetch(`/api/host/bookings?${p.toString()}`)
      const data = await res.json()
      if (res.ok) setCalBookings(data.bookings || [])
    } finally {
      setCalLoading(false)
    }
  }

  async function loadHostReviews(listingId = reviewsListingFilter, pg = 1) {
    setHostReviewsLoading(true)
    const p = new URLSearchParams({ page: String(pg) })
    if (listingId !== 'all') p.set('listing_id', listingId)
    const res = await fetch(`/api/host/reviews?${p}`)
    if (res.ok) {
      const d = await res.json()
      setHostReviews(d.reviews)
      setHostReviewsMeta({ total: d.total, page: d.page, limit: d.limit })
      setHostReviewsMetrics(d.metrics)
      if (d.listings?.length > 0) setReviewsListings(d.listings)
    }
    setHostReviewsLoading(false)
  }

  async function submitReply() {
    setReplySaving(true)
    const res = await fetch('/api/host/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_id: replyModal.id, reply: replyText }),
    })
    setReplySaving(false)
    if (res.ok) {
      setHostReviews(prev => prev.map(r => r.id === replyModal.id ? { ...r, host_reply: replyText.trim() || null } : r))
      setReplyModal(null)
      setReplyText('')
    }
  }

  async function handleHostCancel() {
    if (!hostCancelReason.trim()) return
    setHostCancelling(true)
    const res = await fetch(`/api/host/bookings/${hostCancelModal.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: hostCancelReason }),
    })
    const json = await res.json()
    setHostCancelling(false)
    if (!res.ok) {
      setHostCancelResult({ error: json.error || 'Failed to cancel' })
    } else {
      setHostCancelResult({ refund: json.refund_amount })
      loadHostBookings(bkFilter, bkPropFilter, hostBookingsMeta.page)
    }
  }

  function closeHostCancelModal() { setHostCancelModal(null); setHostCancelReason(''); setHostCancelResult(null) }

  const initials    = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const firstName   = profile?.full_name?.split(' ')[0] || 'Host'
  const totalUnread = unreadMsgCount + convUnreadCount
  const liveCount   = listings.filter(l => l.status === 'live').length

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sr-bg)' }}>
      <div style={{ color: 'var(--sr-sub)', fontSize: '0.9rem', fontFamily: 'var(--sr-font-sans)' }}>Loading…</div>
    </div>
  )

  // ---- PROPERTY CARD (used in both overview and properties page) ----
  function PropertyCard({ l, compact = false }) {
    const cfg      = statusCfg(l.status)
    const crs      = changeRequests[l.id] || []
    const isActing = actionLoading === l.id
    const crOpen   = expandedCR === l.id

    const inp = {
      background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: '8px',
      padding: '9px 12px', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none',
      color: 'var(--sr-text)', width: '100%', transition: 'border-color 0.15s',
    }
    const lbl = {
      fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: '5px', display: 'block',
    }
    const sel = { ...inp, background: 'var(--sr-card)' }

    return (
      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '16px', overflow: 'hidden', transition: 'all 0.2s', position: 'relative' }}>
        {/* Image */}
        <div style={{ height: compact ? '120px' : '200px', position: 'relative', overflow: 'hidden', background: 'var(--sr-card2)', borderRadius: '16px 16px 0 0' }}>
          {Array.isArray(l.images) && l.images[0]
            ? <img src={l.images[0]} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', opacity: 0.3 }}>{l.type === 'hotel' ? '🏨' : '🏠'}</div>
          }
          <div style={{ position: 'absolute', top: '10px', left: '10px', padding: '3px 10px', borderRadius: '100px', fontSize: '0.66rem', fontWeight: 700, background: cfg.bg + '22', color: cfg.color, border: `1px solid ${cfg.color}44` }}>
            {cfg.label}
          </div>
        </div>

        <div style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: '4px' }}>{l.title}</div>
          <div style={{ fontSize: '0.74rem', color: 'var(--sr-sub)', marginBottom: '14px' }}>📍 {l.city}{l.state ? `, ${l.state}` : ''}</div>

          {/* Status banners */}
          {l.status === 'pending_review' && (
            <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', fontSize: '0.8rem', lineHeight: 1.6, color: '#FCD34D' }}>
              <div>⏳ Your listing is under review. We will notify you within 24 hours.</div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FCD34D', marginBottom: '6px', opacity: 0.85 }}>Have a question? Message the review team:</div>
                <textarea
                  style={{ width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(252,211,77,0.25)', borderRadius: '8px', padding: '9px 12px', fontSize: '0.82rem', color: 'var(--sr-text)', fontFamily: 'inherit', resize: 'vertical', minHeight: '70px', outline: 'none' }}
                  placeholder="e.g. I've updated the photos, is there anything else needed?"
                  value={followupDraft[l.id] || ''}
                  onChange={e => setFollowupDraft(prev => ({ ...prev, [l.id]: e.target.value }))}
                />
                <button
                  style={{ marginTop: '7px', background: 'rgba(252,211,77,0.15)', border: '1px solid rgba(252,211,77,0.3)', color: '#FCD34D', borderRadius: '8px', padding: '8px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (!followupDraft[l.id]?.trim() || followupSending === l.id) ? 0.5 : 1 }}
                  disabled={!followupDraft[l.id]?.trim() || followupSending === l.id}
                  onClick={() => sendFollowup(l.id)}
                >
                  {followupSending === l.id ? 'Sending…' : '📤 Send message'}
                </button>
              </div>
            </div>
          )}

          {l.status === 'approved' && !l.is_active && (
            <div style={{ background: 'rgba(244,96,26,0.06)', border: '1px solid rgba(244,96,26,0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--sr-orange)' }}>
              📋 Listing is unpublished. Click "Republish" to make it visible to guests.
            </div>
          )}

          {l.status === 'rejected' && (
            <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--sr-red)' }}>
              ❌ Your listing was rejected. Contact support for details.
            </div>
          )}

          {l.status === 'suspended' && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--sr-red)' }}>
              🚫 <strong>Listing suspended.</strong>
              {l.suspension_reason && <div style={{ marginTop: '4px', opacity: 0.85 }}>{l.suspension_reason}</div>}
              <div style={{ marginTop: '10px' }}>
                <textarea
                  style={{ width: '100%', background: 'var(--sr-bg)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '8px 12px', color: 'var(--sr-text)', fontSize: '0.8rem', resize: 'vertical', minHeight: '64px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  placeholder="Explain why this suspension should be lifted…"
                  value={explanations[l.id] || ''}
                  onChange={e => setExplanations(prev => ({ ...prev, [l.id]: e.target.value }))}
                />
                <button
                  style={{ marginTop: '8px', background: 'rgba(248,113,113,0.12)', color: 'var(--sr-red)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', padding: '7px 14px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading === l.id ? 0.4 : 1 }}
                  onClick={() => submitExplanation(l.id)}
                  disabled={actionLoading === l.id}
                >
                  {actionLoading === l.id ? 'Submitting…' : 'Submit explanation'}
                </button>
              </div>
            </div>
          )}

          {l.status === 'pending_reapproval' && (
            <div style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', fontSize: '0.8rem', lineHeight: 1.6, color: '#FCD34D' }}>
              ⏳ Your explanation is under review. We will get back to you shortly.
            </div>
          )}

          {l.status === 'changes_requested' && (
            <div>
              <div style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', fontSize: '0.8rem', lineHeight: 1.6, color: '#93C5FD' }}>
                🔄 Our team has requested changes. Review the notes below, make your edits, then resubmit.
              </div>
              {crs.length > 0 && (
                <div style={{ background: 'var(--sr-bg)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                  <div
                    style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#93C5FD', marginBottom: crOpen ? '8px' : 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => setExpandedCR(crOpen ? null : l.id)}
                  >
                    <span>Admin notes ({crs.length})</span>
                    <span>{crOpen ? '▲' : '▼'}</span>
                  </div>
                  {crOpen && crs.map((cr, i) => (
                    <div key={i} style={{ fontSize: '0.82rem', color: 'var(--sr-text)', lineHeight: 1.65, padding: '8px 0', borderBottom: i < crs.length - 1 ? '1px solid var(--sr-border)' : 'none' }}>
                      <div>{cr.notes}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', marginTop: '3px' }}>
                        {new Date(cr.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '14px' }}>
            {[
              { val: `$${l.price_per_night}`, lbl: 'Per night', color: 'var(--sr-orange)' },
              { val: '—', lbl: 'Occupancy', color: 'var(--sr-green)' },
              { val: l.rating ?? '—', lbl: 'Rating', color: 'var(--sr-yellow)' },
            ].map(({ val, lbl: label, color }) => (
              <div key={label} style={{ background: 'var(--sr-card2)', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color }}>{val}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--sr-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Action buttons — owner/manager only */}
          {(myRole === 'owner' || myRole === 'manager') && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {l.status === 'live' && (
              <>
                <a href={`/listings/${l.id}`} style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: 'var(--sr-card2)', color: 'var(--sr-muted)' }} target="_blank" rel="noreferrer">View listing</a>
                <button style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: isActing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', background: 'var(--sr-card2)', color: 'var(--sr-muted)', opacity: isActing ? 0.4 : 1 }} onClick={() => callListingAction(l.id, 'unpublish')} disabled={isActing}>
                  {isActing ? '…' : 'Unpublish'}
                </button>
              </>
            )}
            {l.status === 'approved' && (
              <>
                <button style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: isActing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', background: 'var(--sr-green)', color: 'white', opacity: isActing ? 0.4 : 1 }} onClick={() => callListingAction(l.id, 'go_live')} disabled={isActing}>
                  {isActing ? 'Publishing…' : '↑ Republish'}
                </button>
                <a href={`/listings/${l.id}`} style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: 'var(--sr-card2)', color: 'var(--sr-muted)' }} target="_blank" rel="noreferrer">Preview</a>
              </>
            )}
            {l.status === 'pending_review' && (
              <>
                <button style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'not-allowed', fontFamily: 'inherit', border: 'none', textAlign: 'center', background: 'var(--sr-card2)', color: 'var(--sr-sub)', opacity: 0.6 }} disabled>⏳ In Review</button>
                <a href={`/listings/${l.id}?preview=1`} style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: 'var(--sr-card2)', color: 'var(--sr-muted)' }} target="_blank" rel="noreferrer">Preview</a>
              </>
            )}
            {l.status === 'changes_requested' && (
              <>
                <a href={`/list-property?edit=${l.id}`} style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: 'var(--sr-orange)', color: 'white' }}>✏️ Edit listing</a>
                <a href={`/listings/${l.id}?preview=1`} style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: 'var(--sr-card2)', color: 'var(--sr-muted)' }} target="_blank" rel="noreferrer">Preview</a>
              </>
            )}
            {l.status === 'rejected' && (
              <>
                <button style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'not-allowed', fontFamily: 'inherit', border: '1px solid rgba(248,113,113,0.2)', textAlign: 'center', background: 'var(--sr-redl)', color: 'var(--sr-red)', opacity: 0.7 }} disabled>❌ Rejected</button>
                <a href="mailto:support@snapreserve.app" style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: 'var(--sr-card2)', color: 'var(--sr-muted)' }}>Contact support</a>
              </>
            )}
            {l.status === 'suspended' && (
              <>
                <button style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'not-allowed', fontFamily: 'inherit', border: '1px solid rgba(248,113,113,0.2)', textAlign: 'center', background: 'var(--sr-redl)', color: 'var(--sr-red)', opacity: 0.7 }} disabled>🚫 Suspended</button>
                <a href="mailto:support@snapreserve.app" style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: 'var(--sr-card2)', color: 'var(--sr-muted)' }}>Contact support</a>
              </>
            )}
            {l.status === 'pending_reapproval' && (
              <>
                <button style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'not-allowed', fontFamily: 'inherit', border: 'none', textAlign: 'center', background: 'var(--sr-card2)', color: 'var(--sr-sub)', opacity: 0.6 }} disabled>⏳ Under Review</button>
                <a href={`/listings/${l.id}`} style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: 'var(--sr-card2)', color: 'var(--sr-muted)' }} target="_blank" rel="noreferrer">Preview</a>
              </>
            )}
            {(!l.status || l.status === 'draft') && (
              <>
                <a href={`/list-property?edit=${l.id}`} style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: 'var(--sr-orange)', color: 'white' }}>✏️ Edit draft</a>
                <a href={`/listings/${l.id}?preview=1`} style={{ borderRadius: '8px', padding: '9px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', textAlign: 'center', textDecoration: 'none', display: 'block', background: 'var(--sr-card2)', color: 'var(--sr-muted)' }} target="_blank" rel="noreferrer">Preview</a>
              </>
            )}
          </div>}

          {/* Delete listing — owner only */}
          {myRole === 'owner' && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--sr-border)' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.78rem', color: 'var(--sr-sub)', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}
                onClick={() => setDeleteModalListing(l.id)}
              >
                Remove listing
              </button>
            </div>
          )}

          {/* Edit policies */}
          {!['draft', 'rejected'].includes(l.status) && (
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={() => openPolicies(l)}
                style={{ background: 'none', border: '1px solid var(--sr-border)', borderRadius: '8px', padding: '7px 14px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--sr-sub)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--sr-orange)'; e.currentTarget.style.color = 'var(--sr-orange)' }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--sr-border)'; e.currentTarget.style.color = 'var(--sr-sub)' }}
              >
                {policiesOpen[l.id] ? '▲ Hide policies' : '📋 Edit policies'}
              </button>

              {policiesOpen[l.id] && (() => {
                const d = policiesDraft[l.id] || {}
                return (
                  <div style={{ marginTop: '12px', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--sr-muted)', marginBottom: '14px' }}>📋 Listing policies</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', marginBottom: '14px' }}>Changes apply to new bookings only — existing reservations are not affected.</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={lbl}>Check-in start</label>
                        <input type="time" style={inp} value={d.checkinStartTime || '15:00'} onChange={e => updatePolicy(l.id, 'checkinStartTime', e.target.value)} />
                      </div>
                      <div>
                        <label style={lbl}>Check-in end (opt.)</label>
                        <input type="time" style={inp} value={d.checkinEndTime || ''} onChange={e => updatePolicy(l.id, 'checkinEndTime', e.target.value)} />
                      </div>
                      <div>
                        <label style={lbl}>Checkout</label>
                        <input type="time" style={inp} value={d.checkoutTime || '11:00'} onChange={e => updatePolicy(l.id, 'checkoutTime', e.target.value)} />
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={lbl}>Cancellation policy</label>
                      <select style={sel} value={d.cancellationPolicy || 'flexible'} onChange={e => updatePolicy(l.id, 'cancellationPolicy', e.target.value)}>
                        <option value="flexible">Flexible — refund up to 24h before check-in</option>
                        <option value="moderate">Moderate — refund up to 5 days before</option>
                        <option value="strict">Strict — refund 7–14 days before</option>
                        <option value="non_refundable">Non-refundable</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={lbl}>Pet policy</label>
                        <select style={sel} value={d.petPolicy || 'no_pets'} onChange={e => updatePolicy(l.id, 'petPolicy', e.target.value)}>
                          <option value="pets_allowed">Pets allowed</option>
                          <option value="small_pets">Small pets only</option>
                          <option value="no_pets">No pets</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Smoking policy</label>
                        <select style={sel} value={d.smokingPolicy || 'no_smoking'} onChange={e => updatePolicy(l.id, 'smokingPolicy', e.target.value)}>
                          <option value="smoking_allowed">Smoking allowed</option>
                          <option value="outside_only">Outside only</option>
                          <option value="no_smoking">No smoking</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <label style={lbl}>Quiet hours start (opt.)</label>
                        <input type="time" style={inp} value={d.quietHoursStart || ''} onChange={e => updatePolicy(l.id, 'quietHoursStart', e.target.value)} />
                      </div>
                      <span style={{ fontSize: '0.76rem', color: 'var(--sr-sub)', marginTop: '20px' }}>to</span>
                      <div>
                        <label style={lbl}>Quiet hours end</label>
                        <input type="time" style={inp} value={d.quietHoursEnd || ''} onChange={e => updatePolicy(l.id, 'quietHoursEnd', e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={lbl}>Cleaning fee ($)</label>
                        <input type="number" min="0" style={inp} placeholder="0" value={d.cleaningFee || ''} onChange={e => updatePolicy(l.id, 'cleaningFee', e.target.value)} />
                      </div>
                      <div>
                        <label style={lbl}>Security deposit ($)</label>
                        <input type="number" min="0" style={inp} placeholder="0" value={d.securityDeposit || ''} onChange={e => updatePolicy(l.id, 'securityDeposit', e.target.value)} />
                      </div>
                      <div>
                        <label style={lbl}>Extra guest fee ($)</label>
                        <input type="number" min="0" style={inp} placeholder="0" value={d.extraGuestFee || ''} onChange={e => updatePolicy(l.id, 'extraGuestFee', e.target.value)} />
                      </div>
                      <div>
                        <label style={lbl}>Min. booking age</label>
                        <input type="number" min="18" style={inp} placeholder="18" value={d.minBookingAge || '18'} onChange={e => updatePolicy(l.id, 'minBookingAge', e.target.value)} />
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={lbl}>House rules</label>
                      <textarea rows={3} style={{ ...inp, resize: 'vertical', minHeight: '70px' }} placeholder="e.g. No parties. Quiet hours 10 PM – 7 AM…" value={d.houseRules || ''} onChange={e => updatePolicy(l.id, 'houseRules', e.target.value)} />
                    </div>

                    <button
                      onClick={() => savePolicies(l.id)}
                      disabled={policiesSaving === l.id}
                      style={{ background: 'var(--sr-orange)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 22px', fontSize: '0.82rem', fontWeight: 700, cursor: policiesSaving === l.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: policiesSaving === l.id ? 0.6 : 1 }}
                    >
                      {policiesSaving === l.id ? 'Saving…' : 'Save policies →'}
                    </button>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Team Access — only when team data is loaded and there are non-owner members */}
          {teamData && (() => {
            const nonOwners = (teamData.members || []).filter(m => m.status === 'active' && m.role !== 'owner')
            if (nonOwners.length === 0) return null
            const withAccess = nonOwners.filter(m => !m.allowed_listing_ids || m.allowed_listing_ids.includes(l.id))
            const visible = withAccess.slice(0, 3)
            const extra = withAccess.length - visible.length
            return (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--sr-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {visible.map((m, i) => {
                        const ini = m.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || m.email?.[0]?.toUpperCase() || '?'
                        return (
                          <div key={m.id} title={m.full_name || m.email} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--sr-orange)', border: '2px solid var(--sr-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, color: 'white', marginLeft: i > 0 ? -7 : 0, position: 'relative', zIndex: 3 - i }}>
                            {ini}
                          </div>
                        )
                      })}
                      {extra > 0 && <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--sr-surface)', border: '2px solid var(--sr-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 700, color: 'var(--sr-sub)', marginLeft: -7 }}>+{extra}</div>}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--sr-sub)' }}>
                      {withAccess.length === 0 ? 'No members assigned' : `${withAccess.length} member${withAccess.length !== 1 ? 's' : ''} with access`}
                    </span>
                  </div>
                  {myRole === 'owner' && (
                    <button
                      onClick={() => setPropAccessModal(l)}
                      style={{ background: 'none', border: '1px solid var(--sr-border)', borderRadius: 7, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700, color: 'var(--sr-sub)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sr-orange)'; e.currentTarget.style.color = 'var(--sr-orange)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sr-border)'; e.currentTarget.style.color = 'var(--sr-sub)' }}
                    >
                      {withAccess.length === 0 ? 'Assign Access' : 'Manage Access'}
                    </button>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  // effectiveAllowedNav still used by content sections to gate Quick Actions etc.
  const customNavSet = myCustomRole ? new Set(['overview', ...(myCustomRole.permissions || [])]) : null
  const allowedNav = myRole === 'custom' && customNavSet ? customNavSet : (ROLE_NAV[myRole] || ROLE_NAV.owner)
  const effectiveAllowedNav = viewingAs ? (ROLE_NAV[viewingAs.role] || ROLE_NAV.staff) : allowedNav

  const pendingCount = teamData?.members?.filter(m => m.status === 'pending').length || 0

  function PlaceholderPage({ icon, title, subtitle }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <div style={{ fontSize: '3rem' }}>{icon}</div>
        <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.6rem', fontWeight: 700, color: 'var(--sr-text)' }}>{title}</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--sr-sub)', maxWidth: '340px', textAlign: 'center', lineHeight: 1.7 }}>{subtitle}</div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { font-family: var(--sr-font-sans); background: var(--sr-bg); color: var(--sr-text); }
        .hd-layout { display: flex; min-height: 100vh; background: var(--sr-bg); }
        .hd-main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .hd-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 68px; border-bottom: 1px solid var(--sr-border); background: var(--sr-surface); position: sticky; top: 0; z-index: 50; gap: 16px; }
        .hd-greeting { font-family: var(--sr-font-display); font-size: 1.15rem; font-weight: 600; color: var(--sr-text); }
        .hd-date { font-size: 0.72rem; color: var(--sr-sub); margin-top: 2px; }
        .hd-topbar-right { display: flex; align-items: center; gap: 10px; }
        .hd-add-btn { background: var(--sr-orange); color: white; border: none; border-radius: 10px; padding: 9px 18px; font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: var(--sr-font-sans); text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.15s; white-space: nowrap; }
        .hd-add-btn:hover { opacity: 0.88; }
        .hd-bell { position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 9px; border: 1px solid var(--sr-border); background: transparent; cursor: pointer; font-size: 1rem; color: var(--sr-muted); transition: all 0.15s; }
        .hd-bell:hover { border-color: var(--sr-orange); color: var(--sr-text); }
        .hd-bell-dot { position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; border-radius: 50%; background: var(--sr-red); border: 2px solid var(--sr-surface); }
        .hd-content { padding: 32px; flex: 1; }
        .hd-page-title { font-family: var(--sr-font-display); font-size: 1.8rem; font-weight: 700; color: var(--sr-text); margin-bottom: 4px; }
        .hd-page-sub { font-size: 0.84rem; color: var(--sr-sub); margin-bottom: 28px; }
        .hd-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .hd-stat-card { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 14px; padding: 20px 22px; }
        .hd-stat-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sr-sub); margin-bottom: 10px; }
        .hd-stat-val { font-family: var(--sr-font-display); font-size: 2.2rem; font-weight: 700; color: var(--sr-text); line-height: 1; margin-bottom: 6px; }
        .hd-stat-hint { font-size: 0.72rem; color: var(--sr-sub); }
        .hd-section-title { font-family: var(--sr-font-display); font-size: 1.2rem; font-weight: 700; color: var(--sr-text); margin-bottom: 14px; }
        .hd-qa-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
        .hd-qa-btn { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 12px; padding: 16px; text-align: left; cursor: pointer; font-family: var(--sr-font-sans); transition: all 0.18s; text-decoration: none; display: block; color: var(--sr-text); }
        .hd-qa-btn:hover { border-color: var(--sr-orange); background: var(--sr-card2); }
        .hd-qa-icon { font-size: 1.4rem; margin-bottom: 8px; display: block; }
        .hd-qa-label { font-size: 0.82rem; font-weight: 700; color: var(--sr-text); }
        .hd-qa-sub { font-size: 0.7rem; color: var(--sr-sub); margin-top: 3px; }
        .hd-prop-preview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .hd-mini-prop { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 12px; overflow: hidden; display: flex; gap: 12px; padding: 12px; align-items: center; transition: border-color 0.15s; }
        .hd-mini-prop:hover { border-color: var(--sr-orange2); }
        .hd-mini-img { width: 52px; height: 52px; border-radius: 8px; background: var(--sr-card2); overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
        .hd-mini-title { font-size: 0.82rem; font-weight: 700; color: var(--sr-text); margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hd-mini-loc { font-size: 0.68rem; color: var(--sr-sub); }
        .hd-prop-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .hd-add-card { background: var(--sr-card2); border: 2px dashed var(--sr-border2); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 280px; cursor: pointer; transition: all 0.2s; text-decoration: none; }
        .hd-add-card:hover { border-color: var(--sr-orange); background: var(--sr-ol); }
        .hd-add-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--sr-overlay-xs); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin-bottom: 12px; color: var(--sr-sub); font-weight: 300; }
        .hd-add-title { font-size: 0.9rem; font-weight: 700; color: var(--sr-sub); margin-bottom: 4px; }
        .hd-add-sub { font-size: 0.72rem; color: var(--sr-sub); opacity: 0.7; }
        .hd-empty { text-align: center; padding: 72px 20px; }
        .hd-empty-icon { font-size: 2.8rem; margin-bottom: 16px; }
        .hd-empty-title { font-family: var(--sr-font-display); font-size: 1.4rem; font-weight: 700; margin-bottom: 8px; color: var(--sr-text); }
        .hd-empty-sub { font-size: 0.84rem; color: var(--sr-sub); margin-bottom: 24px; }
        .hd-toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 12px; font-size: 0.86rem; font-weight: 600; z-index: 9999; animation: hd-fadein 0.2s; max-width: 320px; font-family: var(--sr-font-sans); }
        .hd-toast.success { background: var(--sr-green); color: white; }
        .hd-toast.error   { background: var(--sr-red);   color: white; }
        @keyframes hd-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 1200px) { .hd-stat-grid { grid-template-columns: repeat(2,1fr); } .hd-qa-grid { grid-template-columns: repeat(2,1fr); } .hd-prop-grid { grid-template-columns: repeat(2,1fr); } .hd-prop-preview-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 900px)  { .hd-stat-grid { grid-template-columns: repeat(2,1fr); } .hd-prop-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px)  { .hd-main { margin-left: 0; } .hd-content { padding: 20px; } .hd-stat-grid { grid-template-columns: 1fr 1fr; } .hd-qa-grid { grid-template-columns: 1fr 1fr; } .hd-prop-preview-grid { grid-template-columns: 1fr; } }
      `}</style>

      {toast && <div className={`hd-toast ${toast.type}`}>{toast.msg}</div>}

      <div className="hd-layout">
        {/* SIDEBAR — shared HostSidebar component */}
        <HostSidebar
          activeNav={activeNav}
          onNavChange={(id) => {
            setActiveNav(id)
            if (['team','permissions','access','activity'].includes(id) && !teamData) loadTeam()
            if (id === 'activity') loadActivity()
            if (id === 'team' && !tasksLoaded) loadTasks()
            if (id === 'promotions' && !promoLoaded) loadPromotions()
            if (['overview','bookings','earnings'].includes(id) && !hostMetrics && !hostBookingsLoading) loadHostBookings('all', 'all', 1)
            if (['bookings','earnings'].includes(id) && hostBookings.length === 0 && !hostBookingsLoading) loadHostBookings('all', 'all', 1)
            if (id === 'reviews' && !hostReviewsMetrics && !hostReviewsLoading) loadHostReviews('all', 1)
            if (id === 'calendar' && calBookings.length === 0 && !calLoading) loadCalBookings('all')
          }}
          myRole={myRole}
          myCustomRole={myCustomRole}
          viewingAs={viewingAs}
          userName={profile?.full_name || ''}
          userAvatar={profile?.avatar_url || null}
          orgName={orgName}
          unreadCount={totalUnread}
          pendingInviteCount={pendingCount}
          onSwitchToGuest={() => setSwitchModal(true)}
        />

        {/* MAIN */}
        <div className="hd-main">
          {/* TOPBAR */}
          <div className="hd-topbar">
            <div>
              <div className="hd-greeting">{getGreeting()}, {firstName}</div>
              <div className="hd-date">{today}</div>
            </div>
            <div className="hd-topbar-right">
              {myRole === 'owner' && <a href="/list-property" className="hd-add-btn">+ Add Property</a>}
              <ThemeToggle />
              <button className="hd-bell" title="Notifications" onClick={() => setActiveNav('messages')}>
                🔔
                {totalUnread > 0 && <span className="hd-bell-dot" />}
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="hd-content">

            {/* ========== VIEW AS BANNER ========== */}
            {viewingAs && (() => {
              const ROLE_PERMS = {
                manager: ['Edit listings', 'Manage bookings', 'View earnings & reports', 'Reply to guest reviews'],
                staff:   ['View upcoming bookings', 'Manage check-in calendar', 'Send guest messages'],
                finance: ['View earnings & payouts', 'Export financial reports', 'View booking revenue'],
                custom:  ['Permissions defined by host'],
              }
              const perms = ROLE_PERMS[viewingAs.role] || []
              const propAccess = viewingAs.allowed_listing_ids == null
                ? 'All properties'
                : viewingAs.allowed_listing_ids.length === 0
                  ? 'No properties assigned'
                  : `${viewingAs.allowed_listing_ids.length} propert${viewingAs.allowed_listing_ids.length !== 1 ? 'ies' : 'y'}`
              return (
                <div style={{ background: 'rgba(244,96,26,0.07)', border: '1.5px solid rgba(244,96,26,0.3)', borderRadius: 14, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: 2 }}>👁</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--sr-orange)', marginBottom: 4 }}>
                      Previewing as {viewingAs.name}
                      <span style={{ fontWeight: 400, color: 'var(--sr-sub)', marginLeft: 8, textTransform: 'capitalize' }}>· {viewingAs.role}</span>
                      <span style={{ fontWeight: 400, color: 'var(--sr-sub)', marginLeft: 8 }}>· {propAccess}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                      {perms.map(p => (
                        <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#4ade80', fontSize: '0.7rem' }}>✓</span> {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingAs(null)}
                    style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 8, padding: '6px 14px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--sr-text)', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Exit Preview
                  </button>
                </div>
              )
            })()}

            {/* ========== OVERVIEW ========== */}
            {activeNav === 'overview' && (
              <div>
                <div className="hd-page-title">Overview</div>
                <div className="hd-page-sub">Here is what is happening with your properties.</div>

                {/* Stat cards */}
                <div className="hd-stat-grid">
                  {[
                    { label: 'Live Listings',  val: liveCount,                          hint: `of ${listings.length} total`, color: 'var(--sr-green)'  },
                    { label: 'Messages',       val: totalUnread,                         hint: 'unread messages',             color: 'var(--sr-orange)' },
                    { label: 'Properties',     val: listings.length,                     hint: 'total listings',              color: 'var(--sr-blue)'   },
                    { label: 'Total Earned',   val: hostMetrics != null ? `$${Number(hostMetrics.total_earned||0).toFixed(2)}` : '—', hint: hostMetrics ? `${hostMetrics.completed_count || 0} completed stay${(hostMetrics.completed_count||0) !== 1 ? 's' : ''}` : 'Loading…', color: '#4ade80' },
                    { label: 'Total Refunded', val: hostMetrics != null ? `$${Number(hostMetrics.total_refunds||0).toFixed(2)}` : '—', hint: hostMetrics ? `${hostMetrics.cancelled_count || 0} cancellation${(hostMetrics.cancelled_count||0) !== 1 ? 's' : ''}` : 'Loading…', color: '#f87171' },
                    { label: 'Avg. Rating',    val: '—',                                 hint: 'no reviews yet',              color: 'var(--sr-yellow)' },
                  ].map(({ label, val, hint, color }) => (
                    <div key={label} className="hd-stat-card">
                      <div className="hd-stat-label">{label}</div>
                      <div className="hd-stat-val" style={{ color }}>{val}</div>
                      <div className="hd-stat-hint">{hint}</div>
                    </div>
                  ))}
                </div>

                {/* Quick actions */}
                <div className="hd-section-title">Quick actions</div>
                <div className="hd-qa-grid">
                  {myRole === 'owner' && (
                    <a href="/list-property" className="hd-qa-btn">
                      <span className="hd-qa-icon">🏠</span>
                      <div className="hd-qa-label">Add Property</div>
                      <div className="hd-qa-sub">List a new space</div>
                    </a>
                  )}
                  {effectiveAllowedNav.has('properties') && (
                    <button className="hd-qa-btn" style={{ border: '1px solid var(--sr-border)', color: 'var(--sr-text)' }} onClick={() => setActiveNav('properties')}>
                      <span className="hd-qa-icon">📋</span>
                      <div className="hd-qa-label">Edit Policies</div>
                      <div className="hd-qa-sub">Update listing rules</div>
                    </button>
                  )}
                  <button className="hd-qa-btn" style={{ border: '1px solid var(--sr-border)', color: 'var(--sr-text)' }} onClick={() => setActiveNav('messages')}>
                    <span className="hd-qa-icon">💬</span>
                    <div className="hd-qa-label">View Messages</div>
                    <div className="hd-qa-sub">{totalUnread > 0 ? `${totalUnread} unread` : 'No new messages'}</div>
                  </button>
                  {myRole === 'owner' && (
                    <button className="hd-qa-btn" style={{ border: '1px solid var(--sr-border)', color: 'var(--sr-text)' }} onClick={() => setSwitchModal(true)}>
                      <span className="hd-qa-icon">🔄</span>
                      <div className="hd-qa-label">Switch to Guest</div>
                      <div className="hd-qa-sub">Browse as a traveler</div>
                    </button>
                  )}
                </div>

                {/* Properties preview */}
                <div className="hd-section-title">Your properties</div>
                {listings.length === 0 ? (
                  <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🏠</div>
                    <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: '6px' }}>No properties yet</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--sr-sub)', marginBottom: '18px' }}>Add your first property to start earning.</div>
                    {myRole === 'owner' && <a href="/list-property" className="hd-add-btn" style={{ display: 'inline-flex' }}>+ Add Property</a>}
                  </div>
                ) : (
                  <div className="hd-prop-preview-grid">
                    {listings.slice(0, 3).map(l => {
                      const cfg = statusCfg(l.status)
                      const img = Array.isArray(l.images) && l.images[0]
                      return (
                        <div key={l.id} className="hd-mini-prop" style={{ cursor: 'pointer' }} onClick={() => setActiveNav('properties')}>
                          <div className="hd-mini-img">
                            {img ? <img src={img} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (l.type === 'hotel' ? '🏨' : '🏠')}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="hd-mini-title">{l.title}</div>
                            <div className="hd-mini-loc">📍 {l.city}{l.state ? `, ${l.state}` : ''}</div>
                            <div style={{ marginTop: '4px', display: 'inline-block', padding: '1px 7px', borderRadius: '100px', fontSize: '0.6rem', fontWeight: 700, background: cfg.bg + '22', color: cfg.color, border: `1px solid ${cfg.color}44` }}>
                              {cfg.label}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Messages preview */}
                <div style={{ marginTop: '28px' }}>
                  <div className="hd-section-title">Messages</div>
                  <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '14px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: '4px' }}>
                        {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'No new messages'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--sr-sub)' }}>
                        {totalUnread > 0 ? 'You have messages waiting for your reply.' : 'Your inbox is up to date.'}
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveNav('messages')}
                      style={{ background: 'var(--sr-orange)', color: 'white', border: 'none', borderRadius: '9px', padding: '9px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', whiteSpace: 'nowrap' }}
                    >
                      Open inbox
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========== BOOKINGS ========== */}
            {activeNav === 'bookings' && (
              <div>
                <div className="hd-page-title">Bookings</div>
                <div className="hd-page-sub">Guest reservations across all your properties.</div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
                  {[{v:'all',l:'All'},{v:'upcoming',l:'Upcoming'},{v:'checked_in',l:'Checked In'},{v:'completed',l:'Completed'},{v:'cancelled',l:'Cancelled'}].map(f => (
                    <button key={f.v}
                      onClick={() => { setBkFilter(f.v); loadHostBookings(f.v, bkPropFilter, 1) }}
                      style={{ background: bkFilter===f.v ? 'var(--sr-orange)' : 'var(--sr-card)', border: `1px solid ${bkFilter===f.v ? 'var(--sr-orange)' : 'var(--sr-border)'}`, borderRadius: 8, padding: '6px 14px', fontSize: '0.76rem', fontWeight: 700, color: bkFilter===f.v ? '#fff' : 'var(--sr-muted)', cursor: 'pointer' }}
                    >{f.l}</button>
                  ))}
                  {listings.length > 0 && (
                    <select value={bkPropFilter}
                      onChange={e => { setBkPropFilter(e.target.value); loadHostBookings(bkFilter, e.target.value, 1) }}
                      style={{ marginLeft: 'auto', background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 8, padding: '6px 12px', fontSize: '0.76rem', color: 'var(--sr-text)', cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="all">All Properties</option>
                      {listings.map(l => <option key={l.id} value={l.id}>{l.title || 'Untitled'}</option>)}
                    </select>
                  )}
                </div>

                {/* Bookings table */}
                <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--sr-border)' }}>
                          {['Booking ID','Property','Guest','Check-in','Check-out','Nights','Total','Status'].map(h => (
                            <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hostBookingsLoading ? (
                          <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>Loading bookings…</td></tr>
                        ) : hostBookings.length === 0 ? (
                          <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>No bookings found.</td></tr>
                        ) : hostBookings.map((b, i) => {
                          const isCompleted = b.status === 'completed'
                          const isCancelled = b.status === 'cancelled' || b.payment_status === 'refunded'
                          const isConfirmed = b.status === 'confirmed'
                          const isCheckedIn = b.status === 'checked_in'
                          const badgeBg    = isCompleted ? 'rgba(74,222,128,0.12)'  : isCancelled ? 'rgba(248,113,113,0.12)'  : isCheckedIn ? 'rgba(244,96,26,0.13)'  : isConfirmed ? 'rgba(96,165,250,0.12)'  : 'rgba(251,191,36,0.12)'
                          const badgeColor = isCompleted ? '#4ade80'                : isCancelled ? '#f87171'                : isCheckedIn ? '#F4601A'                : isConfirmed ? '#60a5fa'                : '#fcd34d'
                          const badgeLabel = isCompleted ? 'Completed'             : isCancelled ? 'Cancelled'              : isCheckedIn ? 'Checked In'             : isConfirmed ? 'Confirmed'              : 'Pending'
                          return (
                            <tr key={b.id} style={{ borderBottom: '1px solid var(--sr-border)', background: i%2===1 ? 'var(--sr-overlay-xs)' : 'transparent', cursor: 'pointer' }}
                              onClick={() => window.location.href = `/host/bookings/${b.id}`}>
                              <td style={{ padding: '13px 18px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--sr-orange)', fontWeight: 700 }}>{b.reference}</span>
                              </td>
                              <td style={{ padding: '13px 18px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--sr-text)' }}>{b.listing_title}</div>
                                {b.listing_city && <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)' }}>{b.listing_city}{b.listing_state ? `, ${b.listing_state}` : ''}</div>}
                              </td>
                              <td style={{ padding: '13px 18px', whiteSpace: 'nowrap', color: 'var(--sr-muted)', fontSize: '0.82rem' }}>{b.guest_name}</td>
                              <td style={{ padding: '13px 18px', whiteSpace: 'nowrap', color: 'var(--sr-muted)', fontSize: '0.82rem' }}>{b.check_in ? new Date(b.check_in).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</td>
                              <td style={{ padding: '13px 18px', whiteSpace: 'nowrap', color: 'var(--sr-muted)', fontSize: '0.82rem' }}>{b.check_out ? new Date(b.check_out).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}</td>
                              <td style={{ padding: '13px 18px', textAlign: 'center', color: 'var(--sr-muted)', fontSize: '0.82rem' }}>{b.nights ?? '—'}</td>
                              <td style={{ padding: '13px 18px', fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>${Number(b.total_amount||0).toFixed(2)}</td>
                              <td style={{ padding: '13px 18px' }}>
                                <span style={{ background: badgeBg, color: badgeColor, borderRadius: 20, padding: '3px 10px', fontSize: '0.67rem', fontWeight: 700 }}>{badgeLabel}</span>
                              </td>
                              <td style={{ padding: '13px 18px' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {isConfirmed && (
                                    <a href={`/host/bookings/${b.id}`}
                                      style={{ background: 'rgba(244,96,26,0.13)', border: '1px solid rgba(244,96,26,0.3)', color: '#F4601A', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                      ✅ Check In
                                    </a>
                                  )}
                                  {['confirmed','pending'].includes(b.status) && (myRole === 'owner' || myRole === 'manager') && (
                                    <button onClick={e => { e.stopPropagation(); setHostCancelModal(b); setHostCancelReason(''); setHostCancelResult(null) }}
                                      style={{ background: 'none', border: '1px solid #f87171', color: '#f87171', borderRadius: 6, padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  {hostBookingsMeta.total > hostBookingsMeta.limit && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--sr-border)' }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--sr-sub)' }}>{hostBookingsMeta.total} total</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button disabled={hostBookingsMeta.page <= 1} onClick={() => loadHostBookings(bkFilter, bkPropFilter, hostBookingsMeta.page - 1)}
                          style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 7, padding: '5px 12px', fontSize: '0.76rem', fontWeight: 600, cursor: hostBookingsMeta.page <= 1 ? 'not-allowed' : 'pointer', opacity: hostBookingsMeta.page <= 1 ? 0.4 : 1 }}>← Prev</button>
                        <span style={{ fontSize: '0.76rem', color: 'var(--sr-sub)', alignSelf: 'center' }}>Page {hostBookingsMeta.page}</span>
                        <button disabled={hostBookingsMeta.page * hostBookingsMeta.limit >= hostBookingsMeta.total} onClick={() => loadHostBookings(bkFilter, bkPropFilter, hostBookingsMeta.page + 1)}
                          style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 7, padding: '5px 12px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>Next →</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========== PROPERTIES ========== */}
            {activeNav === 'properties' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                  <div>
                    <div className="hd-page-title">Properties</div>
                    <div className="hd-page-sub" style={{ marginBottom: 0 }}>Manage your listings, policies, and status.</div>
                  </div>
                  {myRole === 'owner' && <a href="/list-property" className="hd-add-btn">+ Add Property</a>}
                </div>

                {listings.length === 0 ? (
                  <div className="hd-empty">
                    <div className="hd-empty-icon">🏠</div>
                    <div className="hd-empty-title">No properties yet</div>
                    <div className="hd-empty-sub">List your first space and start earning on SnapReserve™.</div>
                    {myRole === 'owner' && <a href="/list-property" className="hd-add-btn" style={{ display: 'inline-flex' }}>+ Add your first property</a>}
                  </div>
                ) : (
                  <div className="hd-prop-grid">
                    {listings.map(l => <PropertyCard key={l.id} l={l} />)}
                    {myRole === 'owner' && (
                      <a href="/list-property" className="hd-add-card">
                        <div className="hd-add-icon">+</div>
                        <div className="hd-add-title">Add new property</div>
                        <div className="hd-add-sub">List your space on SnapReserve™</div>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========== CALENDAR ========== */}
            {activeNav === 'calendar' && (() => {
              const todayStr   = new Date().toISOString().slice(0, 10)
              const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
              const firstDow    = new Date(calYear, calMonth, 1).getDay()
              const monthLabel  = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

              // Build date → bookings map for this month
              const activeBks = calBookings.filter(b => !['cancelled'].includes(b.status))
              function pad(n) { return String(n).padStart(2, '0') }
              function dateStr(y, m, d) { return `${y}-${pad(m+1)}-${pad(d)}` }

              // Tag each calendar date
              function getDateTags(ds) {
                const tags = []
                for (const b of activeBks) {
                  if (b.check_in === ds)  tags.push({ type: 'checkin',   booking: b })
                  else if (b.check_out === ds) tags.push({ type: 'checkout', booking: b })
                  else if (b.check_in < ds && b.check_out > ds) tags.push({ type: 'stay', booking: b })
                }
                return tags
              }

              // Navigate months
              function prevMonth() {
                if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
                else setCalMonth(m => m - 1)
              }
              function nextMonth() {
                if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
                else setCalMonth(m => m + 1)
              }

              // Bookings for the selected date
              const selectedBks = calSelected ? activeBks.filter(b =>
                b.check_in === calSelected || b.check_out === calSelected ||
                (b.check_in < calSelected && b.check_out > calSelected)
              ) : []

              // Upcoming bookings (next 7 days from today)
              const soon = activeBks
                .filter(b => b.check_in >= todayStr)
                .sort((a, b) => a.check_in.localeCompare(b.check_in))
                .slice(0, 8)

              const STATUS_COLOR = {
                confirmed:   { bg: '#22c55e22', dot: '#22c55e',  label: 'Confirmed' },
                checked_in:  { bg: '#3b82f622', dot: '#60a5fa',  label: 'Checked In' },
                completed:   { bg: '#6b728022', dot: '#9ca3af',  label: 'Completed' },
                pending:     { bg: '#f59e0b22', dot: '#fcd34d',  label: 'Pending' },
              }

              const cells = []
              for (let i = 0; i < firstDow; i++) cells.push(null)
              for (let d = 1; d <= daysInMonth; d++) cells.push(d)

              const filteredBks = calPropFilter === 'all'
                ? calBookings
                : calBookings.filter(b => b.listing_id === calPropFilter)

              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div className="hd-page-title">Calendar</div>
                      <div className="hd-page-sub">Click any date to see bookings. Navigate months with the arrows.</div>
                    </div>
                    {listings.length > 1 && (
                      <select
                        value={calPropFilter}
                        onChange={e => { setCalPropFilter(e.target.value); loadCalBookings(e.target.value) }}
                        style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '8px 12px', fontSize: '0.82rem', color: 'var(--sr-text)', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="all">All properties</option>
                        {listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                      </select>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'flex-start' }}>
                    {/* ── Month grid ── */}
                    <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                      {/* Month nav */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--sr-border)' }}>
                        <button onClick={prevMonth} style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem', color: 'var(--sr-text)', flexShrink: 0 }}>‹</button>
                        <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)' }}>{monthLabel}</div>
                        <button onClick={nextMonth} style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem', color: 'var(--sr-text)', flexShrink: 0 }}>›</button>
                      </div>

                      {/* Day headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '12px 16px 0' }}>
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                          <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: 'var(--sr-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: 8 }}>{d}</div>
                        ))}
                      </div>

                      {/* Date cells */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, padding: '0 16px 16px' }}>
                        {cells.map((d, i) => {
                          if (!d) return <div key={`e${i}`} />
                          const ds   = dateStr(calYear, calMonth, d)
                          const tags = getDateTags(ds)
                          const isToday    = ds === todayStr
                          const isSelected = ds === calSelected
                          const hasCheckin  = tags.some(t => t.type === 'checkin')
                          const hasCheckout = tags.some(t => t.type === 'checkout')
                          const hasStay     = tags.some(t => t.type === 'stay')
                          const hasPending  = tags.some(t => t.booking.status === 'pending')

                          let bg = 'transparent'
                          let textColor = 'var(--sr-text)'
                          if (isSelected)    { bg = 'var(--sr-orange)';       textColor = 'white' }
                          else if (isToday)  { bg = 'rgba(244,96,26,0.15)';   textColor = 'var(--sr-orange)' }
                          else if (hasCheckin)  bg = 'rgba(34,197,94,0.15)'
                          else if (hasStay)     bg = 'rgba(59,130,246,0.12)'
                          else if (hasCheckout) bg = 'rgba(245,158,11,0.15)'

                          return (
                            <button
                              key={ds}
                              onClick={() => setCalSelected(isSelected ? null : ds)}
                              style={{
                                background: bg, color: textColor,
                                border: isToday && !isSelected ? '1.5px solid var(--sr-orange)' : '1.5px solid transparent',
                                borderRadius: 8, padding: '10px 4px', fontSize: '0.82rem',
                                fontWeight: isToday || isSelected ? 700 : 400,
                                cursor: 'pointer', fontFamily: 'inherit',
                                position: 'relative', textAlign: 'center',
                                transition: 'background 0.12s',
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(244,96,26,0.2)' : 'var(--sr-card2)' }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = bg }}
                            >
                              {d}
                              {/* Status dots */}
                              {tags.length > 0 && !isSelected && (
                                <div style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 2 }}>
                                  {hasCheckin  && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'block' }} />}
                                  {hasStay     && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', display: 'block' }} />}
                                  {hasCheckout && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'block' }} />}
                                  {hasPending  && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fcd34d', display: 'block' }} />}
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Legend */}
                      <div style={{ borderTop: '1px solid var(--sr-border)', padding: '12px 20px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {[
                          { color: 'var(--sr-orange)', label: 'Today' },
                          { color: '#22c55e',           label: 'Check-in' },
                          { color: '#60a5fa',           label: 'In stay' },
                          { color: '#f59e0b',           label: 'Check-out' },
                          { color: '#fcd34d',           label: 'Pending' },
                        ].map(({ color, label }) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'block', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.72rem', color: 'var(--sr-sub)' }}>{label}</span>
                          </div>
                        ))}
                      </div>

                      {calLoading && (
                        <div style={{ textAlign: 'center', padding: '12px', fontSize: '0.8rem', color: 'var(--sr-sub)' }}>Loading bookings…</div>
                      )}
                    </div>

                    {/* ── Right panel ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Selected date detail */}
                      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--sr-border)' }}>
                          <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1rem', fontWeight: 700, color: 'var(--sr-text)' }}>
                            {calSelected
                              ? new Date(calSelected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                              : 'Select a date'}
                          </div>
                          {calSelected && <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginTop: 2 }}>{selectedBks.length} booking{selectedBks.length !== 1 ? 's' : ''}</div>}
                        </div>
                        {!calSelected ? (
                          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.84rem' }}>
                            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📅</div>
                            Click any date to see booking details
                          </div>
                        ) : selectedBks.length === 0 ? (
                          <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.84rem' }}>
                            <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>✓</div>
                            No bookings on this date
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {selectedBks.map(b => {
                              const sc = STATUS_COLOR[b.status] || STATUS_COLOR.confirmed
                              const eventType = b.check_in === calSelected ? 'Check-in' : b.check_out === calSelected ? 'Check-out' : 'In stay'
                              return (
                                <div key={b.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--sr-border)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, background: sc.bg, color: sc.dot, borderRadius: 100, padding: '2px 8px' }}>{eventType}</span>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--sr-sub)' }}>{b.reference || b.id.slice(0,8).toUpperCase()}</span>
                                  </div>
                                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 2 }}>{b.guest_name || '—'}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginBottom: 4 }}>{b.listing_title || '—'}</div>
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.68rem', background: 'var(--sr-surface)', color: 'var(--sr-sub)', borderRadius: 6, padding: '2px 7px' }}>
                                      {b.check_in} → {b.check_out}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', background: 'var(--sr-surface)', color: 'var(--sr-sub)', borderRadius: 6, padding: '2px 7px' }}>
                                      {b.guests} guest{b.guests !== 1 ? 's' : ''}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', background: 'var(--sr-surface)', color: 'var(--sr-sub)', borderRadius: 6, padding: '2px 7px' }}>
                                      ${b.total_amount}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Upcoming check-ins */}
                      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--sr-border)' }}>
                          <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Upcoming</div>
                        </div>
                        {soon.length === 0 ? (
                          <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.84rem' }}>No upcoming bookings.</div>
                        ) : (
                          <div>
                            {soon.map(b => (
                              <button
                                key={b.id}
                                onClick={() => { setCalSelected(b.check_in); setCalYear(parseInt(b.check_in.slice(0,4))); setCalMonth(parseInt(b.check_in.slice(5,7)) - 1) }}
                                style={{ width: '100%', padding: '12px 20px', borderBottom: '1px solid var(--sr-border)', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderBottom: '1px solid var(--sr-border)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.12s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--sr-card2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--sr-surface)', border: '1px solid var(--sr-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--sr-orange)', textTransform: 'uppercase' }}>{new Date(b.check_in + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}</div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--sr-text)', lineHeight: 1 }}>{new Date(b.check_in + 'T12:00:00').getDate()}</div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.guest_name || '—'}</div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--sr-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.listing_title || '—'}</div>
                                </div>
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'rgba(34,197,94,0.1)', color: '#22c55e', borderRadius: 100, padding: '2px 7px', flexShrink: 0 }}>
                                  {b.nights}n
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ========== MESSAGES ========== */}
            {activeNav === 'messages' && (
              <div>
                <div className="hd-page-title">Messages</div>
                <div className="hd-page-sub">Communicate with guests and the SnapReserve™ team.</div>
                <HostInbox
                  userId={profile?.id}
                  onAdminRead={() => setUnreadMsgCount(0)}
                  unreadAdminCount={unreadMsgCount}
                />
              </div>
            )}

            {/* ========== EARNINGS ========== */}
            {activeNav === 'earnings' && (
              <div>
                <div className="hd-page-title">Earnings</div>
                <div className="hd-page-sub">Your revenue and payout breakdown per booking.</div>

                {/* Platform fee notice */}
                <div style={{ background: 'rgba(244,96,26,0.07)', border: '1px solid rgba(244,96,26,0.22)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>ℹ️</span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--sr-sub)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--sr-text)' }}>SnapReserve™ platform fee:</strong> 7% of each booking total + $1 fixed per booking.
                    Your payout = booking total − platform fee. This fee is not shown to guests.
                  </div>
                </div>

                {/* Summary cards */}
                {hostMetrics && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                    {[
                      { label: 'Total Earned',    val: `$${Number(hostMetrics.total_earned||0).toFixed(2)}`,    color: '#4ade80', hint: `${hostMetrics.completed_count} completed stay${hostMetrics.completed_count!==1?'s':''}` },
                      { label: 'Pending Payout',  val: `$${Number(hostMetrics.pending_payout||0).toFixed(2)}`,  color: '#fcd34d', hint: `${hostMetrics.booking_count - hostMetrics.completed_count} confirmed upcoming` },
                      { label: 'Upcoming Stays',  val: hostMetrics.upcoming_stays,                              color: '#60a5fa', hint: 'Confirmed reservations ahead' },
                      { label: 'Total Refunded',  val: `$${Number(hostMetrics.total_refunds||0).toFixed(2)}`,   color: '#f87171', hint: `${hostMetrics.cancelled_count} cancellation${hostMetrics.cancelled_count!==1?'s':''}` },
                    ].map(({ label, val, color, hint }) => (
                      <div key={label} className="hd-stat-card" style={{ borderTop: `3px solid ${color}` }}>
                        <div className="hd-stat-label">{label}</div>
                        <div className="hd-stat-val" style={{ color }}>{val}</div>
                        <div className="hd-stat-hint">{hint}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Loading state */}
                {hostBookingsLoading && !hostMetrics && (
                  <div style={{ color: 'var(--sr-sub)', fontSize: '0.88rem', padding: '40px 0' }}>Loading earnings…</div>
                )}

                {/* Earnings table — completed bookings */}
                <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--sr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1rem', fontWeight: 700, color: 'var(--sr-text)' }}>All Bookings — Earnings Breakdown</div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--sr-sub)' }}>{hostBookingsMeta.total} total</span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--sr-border)' }}>
                          {['Booking ID','Property','Guest','Dates','Total Paid','Platform Fee','Your Payout','Payout Status'].map(h => (
                            <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hostBookingsLoading ? (
                          <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>Loading…</td></tr>
                        ) : hostBookings.length === 0 ? (
                          <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>No bookings yet.</td></tr>
                        ) : hostBookings.map((b, i) => {
                          const ps = b.payout_status
                          const psBg    = ps==='released' ? 'rgba(74,222,128,0.12)'  : ps==='refunded' ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.12)'
                          const psColor = ps==='released' ? '#4ade80'                : ps==='refunded' ? '#f87171'               : '#fcd34d'
                          const psLabel = ps==='released' ? 'Released'               : ps==='refunded' ? 'Refunded'              : 'Pending'
                          return (
                            <tr key={b.id} style={{ borderBottom: '1px solid var(--sr-border)', background: i%2===1 ? 'var(--sr-overlay-xs)' : 'transparent', cursor: 'pointer' }} onClick={() => window.location.href = `/host/bookings/${b.id}`}>
                              <td style={{ padding: '12px 18px' }}>
                                <a href={`/host/bookings/${b.id}`} onClick={e => e.stopPropagation()} style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--sr-orange)', fontWeight: 700, textDecoration: 'none' }}>{b.reference}</a>
                              </td>
                              <td style={{ padding: '12px 18px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sr-text)' }}>{b.listing_title}</div>
                                {b.listing_city && <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)' }}>{b.listing_city}</div>}
                              </td>
                              <td style={{ padding: '12px 18px', color: 'var(--sr-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{b.guest_name}</td>
                              <td style={{ padding: '12px 18px', color: 'var(--sr-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                {b.check_in ? new Date(b.check_in).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}
                                {' → '}
                                {b.check_out ? new Date(b.check_out).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                              </td>
                              <td style={{ padding: '12px 18px', fontWeight: 700, fontSize: '0.83rem', whiteSpace: 'nowrap' }}>${Number(b.total_amount||0).toFixed(2)}</td>
                              <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
                                <div style={{ color: '#f87171', fontSize: '0.82rem' }}>−${Number(b.total_platform_fee||0).toFixed(2)}</div>
                                <div style={{ fontSize: '0.62rem', color: 'var(--sr-sub)' }}>7% + $1</div>
                              </td>
                              <td style={{ padding: '12px 18px', color: '#4ade80', fontWeight: 700, fontSize: '0.83rem', whiteSpace: 'nowrap' }}>${Number(b.host_earnings||0).toFixed(2)}</td>
                              <td style={{ padding: '12px 18px' }}>
                                <span style={{ background: psBg, color: psColor, borderRadius: 20, padding: '3px 10px', fontSize: '0.67rem', fontWeight: 700 }}>{psLabel}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {hostBookingsMeta.total > hostBookingsMeta.limit && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--sr-border)' }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--sr-sub)' }}>{hostBookingsMeta.total} total</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button disabled={hostBookingsMeta.page <= 1} onClick={() => loadHostBookings('all', bkPropFilter, hostBookingsMeta.page - 1)}
                          style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 7, padding: '5px 12px', fontSize: '0.76rem', fontWeight: 600, cursor: hostBookingsMeta.page <= 1 ? 'not-allowed' : 'pointer', opacity: hostBookingsMeta.page <= 1 ? 0.4 : 1 }}>← Prev</button>
                        <span style={{ fontSize: '0.76rem', color: 'var(--sr-sub)', alignSelf: 'center' }}>Page {hostBookingsMeta.page}</span>
                        <button disabled={hostBookingsMeta.page * hostBookingsMeta.limit >= hostBookingsMeta.total} onClick={() => loadHostBookings('all', bkPropFilter, hostBookingsMeta.page + 1)}
                          style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 7, padding: '5px 12px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>Next →</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========== PAYOUTS ========== */}
            {activeNav === 'payouts' && (
              <div>
                <div className="hd-page-title">Payouts</div>
                <div className="hd-page-sub">Manage your bank accounts and payout schedule.</div>
                <PlaceholderPage
                  icon="🏦"
                  title="Payout management coming soon"
                  subtitle="Connect your bank account and manage payout settings. Funds transfer automatically after each stay."
                />
              </div>
            )}

            {/* ========== REVIEWS ========== */}
            {activeNav === 'reviews' && (
              <div>
                <div className="hd-page-title">Reviews</div>
                <div className="hd-page-sub">See what guests are saying about your properties.</div>

                {/* Metrics row */}
                {hostReviewsMetrics && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {/* Overall score */}
                    <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, padding: '18px 20px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--sr-orange)', lineHeight: 1, marginBottom: 4 }}>
                        {hostReviewsMetrics.avg_rating > 0 ? hostReviewsMetrics.avg_rating.toFixed(1) : '—'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg Rating</div>
                      {hostReviewsMetrics.avg_rating > 0 && (
                        <div style={{ color: '#F59E0B', fontSize: '0.82rem', marginTop: 4 }}>
                          {'★'.repeat(Math.round(hostReviewsMetrics.avg_rating))}{'☆'.repeat(5 - Math.round(hostReviewsMetrics.avg_rating))}
                        </div>
                      )}
                    </div>
                    <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, padding: '18px 20px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--sr-text)', lineHeight: 1, marginBottom: 4 }}>{hostReviewsMetrics.total_reviews}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Reviews</div>
                    </div>
                    {/* Rating breakdown */}
                    <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, padding: '14px 16px', gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Rating Breakdown</div>
                      {[5,4,3,2,1].map(n => {
                        const cnt = hostReviewsMetrics.rating_breakdown[n] || 0
                        const pct = hostReviewsMetrics.total_reviews > 0 ? (cnt / hostReviewsMetrics.total_reviews) * 100 : 0
                        return (
                          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: '0.72rem', color: '#F59E0B', width: 14, flexShrink: 0 }}>{n}★</span>
                            <div style={{ flex: 1, height: 6, background: 'var(--sr-border)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#F59E0B', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--sr-muted)', width: 20, textAlign: 'right', flexShrink: 0 }}>{cnt}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Filter row */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  {reviewsListings.length > 1 && (
                    <select
                      value={reviewsListingFilter}
                      onChange={e => { setReviewsListingFilter(e.target.value); loadHostReviews(e.target.value, 1) }}
                      style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', color: 'var(--sr-text)', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="all">All Properties</option>
                      {reviewsListings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                    </select>
                  )}
                </div>

                {hostReviewsLoading ? (
                  <div style={{ color: 'var(--sr-sub)', fontSize: '0.88rem', padding: '40px 0', textAlign: 'center' }}>Loading reviews…</div>
                ) : hostReviews.length === 0 ? (
                  <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, padding: '48px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⭐</div>
                    <div style={{ fontWeight: 700, color: 'var(--sr-text)', marginBottom: 6 }}>No reviews yet</div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--sr-sub)' }}>Guest reviews will appear here after completed stays.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {hostReviews.map(r => (
                      <div key={r.id} style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, padding: '18px 22px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--sr-text)' }}>{r.guest_name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)', marginTop: 2 }}>
                              {r.listing_title} · {new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ color: '#F59E0B', fontSize: '0.88rem' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--sr-text)' }}>{r.rating.toFixed(1)}</span>
                          </div>
                        </div>

                        {/* Category pills */}
                        {(r.cleanliness || r.accuracy || r.communication || r.location || r.value) && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                            {[['Clean', r.cleanliness],['Accuracy', r.accuracy],['Comms', r.communication],['Location', r.location],['Value', r.value]].map(([label, val]) =>
                              val ? (
                                <span key={label} style={{ background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 20, padding: '2px 10px', fontSize: '0.68rem', color: 'var(--sr-muted)', fontWeight: 600 }}>
                                  {label}: <span style={{ color: '#F59E0B' }}>{val}★</span>
                                </span>
                              ) : null
                            )}
                          </div>
                        )}

                        {/* Comment */}
                        {r.comment && (
                          <p style={{ fontSize: '0.84rem', color: 'var(--sr-muted)', lineHeight: 1.75, marginBottom: 10 }}>{r.comment}</p>
                        )}

                        {/* Host reply */}
                        {r.host_reply ? (
                          <div style={{ background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--sr-sub)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Your response</div>
                            <p style={{ fontSize: '0.82rem', color: 'var(--sr-text)', lineHeight: 1.7 }}>{r.host_reply}</p>
                            <button onClick={() => { setReplyModal(r); setReplyText(r.host_reply) }}
                              style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--sr-orange)', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                              Edit response
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setReplyModal(r); setReplyText('') }}
                            style={{ background: 'none', border: '1px solid var(--sr-border)', borderRadius: 8, padding: '6px 14px', fontSize: '0.76rem', fontWeight: 600, color: 'var(--sr-muted)', cursor: 'pointer' }}>
                            + Respond to review
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {hostReviewsMeta.total > hostReviewsMeta.limit && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--sr-sub)' }}>{hostReviewsMeta.total} total · Page {hostReviewsMeta.page}</span>
                    <button disabled={hostReviewsMeta.page <= 1} onClick={() => loadHostReviews(reviewsListingFilter, hostReviewsMeta.page - 1)}
                      style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 7, padding: '5px 12px', fontSize: '0.76rem', cursor: 'pointer', opacity: hostReviewsMeta.page <= 1 ? 0.4 : 1 }}>← Prev</button>
                    <button disabled={hostReviewsMeta.page * hostReviewsMeta.limit >= hostReviewsMeta.total} onClick={() => loadHostReviews(reviewsListingFilter, hostReviewsMeta.page + 1)}
                      style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 7, padding: '5px 12px', fontSize: '0.76rem', cursor: 'pointer' }}>Next →</button>
                  </div>
                )}
              </div>
            )}

            {/* ========== TEAM MEMBERS ========== */}
            {activeNav === 'team' && (() => {
              const TEAM_RS = {
                owner:   { bg: 'rgba(244,96,26,0.12)',   text: '#F4601A',  icon: '👑' },
                manager: { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa',  icon: '🔵' },
                staff:   { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80',  icon: '🟢' },
                finance: { bg: 'rgba(251,191,36,0.12)',  text: '#fcd34d',  icon: '💛' },
                custom:  { bg: 'rgba(192,132,252,0.12)', text: '#c084fc',  icon: '🎨' },
              }
              const TASK_ST = {
                urgent:      { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Urgent' },
                in_progress: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'In Progress' },
                scheduled:   { color: 'var(--sr-sub)', bg: 'var(--sr-surface)', label: 'Scheduled' },
                done:        { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Done' },
              }
              const activeMembers  = teamData?.members?.filter(m => m.status === 'active')  || []
              const pendingMembers = teamData?.members?.filter(m => m.status === 'pending') || []
              const todayStr       = new Date().toISOString().slice(0, 10)
              const filteredTasks  = tasks
                .filter(t => taskPropertyFilter === 'all' || t.listing_id === taskPropertyFilter)
                .filter(t => taskFilter === 'all' || t.status === taskFilter)
              return (
                <div>
                  <div className="hd-page-title">Team Management</div>
                  <div className="hd-page-sub">Invite and manage team members, tasks, and property assignments.</div>

                  {/* Sub-tab bar */}
                  <div style={{ display: 'flex', gap: 4, background: 'var(--sr-surface)', borderRadius: 12, padding: 4, marginBottom: 24, width: 'fit-content' }}>
                    {[
                      { key: 'overview',     label: 'Overview' },
                      { key: 'members',      label: 'Team Members' },
                      { key: 'tasks',        label: 'Tasks' },
                      { key: 'properties',   label: 'Properties' },
                      { key: 'permissions',  label: 'Permissions' },
                    ].map(t => (
                      <button key={t.key} onClick={() => setTeamSubTab(t.key)} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: teamSubTab === t.key ? 'var(--sr-card)' : 'transparent', color: teamSubTab === t.key ? 'var(--sr-text)' : 'var(--sr-muted)', fontWeight: teamSubTab === t.key ? 700 : 600, fontSize: '0.84rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', boxShadow: teamSubTab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {teamLoading && !teamData && (
                    <div style={{ color: 'var(--sr-sub)', fontSize: '0.88rem', padding: '40px 0' }}>Loading team…</div>
                  )}

                  {/* ── OVERVIEW sub-tab ── */}
                  {teamSubTab === 'overview' && (
                    <div>
                      {/* Stats row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                        {[
                          { label: 'Team Members', val: teamData?.members?.length || 0,               hint: 'Total invited',   icon: '👥', onClick: () => setTeamSubTab('members') },
                          { label: 'Tasks Today',  val: tasks.filter(t => t.due_date === todayStr).length, hint: 'Due today',   icon: '✓',  onClick: () => { setTeamSubTab('tasks'); setTaskFilter('all') } },
                          { label: 'Properties',   val: listings.length,                              hint: 'Active listings', icon: '🏨', onClick: () => setTeamSubTab('properties') },
                          { label: 'Urgent',       val: tasks.filter(t => t.status === 'urgent').length, hint: 'Need attention', icon: '⚠️', onClick: () => { setTeamSubTab('tasks'); setTaskFilter('urgent') } },
                        ].map(({ label, val, hint, icon, onClick }) => (
                          <button key={label} className="hd-stat-card" onClick={onClick} style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--sr-border)', transition: 'border-color 0.15s, box-shadow 0.15s', fontFamily: 'inherit', width: '100%' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sr-orange)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--sr-ol)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sr-border)'; e.currentTarget.style.boxShadow = 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <div className="hd-stat-label" style={{ margin: 0 }}>{label}</div>
                              <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                            </div>
                            <div className="hd-stat-val" style={{ marginBottom: 4 }}>{val}</div>
                            <div className="hd-stat-hint">{hint}</div>
                          </button>
                        ))}
                      </div>

                      {/* Quick Actions */}
                      <div className="hd-section-title" style={{ marginBottom: 14 }}>Quick Actions</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
                        {[
                          { icon: '➕', label: 'Invite Member',    sub: 'Add a team member',    action: () => setInviteModal(true) },
                          { icon: '📋', label: 'View Tasks',       sub: 'Manage all tasks',      action: () => setTeamSubTab('tasks') },
                          { icon: '🏨', label: 'Assign Property',  sub: 'Manage access',         action: () => setTeamSubTab('properties') },
                          { icon: '🔐', label: 'Roles & Permissions', sub: 'View role access',  action: () => setTeamSubTab('permissions') },
                        ].map(qa => (
                          <button key={qa.label} onClick={qa.action} className="hd-qa-btn">
                            <span className="hd-qa-icon">{qa.icon}</span>
                            <div className="hd-qa-label">{qa.label}</div>
                            <div className="hd-qa-sub">{qa.sub}</div>
                          </button>
                        ))}
                      </div>

                      {/* Two-column: members + tasks */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Members list */}
                        <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--sr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Team Members</div>
                            {teamData?.caller_role === 'owner' && (
                              <button onClick={() => setInviteModal(true)} style={{ background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>+ Invite</button>
                            )}
                          </div>
                          {activeMembers.slice(0, 5).map(m => {
                            const rs = TEAM_RS[m.role] || TEAM_RS.staff
                            const ini = m.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || m.email?.[0]?.toUpperCase() || '?'
                            return (
                              <div key={m.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--sr-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: rs.bg, border: `1px solid ${rs.text}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.76rem', fontWeight: 700, color: rs.text, flexShrink: 0 }}>{ini}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--sr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name || m.email || '—'}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', textTransform: 'capitalize' }}>{m.role}</div>
                                </div>
                                <span style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', borderRadius: 100, padding: '2px 9px', fontSize: '0.65rem', fontWeight: 700 }}>Active</span>
                              </div>
                            )
                          })}
                          {activeMembers.length === 0 && (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.84rem' }}>
                              No active members yet.{' '}
                              {teamData?.caller_role === 'owner' && <button onClick={() => setInviteModal(true)} style={{ background: 'none', border: 'none', color: 'var(--sr-orange)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>Invite one →</button>}
                            </div>
                          )}
                          {activeMembers.length > 5 && (
                            <div style={{ padding: '10px 20px', textAlign: 'center' }}>
                              <button onClick={() => setTeamSubTab('members')} style={{ background: 'none', border: 'none', color: 'var(--sr-orange)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', fontSize: '0.8rem' }}>
                                View all {activeMembers.length} members →
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Recent tasks */}
                        <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--sr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Recent Tasks</div>
                            <button onClick={() => setTeamSubTab('tasks')} style={{ background: 'none', border: 'none', color: 'var(--sr-orange)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', fontSize: '0.78rem' }}>View all →</button>
                          </div>
                          {tasks.slice(0, 4).map(task => {
                            const st = TASK_ST[task.status] || TASK_ST.scheduled
                            return (
                              <div key={task.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--sr-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: task.status === 'done' ? 'var(--sr-sub)' : 'var(--sr-text)', textDecoration: task.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', marginTop: 2 }}>🏨 {task.listing_title}{task.due_date ? ` · ${fmtDue(task.due_date)}` : ''}</div>
                                </div>
                                <span style={{ background: st.bg, color: st.color, borderRadius: 100, padding: '2px 9px', fontSize: '0.65rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{st.label}</span>
                              </div>
                            )
                          })}
                          {tasks.length === 0 && (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.84rem' }}>
                              No tasks yet.{' '}
                              <button onClick={() => setTeamSubTab('tasks')} style={{ background: 'none', border: 'none', color: 'var(--sr-orange)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>Add one →</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── MEMBERS sub-tab ── */}
                  {teamSubTab === 'members' && (
                    <div>
                      {inviteLink && (
                        <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <span>🔗</span>
                          <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--sr-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inviteLink}</span>
                          <button onClick={() => { navigator.clipboard.writeText(inviteLink); showToast('Copied!') }} style={{ background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>Copy Link</button>
                          <button onClick={() => setInviteLink(null)} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', fontSize: '1rem', cursor: 'pointer', padding: '4px' }}>✕</button>
                        </div>
                      )}
                      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--sr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Team Members</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--sr-sub)' }}>{activeMembers.length} active · {pendingMembers.length} pending</span>
                            {teamData?.caller_role === 'owner' && (
                              <button onClick={() => setInviteModal(true)} style={{ background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 9, padding: '7px 16px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>+ Invite</button>
                            )}
                          </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--sr-border)' }}>
                                {['Member', 'Role', 'Property Access', 'Status', 'Actions'].map(h => (
                                  <th key={h} style={{ padding: '11px 20px', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(teamData?.members || []).filter(m => m.status !== 'pending').map((m) => {
                                const rs = TEAM_RS[m.role] || TEAM_RS.staff
                                const customRole = m.role === 'custom' ? customRoles.find(cr => cr.id === m.custom_role_id) : null
                                const roleLabel = customRole ? customRole.name : m.role
                                const ini = m.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || m.email?.[0]?.toUpperCase() || '?'
                                const isBusy = !!memberActions[m.id]
                                const isOwner = m.role === 'owner'
                                return (
                                  <tr key={m.id} style={{ borderBottom: '1px solid var(--sr-border)' }}>
                                    <td style={{ padding: '14px 20px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: rs.bg, border: `1px solid ${rs.text}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: rs.text, flexShrink: 0 }}>{ini}</div>
                                        <div>
                                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sr-text)', lineHeight: 1.3 }}>{m.full_name || m.email || '—'}</div>
                                          {m.full_name && m.email && <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)' }}>{m.email}</div>}
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                      <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.text}33`, borderRadius: 100, padding: '4px 12px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{rs.icon} {roleLabel}</span>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                      {!isOwner && teamData?.caller_role === 'owner' ? (
                                        <button
                                          onClick={() => setAccessEditMember(m)}
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--sr-card2)', color: m.allowed_listing_ids ? 'var(--sr-orange)' : 'var(--sr-sub)', border: '1px solid var(--sr-border)', borderRadius: 100, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--sr-orange)'}
                                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--sr-border)'}
                                        >
                                          {!m.allowed_listing_ids ? 'All Properties' : `${m.allowed_listing_ids.length} Propert${m.allowed_listing_ids.length !== 1 ? 'ies' : 'y'}`}
                                          <span style={{ opacity: 0.6, fontSize: '0.6rem' }}>✏️</span>
                                        </button>
                                      ) : (
                                        <span style={{ background: 'var(--sr-card2)', color: 'var(--sr-sub)', borderRadius: 100, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 600 }}>
                                          {!m.allowed_listing_ids ? 'All Properties' : `${m.allowed_listing_ids.length} Propert${m.allowed_listing_ids.length !== 1 ? 'ies' : 'y'}`}
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: '#4ade80' }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} /> Active
                                      </span>
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                      {!isOwner && teamData?.caller_role === 'owner' && (
                                        <div style={{ display: 'flex', gap: 6 }}>
                                          <select
                                            value={m.role === 'custom' ? `custom:${m.custom_role_id}` : m.role}
                                            disabled={isBusy}
                                            onChange={e => {
                                              const val = e.target.value
                                              if (val.startsWith('custom:')) {
                                                handleMemberAction(m.id, 'change_role', { role: 'custom', custom_role_id: val.split(':')[1] })
                                              } else {
                                                handleMemberAction(m.id, 'change_role', { role: val })
                                              }
                                            }}
                                            style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 8, padding: '5px 10px', fontSize: '0.72rem', color: 'var(--sr-muted)', cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)', outline: 'none' }}
                                          >
                                            <option value="manager">Manager</option>
                                            <option value="staff">Staff</option>
                                            <option value="finance">Finance</option>
                                            {customRoles.map(cr => (
                                              <option key={cr.id} value={`custom:${cr.id}`}>{cr.name}</option>
                                            ))}
                                          </select>
                                          <button onClick={() => handleMemberAction(m.id, 'remove')} disabled={isBusy} style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', color: '#f87171', cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)' }}>
                                            {isBusy ? '…' : 'Remove'}
                                          </button>
                                          <button
                                            onClick={() => {
                                              setViewingAs({ id: m.id, name: m.full_name || m.email || 'Team Member', role: m.role, email: m.email, allowed_listing_ids: m.allowed_listing_ids })
                                              setActiveNav('overview')
                                            }}
                                            style={{ background: 'rgba(244,96,26,0.08)', border: '1px solid rgba(244,96,26,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', color: 'var(--sr-orange)', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', whiteSpace: 'nowrap' }}
                                          >
                                            View As
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                              {activeMembers.length === 0 && (
                                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>No active team members yet. Invite someone to get started.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {/* Pending invites */}
                      {pendingMembers.length > 0 && (
                        <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--sr-border)' }}>
                            <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.05rem', fontWeight: 700, color: 'var(--sr-text)' }}>Pending Invites</div>
                          </div>
                          {pendingMembers.map(m => {
                            const rs2 = TEAM_RS[m.role] || TEAM_RS.staff
                            const pendingCustomRole = m.role === 'custom' ? customRoles.find(cr => cr.id === m.custom_role_id) : null
                            const pendingRoleLabel = pendingCustomRole ? pendingCustomRole.name : m.role
                            const isBusy = !!memberActions[m.id]
                            return (
                              <div key={m.id} style={{ padding: '14px 24px', borderBottom: '1px solid var(--sr-border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sr-text)' }}>{m.invite_email || m.email || '—'}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginTop: 2 }}>Invited {m.invited_at ? new Date(m.invited_at).toLocaleDateString() : '—'}</div>
                                </div>
                                <span style={{ background: rs2.bg, color: rs2.text, border: `1px solid ${rs2.text}33`, borderRadius: 100, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize' }}>{pendingRoleLabel}</span>
                                <span style={{ background: 'rgba(251,191,36,0.08)', color: '#fcd34d', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 100, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700 }}>Pending</span>
                                {teamData?.caller_role === 'owner' && (
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button onClick={() => handleMemberAction(m.id, 'get_invite_link')} disabled={isBusy} title="Copy invite link to clipboard" style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', color: 'var(--sr-muted)', cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)' }}>🔗 Copy Link</button>
                                    <button onClick={() => handleMemberAction(m.id, 'resend_invite')} disabled={isBusy} title="Resend invite email with a new link" style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', color: 'var(--sr-muted)', cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)' }}>↺ Resend Email</button>
                                    <button onClick={() => handleMemberAction(m.id, 'remove')} disabled={isBusy} title="Cancel this invite" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', color: '#f87171', cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)' }}>{isBusy ? '…' : 'Cancel'}</button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {!teamLoading && !teamData && (
                        <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, padding: '40px', textAlign: 'center', maxWidth: 480 }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👥</div>
                          <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 8 }}>Team not available</div>
                          <div style={{ fontSize: '0.84rem', color: 'var(--sr-sub)', lineHeight: 1.6 }}>Team management is available for host accounts. If you're a team member, your owner needs to send you a new invite.</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TASKS sub-tab ── */}
                  {teamSubTab === 'tasks' && (
                    <div>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
                        <div>
                          <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)' }}>Tasks</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--sr-sub)', marginTop: 2 }}>Assign and track tasks across your properties.</div>
                        </div>
                        <button
                          onClick={() => { setTaskFormErr(''); setTaskModal(true) }}
                          style={{ background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', flexShrink: 0 }}
                        >+ Add Task</button>
                      </div>

                      {/* Property filter */}
                      {listings.length > 1 && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sr-sub)', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 4 }}>Property</span>
                          {[{ key: 'all', label: 'All' }, ...listings.map(l => ({ key: l.id, label: l.title || 'Untitled' }))].map(f => (
                            <button key={f.key} onClick={() => setTaskPropertyFilter(f.key)}
                              style={{ padding: '5px 13px', borderRadius: 100, border: '1px solid var(--sr-border)', background: taskPropertyFilter === f.key ? 'var(--sr-text)' : 'var(--sr-card)', color: taskPropertyFilter === f.key ? 'var(--sr-bg)' : 'var(--sr-muted)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.15s', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {f.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Status filters */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--sr-sub)', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 4 }}>Status</span>
                        {[
                          { key: 'all',         label: 'All' },
                          { key: 'urgent',      label: '🔴 Urgent' },
                          { key: 'in_progress', label: '🔵 In Progress' },
                          { key: 'scheduled',   label: '⚪ Scheduled' },
                          { key: 'done',        label: '✓ Done' },
                        ].map(f => (
                          <button key={f.key} onClick={() => setTaskFilter(f.key)}
                            style={{ padding: '5px 13px', borderRadius: 100, border: '1px solid var(--sr-border)', background: taskFilter === f.key ? 'var(--sr-orange)' : 'var(--sr-card)', color: taskFilter === f.key ? 'white' : 'var(--sr-muted)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.15s' }}>
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {/* Task cards */}
                      {!tasksLoaded ? (
                        <div style={{ color: 'var(--sr-sub)', fontSize: '0.88rem', padding: '40px 0', textAlign: 'center' }}>Loading tasks…</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {filteredTasks.map(task => {
                            const st       = TASK_ST[task.status] || TASK_ST.scheduled
                            const assignee = task.assigned_to ? (teamData?.members || []).find(m => m.id === task.assigned_to) : null
                            const isDueToday = task.due_date === todayStr
                            return (
                              <div key={task.id} style={{ background: 'var(--sr-card)', border: `1px solid ${task.status === 'urgent' ? 'rgba(239,68,68,0.25)' : 'var(--sr-border)'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                {/* Checkbox */}
                                <div
                                  onClick={() => handleTaskStatus(task.id, task.status === 'done' ? 'scheduled' : 'done')}
                                  style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${task.status === 'done' ? '#22c55e' : 'var(--sr-border)'}`, background: task.status === 'done' ? 'rgba(34,197,94,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#22c55e', fontSize: '0.7rem', fontWeight: 700, marginTop: 2 }}
                                >{task.status === 'done' ? '✓' : ''}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: task.status === 'done' ? 'var(--sr-sub)' : 'var(--sr-text)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</div>
                                  {task.description && <div style={{ fontSize: '0.75rem', color: 'var(--sr-sub)', marginTop: 2, lineHeight: 1.5 }}>{task.description}</div>}
                                  <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--sr-sub)', background: 'var(--sr-surface)', borderRadius: 6, padding: '2px 8px', border: '1px solid var(--sr-border)' }}>
                                      🏨 {task.listing_title}{task.listing_city ? ` · ${task.listing_city}` : ''}
                                    </span>
                                    {task.due_date && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: isDueToday ? '#f59e0b' : 'var(--sr-sub)', background: isDueToday ? 'rgba(245,158,11,0.08)' : 'var(--sr-surface)', borderRadius: 6, padding: '2px 8px', border: `1px solid ${isDueToday ? 'rgba(245,158,11,0.3)' : 'var(--sr-border)'}` }}>
                                        🕐 {fmtDue(task.due_date)}
                                      </span>
                                    )}
                                    {assignee && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--sr-sub)', background: 'var(--sr-surface)', borderRadius: 6, padding: '2px 8px', border: '1px solid var(--sr-border)' }}>
                                        👤 {assignee.full_name || assignee.email || 'Team member'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  <span style={{ background: st.bg, color: st.color, borderRadius: 100, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{st.label}</span>
                                  <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', cursor: 'pointer', fontSize: '0.9rem', padding: '4px', lineHeight: 1, opacity: 0.6 }} title="Delete task">✕</button>
                                </div>
                              </div>
                            )
                          })}
                          {filteredTasks.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>
                              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✓</div>
                              {tasks.length === 0
                                ? 'No tasks yet. Click "+ Add Task" to get started.'
                                : 'No tasks match these filters.'}
                              {(taskFilter !== 'all' || taskPropertyFilter !== 'all') && (
                                <button onClick={() => { setTaskFilter('all'); setTaskPropertyFilter('all') }}
                                  style={{ background: 'none', border: 'none', color: 'var(--sr-orange)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', display: 'block', margin: '8px auto 0' }}>
                                  Clear filters
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── PROPERTIES sub-tab ── */}
                  {teamSubTab === 'properties' && (
                    <div>
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 4 }}>Properties & Team Access</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--sr-sub)' }}>Click any property to manage which team members have access.</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                        {listings.map(l => {
                          const assigned = (teamData?.members || []).filter(m => m.status === 'active' && m.role !== 'owner' && (!m.allowed_listing_ids || m.allowed_listing_ids.includes(l.id)))
                          const img = Array.isArray(l.images) && l.images[0]
                          return (
                            <button
                              key={l.id}
                              onClick={() => setPropAccessModal(l)}
                              style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s, box-shadow 0.15s', width: '100%' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sr-orange)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--sr-ol)' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sr-border)'; e.currentTarget.style.boxShadow = 'none' }}
                            >
                              {/* Property image */}
                              <div style={{ height: 120, position: 'relative', overflow: 'hidden', background: 'var(--sr-card2)' }}>
                                {img
                                  ? <img src={img} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', opacity: 0.25 }}>🏠</div>
                                }
                                <span style={{ position: 'absolute', top: 10, right: 10, background: l.status === 'approved' ? 'rgba(34,197,94,0.85)' : 'rgba(0,0,0,0.55)', color: l.status === 'approved' ? '#fff' : '#ccc', borderRadius: 100, padding: '2px 9px', fontSize: '0.62rem', fontWeight: 700, textTransform: 'capitalize', backdropFilter: 'blur(4px)' }}>{l.status || 'draft'}</span>
                              </div>
                              <div style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--sr-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title || 'Untitled'}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)' }}>📍 {l.city}{l.state ? `, ${l.state}` : ''}</div>
                                  </div>
                                  <span style={{ background: 'rgba(244,96,26,0.08)', color: 'var(--sr-orange)', border: '1px solid rgba(244,96,26,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 10 }}>
                                    Manage Access
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {assigned.slice(0, 5).map((m, i) => {
                                    const ini = m.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || m.email?.[0]?.toUpperCase() || '?'
                                    return (
                                      <div key={m.id} title={m.full_name || m.email} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--sr-orange)', border: '2px solid var(--sr-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, color: 'white', marginLeft: i > 0 ? -6 : 0, position: 'relative', zIndex: 5 - i }}>
                                        {ini}
                                      </div>
                                    )
                                  })}
                                  {assigned.length > 5 && <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--sr-surface)', border: '2px solid var(--sr-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 700, color: 'var(--sr-sub)', marginLeft: -6 }}>+{assigned.length - 5}</div>}
                                  <span style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginLeft: assigned.length > 0 ? 6 : 0 }}>
                                    {assigned.length === 0 ? 'No members assigned' : `${assigned.length} member${assigned.length !== 1 ? 's' : ''} with access`}
                                  </span>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                        {listings.length === 0 && (
                          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏨</div>No properties yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── PERMISSIONS sub-tab ── */}
                  {teamSubTab === 'permissions' && (
                    <div>
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 4 }}>Roles & Permissions</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--sr-sub)' }}>What each role can access and manage within your team workspace.</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                        {[
                          { role: 'Owner',   color: '#F4601A', icon: '👑', desc: 'Full access to all features, settings, and team management' },
                          { role: 'Manager', color: '#60a5fa', icon: '🔵', desc: 'Manage listings, bookings, guests, and team activity' },
                          { role: 'Staff',   color: '#4ade80', icon: '🟢', desc: 'Handle bookings and guest communication only' },
                          { role: 'Finance', color: '#fcd34d', icon: '💛', desc: 'View and manage earnings, payouts, and expenses' },
                        ].map(({ role, color, icon, desc }) => (
                          <div key={role} style={{ background: 'var(--sr-card)', border: `1px solid ${color}22`, borderRadius: 14, padding: '18px' }}>
                            <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{icon}</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{role}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--sr-sub)', lineHeight: 1.5 }}>{desc}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--sr-border)', background: 'var(--sr-surface)' }}>
                              <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)' }}>Permission</th>
                              {['Owner','Manager','Staff','Finance'].map(r => (
                                <th key={r} style={{ padding: '14px 16px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)' }}>{r}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { perm: 'View overview',            owner: true,  manager: true,  staff: true,  finance: true  },
                              { perm: 'View & manage bookings',   owner: true,  manager: true,  staff: true,  finance: false },
                              { perm: 'Manage properties',        owner: true,  manager: true,  staff: false, finance: false },
                              { perm: 'Guest messaging',          owner: true,  manager: true,  staff: true,  finance: false },
                              { perm: 'View calendar',            owner: true,  manager: true,  staff: true,  finance: false },
                              { perm: 'View earnings',            owner: true,  manager: false, staff: false, finance: true  },
                              { perm: 'View payouts & expenses',  owner: true,  manager: false, staff: false, finance: true  },
                              { perm: 'Manage team',              owner: true,  manager: false, staff: false, finance: false },
                              { perm: 'Account settings',         owner: true,  manager: false, staff: false, finance: false },
                              { perm: 'View & reply to reviews',  owner: true,  manager: true,  staff: false, finance: false },
                              { perm: 'View activity log',        owner: true,  manager: true,  staff: false, finance: true  },
                            ].map(({ perm, owner, manager, staff, finance }, i) => (
                              <tr key={perm} style={{ borderBottom: '1px solid var(--sr-border)', background: i % 2 === 0 ? 'transparent' : 'var(--sr-surface)' }}>
                                <td style={{ padding: '12px 20px', fontSize: '0.84rem', color: 'var(--sr-text)', fontWeight: 500 }}>{perm}</td>
                                {[owner, manager, staff, finance].map((has, j) => (
                                  <td key={j} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    {has ? <span style={{ color: '#22c55e', fontWeight: 700 }}>✓</span> : <span style={{ color: 'var(--sr-border)' }}>—</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ========== EXPENSES ========== */}
            {activeNav === 'expenses' && (() => {
              const EXP_CATS = ['Cleaning', 'Maintenance', 'Supplies', 'Insurance', 'Marketing', 'HOA', 'Utilities', 'Management', 'Other', ...customCats]
              const MOCK_REVENUE = 5400

              // Filtered data
              const propFiltered = expPropFilter === 'all' ? expenses : expenses.filter(e => e.property === expPropFilter || e.property === 'All Properties')
              const catFiltered  = expCatFilter  === 'all' ? propFiltered : propFiltered.filter(e => e.category === expCatFilter)

              // Totals
              const totalExp    = expenses.reduce((s, e) => s + e.amount, 0)
              const netProfit   = MOCK_REVENUE - totalExp
              const curMonth    = new Date('2026-03-07').toISOString().slice(0, 7)
              const thisMonthExp = expenses.filter(e => e.date.startsWith(curMonth)).reduce((s, e) => s + e.amount, 0)

              // Analytics — by category
              const byCat = EXP_CATS
                .map(c => ({ cat: c, total: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0) }))
                .filter(c => c.total > 0).sort((a, b) => b.total - a.total)

              // Analytics — by property
              const byProp = [...new Set(expenses.map(e => e.property))]
                .map(p => ({ prop: p, total: expenses.filter(e => e.property === p).reduce((s, e) => s + e.amount, 0) }))
                .sort((a, b) => b.total - a.total)
              const maxProp = Math.max(...byProp.map(p => p.total), 1)

              // Analytics — monthly trend (last 6 months)
              const anchor = new Date('2026-03-07')
              const last6 = Array.from({ length: 6 }, (_, i) => {
                const d   = new Date(anchor.getFullYear(), anchor.getMonth() - (5 - i), 1)
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                const lbl = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                const tot = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0)
                return { key, lbl, tot }
              })
              const maxTrend = Math.max(...last6.map(m => m.tot), 1)

              // Export CSV
              function exportCSV() {
                const header = 'Date,Description,Category,Property,Amount,Recurring,Notes,Receipt'
                const rows   = expenses.map(e => [e.date, `"${e.desc}"`, e.category, `"${e.property}"`, e.amount, e.recurring, `"${e.notes}"`, e.receiptName].join(','))
                const blob   = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
                const a      = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'expenses.csv' })
                a.click(); URL.revokeObjectURL(a.href)
              }

              const iStyle = { width: '100%', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px 14px', color: 'var(--sr-text)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', outline: 'none' }
              const lStyle = { display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: 6 }
              const canAdd = newExp.date && newExp.desc.trim() && newExp.amount

              return (
                <div>
                  {/* ── Header ── */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div className="hd-page-title">Expenses</div>
                      <div className="hd-page-sub">Track costs, analyse spending trends, and export reports for tax time.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={exportCSV} style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', color: 'var(--sr-text)', borderRadius: 10, padding: '9px 16px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', display: 'flex', alignItems: 'center', gap: 6 }}>⬇ Export CSV</button>
                      <button onClick={() => setExpenseModal(true)} style={{ background: 'var(--sr-orange)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>+ Add Expense</button>
                    </div>
                  </div>

                  {/* ── Profit Overview ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
                    {[
                      { label: 'Total Revenue',  val: `$${MOCK_REVENUE.toLocaleString()}`,                                              hint: 'From earnings',                   icon: '📈', color: 'var(--sr-green)' },
                      { label: 'Total Expenses', val: `$${totalExp.toLocaleString()}`,                                                  hint: 'All recorded',                    icon: '💸', color: '#EF4444'         },
                      { label: 'Net Profit',     val: `${netProfit < 0 ? '-' : ''}$${Math.abs(netProfit).toLocaleString()}`,            hint: netProfit >= 0 ? 'Profit' : 'Loss', icon: netProfit >= 0 ? '✅' : '⚠️', color: netProfit >= 0 ? 'var(--sr-green)' : '#EF4444' },
                    ].map(({ label, val, hint, icon, color }) => (
                      <div key={label} className="hd-stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div className="hd-stat-label" style={{ margin: 0 }}>{label}</div>
                          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                        </div>
                        <div className="hd-stat-val" style={{ marginBottom: 4, fontSize: '1.8rem', color }}>{val}</div>
                        <div className="hd-stat-hint">{hint}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── Stats row ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                    {[
                      { label: 'Total Recorded', val: `$${totalExp.toLocaleString()}`,                                  hint: 'All time',    icon: '🧾' },
                      { label: 'This Month',     val: `$${thisMonthExp.toLocaleString()}`,                              hint: 'March 2026',  icon: '📅' },
                      { label: 'Recurring',      val: expenses.filter(e => e.recurring !== 'none').length,              hint: 'Active items', icon: '🔄' },
                      { label: 'Categories',     val: byCat.length,                                                     hint: 'In use',      icon: '🏷️' },
                    ].map(({ label, val, hint, icon }) => (
                      <div key={label} className="hd-stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div className="hd-stat-label" style={{ margin: 0 }}>{label}</div>
                          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                        </div>
                        <div className="hd-stat-val" style={{ marginBottom: 4, fontSize: '1.8rem' }}>{val}</div>
                        <div className="hd-stat-hint">{hint}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── Analytics ── */}
                  <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ fontFamily: 'var(--sr-font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Analytics</div>
                      <div style={{ display: 'flex', background: 'var(--sr-surface)', borderRadius: 10, padding: 3, gap: 2 }}>
                        {[['category', 'By Category'], ['property', 'By Property'], ['trend', 'Monthly Trend']].map(([tab, lbl]) => (
                          <button key={tab} onClick={() => setExpAnalyticsTab(tab)} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: expAnalyticsTab === tab ? 'var(--sr-orange)' : 'transparent', color: expAnalyticsTab === tab ? 'white' : 'var(--sr-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.15s' }}>{lbl}</button>
                        ))}
                      </div>
                    </div>

                    {expAnalyticsTab === 'category' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {byCat.length === 0 && <div style={{ color: 'var(--sr-sub)', fontSize: '0.84rem' }}>No expenses recorded yet.</div>}
                        {byCat.map(({ cat, total }) => (
                          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 110, fontSize: '0.78rem', color: 'var(--sr-text)', fontWeight: 600, flexShrink: 0 }}>{cat}</div>
                            <div style={{ flex: 1, height: 8, background: 'var(--sr-surface)', borderRadius: 100, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(total / totalExp * 100).toFixed(1)}%`, background: 'var(--sr-orange)', borderRadius: 100 }} />
                            </div>
                            <div style={{ width: 70, textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: 'var(--sr-text)', flexShrink: 0 }}>${total.toLocaleString()}</div>
                            <div style={{ width: 38, textAlign: 'right', fontSize: '0.72rem', color: 'var(--sr-sub)', flexShrink: 0 }}>{(total / totalExp * 100).toFixed(0)}%</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {expAnalyticsTab === 'property' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {byProp.map(({ prop, total }) => (
                          <div key={prop} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 140, fontSize: '0.78rem', color: 'var(--sr-text)', fontWeight: 600, flexShrink: 0 }}>{prop}</div>
                            <div style={{ flex: 1, height: 8, background: 'var(--sr-surface)', borderRadius: 100, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(total / maxProp * 100).toFixed(1)}%`, background: '#5A9FD4', borderRadius: 100 }} />
                            </div>
                            <div style={{ width: 70, textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: 'var(--sr-text)', flexShrink: 0 }}>${total.toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {expAnalyticsTab === 'trend' && (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140, paddingBottom: 4 }}>
                        {last6.map(({ key, lbl, tot }) => (
                          <div key={key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--sr-text)', minHeight: 14 }}>{tot > 0 ? `$${tot}` : ''}</div>
                            <div style={{ width: '100%', background: tot > 0 ? 'var(--sr-orange)' : 'var(--sr-surface)', borderRadius: '5px 5px 0 0', height: `${Math.max(tot / maxTrend * 100, tot > 0 ? 4 : 2)}px`, transition: 'height 0.3s' }} />
                            <div style={{ fontSize: '0.65rem', color: 'var(--sr-sub)', fontWeight: 600, whiteSpace: 'nowrap' }}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Table + Filters ── */}
                  <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--sr-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontFamily: 'var(--sr-font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--sr-text)' }}>All Expenses</div>
                        <select value={expPropFilter} onChange={ev => setExpPropFilter(ev.target.value)} style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 8, padding: '5px 10px', color: 'var(--sr-text)', fontSize: '0.78rem', fontFamily: 'var(--sr-font-sans)', outline: 'none', cursor: 'pointer' }}>
                          <option value="all">All Properties</option>
                          {[...new Set([...expenses.map(e => e.property), ...listings.map(l => l.title || 'Untitled')].filter(Boolean))].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                        {['all', ...EXP_CATS].map(cat => (
                          <button key={cat} onClick={() => setExpCatFilter(cat)} style={{ padding: '4px 11px', borderRadius: 100, border: '1px solid var(--sr-border)', background: expCatFilter === cat ? 'var(--sr-orange)' : 'var(--sr-card2)', color: expCatFilter === cat ? 'white' : 'var(--sr-muted)', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                            {cat === 'all' ? 'All' : cat}
                          </button>
                        ))}
                        <button onClick={() => setAddCatModal(true)} style={{ padding: '4px 10px', borderRadius: 100, border: '1px dashed var(--sr-border)', background: 'transparent', color: 'var(--sr-sub)', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>+ Custom</button>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--sr-border)' }}>
                            {['Date', 'Description', 'Category', 'Property', 'Recurring', 'Amount', ''].map(h => (
                              <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {catFiltered.map((e, i) => (
                            <tr key={e.id} style={{ borderBottom: '1px solid var(--sr-border)', background: i % 2 === 1 ? 'var(--sr-surface)' : 'transparent' }}>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--sr-sub)', whiteSpace: 'nowrap' }}>{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                              <td style={{ padding: '12px 16px', fontSize: '0.84rem', color: 'var(--sr-text)', fontWeight: 500, maxWidth: 260 }}>
                                <div>{e.desc}</div>
                                {e.notes      && <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginTop: 2 }}>{e.notes}</div>}
                                {e.receiptName && <div style={{ fontSize: '0.7rem', color: 'var(--sr-blue)', marginTop: 2 }}>📎 {e.receiptName}</div>}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ background: 'var(--sr-surface)', border: '1px solid var(--sr-border)', borderRadius: 100, padding: '3px 10px', fontSize: '0.68rem', color: 'var(--sr-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{e.category}</span>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--sr-sub)', whiteSpace: 'nowrap' }}>{e.property}</td>
                              <td style={{ padding: '12px 16px' }}>
                                {e.recurring !== 'none' && <span style={{ background: 'rgba(90,159,212,0.12)', border: '1px solid rgba(90,159,212,0.25)', borderRadius: 100, padding: '3px 9px', fontSize: '0.66rem', color: 'var(--sr-blue)', fontWeight: 700, whiteSpace: 'nowrap' }}>🔄 {e.recurring === 'monthly' ? 'Monthly' : 'Yearly'}</span>}
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--sr-text)', whiteSpace: 'nowrap' }}>${e.amount.toLocaleString()}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <button onClick={() => setExpenses(prev => prev.filter(x => x.id !== e.id))} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', cursor: 'pointer', fontSize: '0.9rem', padding: '2px 6px' }} title="Delete">✕</button>
                              </td>
                            </tr>
                          ))}
                          {catFiltered.length === 0 && (
                            <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>No expenses match your filters. <button onClick={() => { setExpCatFilter('all'); setExpPropFilter('all') }} style={{ background: 'none', border: 'none', color: 'var(--sr-orange)', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>Clear filters</button></td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {catFiltered.length > 0 && (
                      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--sr-border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--sr-sub)' }}>Filtered total:</span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--sr-text)' }}>${catFiltered.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* ── Add Expense Modal ── */}
                  {expenseModal && (
                    <div onClick={ev => ev.target === ev.currentTarget && setExpenseModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                          <div style={{ fontFamily: 'var(--sr-font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--sr-text)' }}>Add Expense</div>
                          <button onClick={() => setExpenseModal(false)} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div><label style={lStyle}>Date *</label><input type="date" value={newExp.date} onChange={ev => setNewExp(p => ({ ...p, date: ev.target.value }))} style={iStyle} /></div>
                            <div><label style={lStyle}>Amount ($) *</label><input type="number" min="0" step="0.01" placeholder="0.00" value={newExp.amount} onChange={ev => setNewExp(p => ({ ...p, amount: ev.target.value }))} style={iStyle} /></div>
                          </div>
                          <div><label style={lStyle}>Description *</label><input type="text" placeholder="e.g. Professional cleaning service" value={newExp.desc} onChange={ev => setNewExp(p => ({ ...p, desc: ev.target.value }))} style={iStyle} /></div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={lStyle}>Category</label>
                              <select value={newExp.category} onChange={ev => setNewExp(p => ({ ...p, category: ev.target.value }))} style={iStyle}>
                                {EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label style={lStyle}>Property</label>
                              <select value={newExp.property} onChange={ev => setNewExp(p => ({ ...p, property: ev.target.value }))} style={iStyle}>
                                <option value="All Properties">All Properties</option>
                                {listings.map(l => <option key={l.id} value={l.title || l.id}>{l.title || 'Untitled'}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label style={lStyle}>Recurring</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {[['none', 'One-time'], ['monthly', '🔄 Monthly'], ['yearly', '🔄 Yearly']].map(([val, lbl]) => (
                                <button key={val} onClick={() => setNewExp(p => ({ ...p, recurring: val }))} style={{ flex: 1, padding: '9px 6px', borderRadius: 9, border: `1.5px solid ${newExp.recurring === val ? 'var(--sr-orange)' : 'var(--sr-border)'}`, background: newExp.recurring === val ? 'rgba(244,96,26,0.1)' : 'var(--sr-card2)', color: newExp.recurring === val ? 'var(--sr-orange)' : 'var(--sr-muted)', fontWeight: 600, fontSize: '0.76rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.15s' }}>{lbl}</button>
                              ))}
                            </div>
                          </div>
                          <div><label style={lStyle}>Notes</label><textarea rows={2} placeholder="Optional notes..." value={newExp.notes} onChange={ev => setNewExp(p => ({ ...p, notes: ev.target.value }))} style={{ ...iStyle, resize: 'vertical', minHeight: 56 }} /></div>
                          <div>
                            <label style={lStyle}>Receipt (image or PDF)</label>
                            <div onClick={() => document.getElementById('receipt-upload').click()} style={{ border: '1.5px dashed var(--sr-border)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--sr-card2)' }}>
                              <span style={{ fontSize: '1.3rem' }}>📎</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sr-text)' }}>{newExp.receiptName || 'Click to upload receipt'}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)' }}>JPEG, PNG, or PDF</div>
                              </div>
                              {newExp.receiptName && <button onClick={ev => { ev.stopPropagation(); setNewExp(p => ({ ...p, receiptName: '' })) }} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>}
                            </div>
                            <input id="receipt-upload" type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={ev => { const f = ev.target.files?.[0]; if (f) setNewExp(p => ({ ...p, receiptName: f.name })) }} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                          <button onClick={() => setExpenseModal(false)} style={{ flex: 1, background: 'var(--sr-card2)', color: 'var(--sr-muted)', border: 'none', borderRadius: 10, padding: 12, fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>Cancel</button>
                          <button disabled={!canAdd} onClick={() => { if (!canAdd) return; setExpenses(prev => [{ id: Date.now(), date: newExp.date, desc: newExp.desc.trim(), category: newExp.category, property: newExp.property || 'All Properties', amount: parseFloat(newExp.amount), notes: newExp.notes, recurring: newExp.recurring, receiptName: newExp.receiptName }, ...prev]); setNewExp({ date: '', desc: '', category: 'Cleaning', property: '', amount: '', notes: '', recurring: 'none', receiptName: '' }); setExpenseModal(false); showToast('Expense added.') }} style={{ flex: 2, background: canAdd ? 'var(--sr-orange)' : 'var(--sr-card2)', color: canAdd ? 'white' : 'var(--sr-sub)', border: 'none', borderRadius: 10, padding: 12, fontWeight: 700, fontSize: '0.88rem', cursor: canAdd ? 'pointer' : 'not-allowed', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.15s' }}>Add Expense</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Custom Category Modal ── */}
                  {addCatModal && (
                    <div onClick={ev => ev.target === ev.currentTarget && setAddCatModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 400 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                          <div style={{ fontFamily: 'var(--sr-font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)' }}>Custom Categories</div>
                          <button onClick={() => setAddCatModal(false)} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                          <input type="text" placeholder="e.g. Property Management" value={newCatName} onChange={ev => setNewCatName(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter' && newCatName.trim()) { setCustomCats(p => [...p, newCatName.trim()]); setNewCatName('') }}} style={{ flex: 1, ...iStyle }} />
                          <button onClick={() => { if (newCatName.trim()) { setCustomCats(p => [...p, newCatName.trim()]); setNewCatName('') }}} style={{ background: 'var(--sr-orange)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>Add</button>
                        </div>
                        {customCats.length === 0
                          ? <div style={{ color: 'var(--sr-sub)', fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>No custom categories yet.</div>
                          : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {customCats.map((cat, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--sr-surface)', borderRadius: 8, padding: '8px 12px' }}>
                                  <span style={{ fontSize: '0.84rem', color: 'var(--sr-text)', fontWeight: 500 }}>{cat}</span>
                                  <button onClick={() => setCustomCats(p => p.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
                                </div>
                              ))}
                            </div>
                        }
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ========== ROLES & PERMISSIONS ========== */}
            {activeNav === 'permissions' && (
              <div>
                <div className="hd-page-title">Roles &amp; Permissions</div>
                <div className="hd-page-sub">Understand what each role can access and manage within your organisation.</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                  {[
                    { role: 'Owner',   color: '#F4601A', icon: '👑', desc: 'Full access to all features and settings' },
                    { role: 'Manager', color: '#60a5fa', icon: '🔵', desc: 'Manage listings, bookings, and guests' },
                    { role: 'Staff',   color: '#4ade80', icon: '🟢', desc: 'Handle bookings and guest communication' },
                    { role: 'Finance', color: '#fcd34d', icon: '💛', desc: 'View and manage earnings and payouts' },
                  ].map(({ role, color, icon, desc }) => (
                    <div key={role} style={{ background: 'var(--sr-card)', border: `1px solid ${color}22`, borderRadius: 14, padding: '18px' }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{icon}</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{role}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--sr-sub)', lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--sr-border)' }}>
                    <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Permission Matrix</div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--sr-border)' }}>
                          <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', width: '32%' }}>Permission</th>
                          {['Owner','Manager','Staff','Finance'].map(r => (
                            <th key={r} style={{ padding: '12px 20px', textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)' }}>{r}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { perm: 'View listings',       owner: '✓', manager: '✓', staff: '✓',    finance: 'View' },
                          { perm: 'Edit listings',       owner: '✓', manager: '✓', staff: '✗',    finance: '✗' },
                          { perm: 'Create listings',     owner: '✓', manager: '✓', staff: '✗',    finance: '✗' },
                          { perm: 'Manage bookings',     owner: '✓', manager: '✓', staff: '✓',    finance: 'View' },
                          { perm: 'View calendar',       owner: '✓', manager: '✓', staff: '✓',    finance: '✗' },
                          { perm: 'Reply to guests',     owner: '✓', manager: '✓', staff: '✓',    finance: '✗' },
                          { perm: 'View earnings',       owner: '✓', manager: '✓', staff: '✗',    finance: '✓' },
                          { perm: 'Manage payouts',      owner: '✓', manager: '✗', staff: '✗',    finance: '✓' },
                          { perm: 'Export reports',      owner: '✓', manager: '✗', staff: '✗',    finance: '✓' },
                          { perm: 'Invite team members', owner: '✓', manager: '✗', staff: '✗',    finance: '✗' },
                          { perm: 'Manage team roles',   owner: '✓', manager: '✗', staff: '✗',    finance: '✗' },
                          { perm: 'Account settings',    owner: '✓', manager: '✗', staff: '✗',    finance: '✗' },
                        ].map(({ perm, owner, manager, staff, finance }, i) => {
                          const cellColor = v => v === '✓' ? '#4ade80' : v === '✗' ? 'var(--sr-muted)' : '#60a5fa'
                          return (
                            <tr key={perm} style={{ borderBottom: '1px solid var(--sr-border)', background: i % 2 === 1 ? 'var(--sr-overlay-xs)' : 'transparent' }}>
                              <td style={{ padding: '12px 24px', fontSize: '0.83rem', color: 'var(--sr-text)', fontWeight: 500 }}>{perm}</td>
                              {[owner, manager, staff, finance].map((v, j) => (
                                <td key={j} style={{ padding: '12px 20px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: cellColor(v) }}>{v}</td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* ── Custom Roles (owner only) ── */}
                {myRole === 'owner' && (() => {
                  const PERM_LABELS = {
                    bookings: 'Bookings', properties: 'Properties', calendar: 'Calendar',
                    messages: 'Messages', earnings: 'Earnings', payouts: 'Payouts',
                    activity: 'Activity Log', reviews: 'Reviews',
                  }
                  const ALL_PERMS = Object.keys(PERM_LABELS)
                  return (
                    <div style={{ marginTop: 28 }}>
                      <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.15rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 6 }}>Custom Roles</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--sr-sub)', marginBottom: 20 }}>Create roles with a specific set of permissions for your organisation.</div>

                      {/* Existing custom roles */}
                      {customRoles.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                          {customRoles.map(cr => (
                            <div key={cr.id} style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 8 }}>🎨 {cr.name}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {(cr.permissions || []).map(p => (
                                    <span key={p} style={{ background: 'rgba(192,132,252,0.12)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 100, padding: '2px 10px', fontSize: '0.68rem', fontWeight: 600 }}>
                                      {PERM_LABELS[p] || p}
                                    </span>
                                  ))}
                                  {!cr.permissions?.length && <span style={{ fontSize: '0.74rem', color: 'var(--sr-muted)' }}>No permissions assigned</span>}
                                </div>
                              </div>
                              <button onClick={() => deleteCustomRole(cr.id)} style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--sr-font-sans)' }}>
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Create new role form */}
                      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, padding: '20px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: 14 }}>Create New Role</div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: 6 }}>Role Name</label>
                          <input type="text" placeholder="e.g. Concierge, Cleaner, Supervisor…" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} maxLength={40} style={{ width: '100%', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px 14px', color: 'var(--sr-text)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', outline: 'none' }} />
                        </div>
                        <div style={{ marginBottom: 18 }}>
                          <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: 10 }}>Permissions</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                            {ALL_PERMS.map(p => {
                              const checked = newRolePerms.includes(p)
                              return (
                                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, background: checked ? 'rgba(192,132,252,0.1)' : 'var(--sr-card2)', border: `1px solid ${checked ? 'rgba(192,132,252,0.4)' : 'var(--sr-border)'}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s' }}>
                                  <input type="checkbox" checked={checked} onChange={e => setNewRolePerms(prev => e.target.checked ? [...prev, p] : prev.filter(x => x !== p))} style={{ accentColor: '#c084fc', width: 14, height: 14 }} />
                                  <span style={{ fontSize: '0.76rem', fontWeight: 600, color: checked ? '#c084fc' : 'var(--sr-text)' }}>{PERM_LABELS[p]}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                        <button onClick={createCustomRole} disabled={!newRoleName.trim() || newRoleSaving} style={{ background: !newRoleName.trim() || newRoleSaving ? 'var(--sr-card2)' : '#c084fc', color: !newRoleName.trim() || newRoleSaving ? 'var(--sr-sub)' : '#0a0507', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: '0.84rem', cursor: !newRoleName.trim() || newRoleSaving ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.15s' }}>
                          {newRoleSaving ? 'Creating…' : 'Create Role'}
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ========== PROPERTY ACCESS ========== */}
            {activeNav === 'access' && (() => {
              const nonOwners = (teamData?.members || []).filter(m => m.status === 'active' && m.role !== 'owner')
              const totalMembers = nonOwners.length
              const pendingAccess = listings.filter(l => nonOwners.every(m => m.allowed_listing_ids && !m.allowed_listing_ids.includes(l.id))).length
              const accessConfigured = listings.filter(l => nonOwners.some(m => !m.allowed_listing_ids || m.allowed_listing_ids.includes(l.id))).length

              // Per-listing access helpers
              const getMembersWithAccess = (l) => nonOwners.filter(m => !m.allowed_listing_ids || m.allowed_listing_ids.includes(l.id))
              const getAccessTier = (l) => {
                const n = getMembersWithAccess(l).length
                if (n === 0 || totalMembers === 0) return 'none'
                if (n === totalMembers) return 'full'
                return 'partial'
              }

              const filteredListings = listings.filter(l => accessFilter === 'all' || getAccessTier(l) === accessFilter)

              // Avatar colours cycle
              const AV_COLORS = ['#5B8FD8','#D4612A','#3D7A5E','#8B5D8B','#8B7355','#C05525','#2D6B9E']
              const getAvatarStyle = (i) => ({ background: AV_COLORS[i % AV_COLORS.length] })

              return (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <div className="hd-page-title">Property Access</div>
                    <div className="hd-page-sub">Control which team members can access and manage each property.</div>
                  </div>
                  {myRole === 'owner' && (
                    <button onClick={() => setInviteModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontFamily: 'var(--sr-font-sans)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0 }}>
                      + Add Member
                    </button>
                  )}
                </div>

                {/* Loading */}
                {teamLoading && !teamData && (
                  <div style={{ color: 'var(--sr-sub)', fontSize: '0.88rem', padding: '40px 0' }}>Loading…</div>
                )}

                {/* Stats pills */}
                {(teamData || !teamLoading) && (
                  <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
                    {[
                      { icon: '🏠', num: listings.length, lbl: 'Total Properties', color: 'var(--sr-orange)' },
                      { icon: '✅', num: accessConfigured, lbl: 'Access Configured', color: '#3D7A5E' },
                      { icon: '👥', num: totalMembers, lbl: 'Team Members', color: '#5B8FD8' },
                      { icon: '🔑', num: pendingAccess, lbl: 'No Access Set', color: '#8B5D8B' },
                    ].map(s => (
                      <div key={s.lbl} style={{ flex: 1, background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'default', transition: 'all 0.15s' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--sr-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{s.icon}</div>
                        <div>
                          <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.4rem', fontWeight: 600, lineHeight: 1, color: 'var(--sr-text)' }}>{s.num}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--sr-sub)', marginTop: 2 }}>{s.lbl}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Filters + view toggle */}
                {(teamData || !teamLoading) && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                    <div style={{ display: 'flex', gap: 3, background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: 4 }}>
                      {[['all','All Properties'],['full','Full Access'],['partial','Partial Access'],['none','No Access']].map(([v,l]) => (
                        <button key={v} onClick={() => setAccessFilter(v)}
                          style={{ padding: '6px 14px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600, color: accessFilter === v ? '#fff' : 'var(--sr-sub)', background: accessFilter === v ? 'var(--sr-text)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.12s' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 3, background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: 4 }}>
                      {[['grid','⊞'],['list','≡']].map(([v,icon]) => (
                        <button key={v} onClick={() => setAccessView(v)}
                          style={{ width: 32, height: 32, borderRadius: 7, border: 'none', background: accessView === v ? 'var(--sr-text)' : 'transparent', color: accessView === v ? '#fff' : 'var(--sr-sub)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}>
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Property Cards Grid */}
                {teamData && (
                  <div style={{ display: accessView === 'grid' ? 'grid' : 'flex', gridTemplateColumns: accessView === 'grid' ? 'repeat(3, 1fr)' : undefined, flexDirection: accessView === 'list' ? 'column' : undefined, gap: 18 }}>
                    {filteredListings.map((l, idx) => {
                      const withAccess = getMembersWithAccess(l)
                      const tier = getAccessTier(l)
                      const img = Array.isArray(l.images) && l.images[0]
                      const visible = withAccess.slice(0, 3)
                      const extra = withAccess.length - visible.length

                      const badgeStyle = tier === 'full'
                        ? { background: 'rgba(244,96,26,0.92)', color: '#fff' }
                        : tier === 'partial'
                        ? { background: 'rgba(61,122,94,0.92)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.88)', color: 'var(--sr-sub)' }

                      const badgeLabel = tier === 'full' ? 'Full Access' : tier === 'partial' ? `${withAccess.length} Member${withAccess.length !== 1 ? 's' : ''}` : 'No Access'

                      // Gradient backgrounds when no image
                      const gradients = ['linear-gradient(135deg,#D8C9B5,#C5B29D)','linear-gradient(135deg,#B8C9BE,#99B5A2)','linear-gradient(135deg,#C9C1D4,#B0A7C5)','linear-gradient(135deg,#D4BEB8,#C2A89D)','linear-gradient(135deg,#C5C9B5,#AEB59A)','linear-gradient(135deg,#C9BDB4,#B8A89C)']

                      return (
                        <div key={l.id}
                          style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', display: accessView === 'list' ? 'flex' : 'block', alignItems: accessView === 'list' ? 'center' : undefined }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(244,96,26,0.25)' }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--sr-border)' }}
                          onClick={() => myRole === 'owner' && setPropAccessModal(l)}
                        >
                          {/* Image */}
                          <div style={{ position: 'relative', height: accessView === 'list' ? 72 : 148, width: accessView === 'list' ? 100 : '100%', flexShrink: 0, overflow: 'hidden', background: img ? `url(${img}) center/cover no-repeat` : gradients[idx % gradients.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {!img && <span style={{ fontSize: '2rem' }}>{l.type === 'hotel' ? '🏨' : l.city?.includes('Beach') || l.city?.includes('Miami') ? '🏖️' : l.city?.includes('Vegas') ? '🎰' : '🏠'}</span>}
                            {/* Access badge */}
                            <div style={{ position: 'absolute', top: 8, right: 8, ...badgeStyle, backdropFilter: 'blur(8px)', borderRadius: 20, padding: '4px 10px', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', opacity: 0.7 }} />
                              {badgeLabel}
                            </div>
                          </div>

                          {/* Body */}
                          <div style={{ padding: accessView === 'list' ? '0 16px' : '15px 16px 16px', flex: 1 }}>
                            <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '0.95rem', fontWeight: 600, color: 'var(--sr-text)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{l.title || 'Untitled'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--sr-muted)', marginBottom: accessView === 'list' ? 0 : 12, display: 'flex', alignItems: 'center', gap: 3 }}>📍 {l.city}{l.state ? `, ${l.state}` : ''}</div>

                            {accessView === 'grid' && (
                              <>
                                <div style={{ height: 1, background: 'var(--sr-border)', marginBottom: 12 }} />
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  {/* Member avatars */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {withAccess.length > 0 ? (
                                      <>
                                        <div style={{ display: 'flex' }}>
                                          {visible.map((m, i) => {
                                            const ini = m.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || '?'
                                            return (
                                              <div key={m.id} title={m.full_name || m.email} style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--sr-card)', ...getAvatarStyle(i), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 700, color: '#fff', marginLeft: i > 0 ? -5 : 0 }}>
                                                {ini}
                                              </div>
                                            )
                                          })}
                                          {extra > 0 && (
                                            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--sr-card)', background: 'var(--sr-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.52rem', fontWeight: 700, color: 'var(--sr-sub)', marginLeft: -5 }}>+{extra}</div>
                                          )}
                                        </div>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--sr-sub)' }}>{withAccess.length} member{withAccess.length !== 1 ? 's' : ''}</span>
                                      </>
                                    ) : (
                                      <span style={{ fontSize: '0.68rem', color: 'var(--sr-muted)' }}>No members assigned</span>
                                    )}
                                  </div>
                                  {/* Actions */}
                                  {myRole === 'owner' && (
                                    <div style={{ display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
                                      <button
                                        onClick={() => setPropAccessModal(l)}
                                        style={{ background: 'var(--sr-text)', border: '1px solid var(--sr-text)', borderRadius: 7, padding: '5px 12px', fontSize: '0.68rem', fontWeight: 600, color: 'var(--sr-bg)', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.12s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--sr-orange)'; e.currentTarget.style.borderColor = 'var(--sr-orange)' }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--sr-text)'; e.currentTarget.style.borderColor = 'var(--sr-text)' }}
                                      >
                                        Manage
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* List view actions */}
                          {accessView === 'list' && myRole === 'owner' && (
                            <div style={{ padding: '0 16px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setPropAccessModal(l)}
                                style={{ background: 'var(--sr-text)', border: '1px solid var(--sr-text)', borderRadius: 7, padding: '6px 14px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--sr-bg)', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}
                              >
                                Manage
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Empty filtered state */}
                    {filteredListings.length === 0 && listings.length > 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>No properties match this filter.</div>
                    )}

                    {/* Add property card — owner + grid view */}
                    {myRole === 'owner' && accessView === 'grid' && accessFilter === 'all' && (
                      <a href="/list-property" style={{ border: '2px dashed var(--sr-border)', background: 'transparent', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 230, textAlign: 'center', padding: 32, cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sr-orange)'; e.currentTarget.style.background = 'rgba(244,96,26,0.04)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sr-border)'; e.currentTarget.style.background = 'transparent' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--sr-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: 10, color: 'var(--sr-sub)', transition: 'all 0.2s' }}>＋</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--sr-sub)', marginBottom: 3 }}>Add New Property</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sr-muted)' }}>List your space on SnapReserve™</div>
                      </a>
                    )}

                    {/* No properties at all */}
                    {listings.length === 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>No properties yet.</div>
                    )}
                  </div>
                )}

                {!teamLoading && !teamData && (
                  <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, padding: '40px', textAlign: 'center', maxWidth: 480 }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏢</div>
                    <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 8 }}>No organisation</div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--sr-sub)', lineHeight: 1.6 }}>Property access control is only available for host organisations.</div>
                  </div>
                )}
              </div>
              )
            })()}

            {/* ========== ACTIVITY LOG ========== */}
            {activeNav === 'activity' && (
              <div>
                <div className="hd-page-title">Activity Log</div>
                <div className="hd-page-sub">A record of recent team and property actions.</div>

                {teamData && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                    {[
                      { label: 'Members Invited', val: teamData.members?.length || 0,                                                    hint: 'Total invites sent' },
                      { label: 'Active Members',  val: teamData.members?.filter(m => m.status === 'active').length || 0,                 hint: 'Currently active' },
                      { label: 'Pending Invites', val: teamData.members?.filter(m => m.status === 'pending').length || 0,                hint: 'Awaiting acceptance' },
                    ].map(({ label, val, hint }) => (
                      <div key={label} className="hd-stat-card">
                        <div className="hd-stat-label">{label}</div>
                        <div className="hd-stat-val">{val}</div>
                        <div className="hd-stat-hint">{hint}</div>
                      </div>
                    ))}
                  </div>
                )}

                {(teamLoading && !teamData) && (
                  <div style={{ color: 'var(--sr-sub)', fontSize: '0.88rem', padding: '40px 0' }}>Loading…</div>
                )}

                <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--sr-border)' }}>
                    <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Recent Activity</div>
                  </div>
                  <div style={{ padding: '0 24px' }}>
                    {activityLoading ? (
                      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>Loading activity…</div>
                    ) : (() => {
                      const teamEvs = (teamData?.members || [])
                        .flatMap(m => {
                          const evs = []
                          if (m.invited_at) evs.push({ id: `t-inv-${m.id}-${m.invited_at}`, label: `${m.full_name || m.invite_email || m.email || 'Unknown'} — Invited as ${m.role}`, sub: '', at: m.invited_at, icon: '📨' })
                          if (m.accepted_at) evs.push({ id: `t-acc-${m.id}-${m.accepted_at}`, label: `${m.full_name || m.invite_email || m.email || 'Unknown'} — Accepted invitation`, sub: '', at: m.accepted_at, icon: '✅' })
                          return evs
                        })
                      const bookingEvs = (activityEvents || []).map(e => ({ id: e.id, label: e.label, sub: e.sub, at: e.at, icon: e.icon }))
                      const merged = [...teamEvs, ...bookingEvs].sort((a, b) => new Date(b.at) - new Date(a.at))
                      if (merged.length === 0) {
                        return (
                          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>
                            No activity yet. Bookings and team actions will appear here.
                          </div>
                        )
                      }
                      return merged.map((ev, i) => (
                        <div key={ev.id || i} style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: i < merged.length - 1 ? '1px solid var(--sr-border)' : 'none', alignItems: 'flex-start' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>{ev.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.84rem', color: 'var(--sr-text)', fontWeight: 600 }}>{ev.label}</div>
                            {ev.sub ? <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginTop: 3 }}>{ev.sub}</div> : null}
                            <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginTop: 3 }}>
                              {new Date(ev.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* ========== PROMOTIONS ========== */}
            {activeNav === 'promotions' && (() => {
              const activePromos   = promotions.filter(p => p.is_active)
              const totalUses      = promotions.reduce((s, p) => s + (p.total_uses || 0), 0)
              const totalDiscount  = promotions.reduce((s, p) => s + (p.total_discount_given || 0), 0)

              function openCreate() {
                setEditingPromo(null)
                setPromoForm({ code: '', name: '', description: '', discount_type: 'percentage', discount_value: '', min_nights: 1, min_booking_amount: 0, max_uses: '', is_active: true, auto_apply: false, starts_at: '', ends_at: '', listing_scope: 'all', listing_ids: [] })
                setPromoModal(true)
              }
              function openEdit(p) {
                setEditingPromo(p)
                setPromoForm({
                  code: p.code, name: p.name, description: p.description || '', discount_type: p.discount_type,
                  discount_value: p.discount_value, min_nights: p.min_nights || 1,
                  min_booking_amount: p.min_booking_amount || 0, max_uses: p.max_uses || '',
                  is_active: p.is_active, auto_apply: p.auto_apply,
                  starts_at: p.starts_at ? p.starts_at.slice(0, 10) : '',
                  ends_at:   p.ends_at   ? p.ends_at.slice(0, 10)   : '',
                  listing_scope: !p.listing_ids?.length ? 'all' : p.listing_ids.length === 1 ? 'specific' : 'multiple',
                  listing_ids: p.listing_ids || [],
                })
                setPromoModal(true)
              }
              async function savePromo() {
                if (!promoForm.code.trim() || !promoForm.name.trim() || !promoForm.discount_value) return
                setPromoSaving(true)
                try {
                  const body = {
                    ...promoForm,
                    code:               promoForm.code.trim().toUpperCase(),
                    discount_value:     Number(promoForm.discount_value),
                    min_nights:         Number(promoForm.min_nights) || 1,
                    min_booking_amount: Number(promoForm.min_booking_amount) || 0,
                    max_uses:           promoForm.max_uses ? Number(promoForm.max_uses) : null,
                    starts_at:          promoForm.starts_at || null,
                    ends_at:            promoForm.ends_at   || null,
                    listing_ids:        promoForm.listing_scope === 'all' ? null : promoForm.listing_ids.filter(Boolean),
                  }
                  const url    = editingPromo ? `/api/host/promotions/${editingPromo.id}` : '/api/host/promotions'
                  const method = editingPromo ? 'PATCH' : 'POST'
                  const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                  const data   = await res.json()
                  if (!res.ok) { setPromoToast({ msg: data.error || 'Failed to save', type: 'error' }); setTimeout(() => setPromoToast(null), 3000); return }
                  await loadPromotions()
                  setPromoModal(false)
                  setPromoToast({ msg: editingPromo ? 'Promotion updated' : 'Promotion created', type: 'success' })
                  setTimeout(() => setPromoToast(null), 3000)
                } catch { setPromoToast({ msg: 'Error saving promotion', type: 'error' }); setTimeout(() => setPromoToast(null), 3000) }
                finally { setPromoSaving(false) }
              }
              async function togglePromo(p) {
                const res  = await fetch(`/api/host/promotions/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !p.is_active }) })
                if (res.ok) loadPromotions()
              }
              async function deletePromo(p) {
                if (!confirm(`Delete "${p.name}"?`)) return
                const res  = await fetch(`/api/host/promotions/${p.id}`, { method: 'DELETE' })
                const data = await res.json()
                if (res.ok) { loadPromotions(); setPromoToast({ msg: data.message || 'Promotion removed', type: 'success' }); setTimeout(() => setPromoToast(null), 3000) }
              }

              return (
                <div>
                  {promoToast && (
                    <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, zIndex: 9999, background: promoToast.type === 'error' ? '#EF4444' : '#16A34A', color: 'white' }}>
                      {promoToast.msg}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <div className="hd-page-title">Promotions</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--sr-sub)', marginBottom: 20 }}>Create discount codes and special offers for your listings</div>
                    </div>
                    <button onClick={openCreate} style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--sr-orange)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>
                      + New Promotion
                    </button>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                    {[
                      { label: 'Total Promos',     value: promotions.length,              icon: '🏷️' },
                      { label: 'Active',            value: activePromos.length,            icon: '✅' },
                      { label: 'Total Uses',        value: totalUses,                      icon: '📊' },
                      { label: 'Discounts Given',   value: `$${totalDiscount.toFixed(0)}`, icon: '💸' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, padding: '16px 18px' }}>
                        <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{s.icon}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--sr-text)', fontFamily: 'var(--sr-font-display)' }}>{s.value}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Table */}
                  {!promoLoaded ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sr-muted)', fontSize: '0.86rem' }}>Loading…</div>
                  ) : promotions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏷️</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>No promotions yet</div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--sr-muted)', marginBottom: 20 }}>Create discount codes to attract guests and boost bookings.</div>
                      <button onClick={openCreate} style={{ padding: '10px 24px', borderRadius: 10, background: 'var(--sr-orange)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>Create first promotion</button>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--sr-border)' }}>
                            {['Code', 'Name', 'Discount', 'Applies To', 'Uses', 'Saved', 'Ends', 'Status', ''].map(h => (
                              <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {promotions.map(p => {
                            const isExpired = p.ends_at && new Date(p.ends_at) < new Date()
                            const statusColor = !p.is_active ? '#6B7280' : isExpired ? '#EF4444' : '#16A34A'
                            const statusLabel = !p.is_active ? 'Inactive' : isExpired ? 'Expired' : 'Active'
                            return (
                              <tr key={p.id} style={{ borderBottom: '1px solid var(--sr-border)', opacity: !p.is_active ? 0.6 : 1 }}>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', background: 'var(--sr-surface)', padding: '3px 8px', borderRadius: 6, color: 'var(--sr-orange)' }}>{p.code}</span>
                                </td>
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--sr-text)' }}>{p.name}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--sr-orange)' }}>
                                  {p.discount_type === 'percentage' ? `${p.discount_value}% off` : `$${p.discount_value} off`}
                                </td>
                                <td style={{ padding: '12px 16px', color: 'var(--sr-muted)', fontSize: '0.78rem' }}>
                                  {!p.listing_ids?.length ? (
                                    <span style={{ color: 'var(--sr-sub)' }}>All properties</span>
                                  ) : p.listing_ids.length === 1 ? (
                                    listings.find(l => l.id === p.listing_ids[0])?.title || '1 property'
                                  ) : (
                                    `${p.listing_ids.length} properties`
                                  )}
                                </td>
                                <td style={{ padding: '12px 16px', color: 'var(--sr-muted)' }}>{p.total_uses || 0}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                                <td style={{ padding: '12px 16px', color: '#16A34A', fontWeight: 600 }}>${(p.total_discount_given || 0).toFixed(0)}</td>
                                <td style={{ padding: '12px 16px', color: 'var(--sr-muted)', fontSize: '0.78rem' }}>
                                  {p.ends_at ? new Date(p.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 700, background: `${statusColor}15`, color: statusColor }}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => openEdit(p)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--sr-border)', background: 'none', fontSize: '0.76rem', cursor: 'pointer', color: 'var(--sr-text)', fontFamily: 'var(--sr-font-sans)' }}>Edit</button>
                                    <button onClick={() => togglePromo(p)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--sr-border)', background: 'none', fontSize: '0.76rem', cursor: 'pointer', color: p.is_active ? '#EF4444' : '#16A34A', fontFamily: 'var(--sr-font-sans)' }}>
                                      {p.is_active ? 'Pause' : 'Activate'}
                                    </button>
                                    <button onClick={() => deletePromo(p)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'none', fontSize: '0.76rem', cursor: 'pointer', color: '#EF4444', fontFamily: 'var(--sr-font-sans)' }}>✕</button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Create/Edit Modal */}
                  {promoModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}>
                      <div style={{ background: 'var(--sr-card)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                          <div style={{ fontFamily: 'var(--sr-font-display)', fontSize: '1.3rem', fontWeight: 700 }}>
                            {editingPromo ? 'Edit Promotion' : 'New Promotion'}
                          </div>
                          <button onClick={() => setPromoModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--sr-muted)' }}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {[
                            { label: 'Promo Code *', key: 'code', type: 'text', placeholder: 'e.g. SUMMER20', hint: 'Guests enter this at checkout', disabled: !!editingPromo },
                            { label: 'Name *', key: 'name', type: 'text', placeholder: 'e.g. Summer Sale' },
                            { label: 'Description', key: 'description', type: 'text', placeholder: 'Optional' },
                          ].map(f => (
                            <div key={f.key}>
                              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
                              <input
                                type={f.type}
                                placeholder={f.placeholder}
                                value={promoForm[f.key]}
                                disabled={f.disabled}
                                onChange={e => setPromoForm(p => ({ ...p, [f.key]: f.key === 'code' ? e.target.value.toUpperCase() : e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--sr-border)', background: 'var(--sr-surface)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', color: 'var(--sr-text)', opacity: f.disabled ? 0.6 : 1 }}
                              />
                              {f.hint && <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', marginTop: 3 }}>{f.hint}</div>}
                            </div>
                          ))}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Discount Type *</label>
                              <select value={promoForm.discount_type} onChange={e => setPromoForm(p => ({ ...p, discount_type: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--sr-border)', background: 'var(--sr-surface)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', color: 'var(--sr-text)' }}>
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed ($)</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {promoForm.discount_type === 'percentage' ? 'Percent Off *' : 'Amount Off ($) *'}
                              </label>
                              <input type="number" min="1" max={promoForm.discount_type === 'percentage' ? 100 : undefined} placeholder={promoForm.discount_type === 'percentage' ? '10' : '25'} value={promoForm.discount_value} onChange={e => setPromoForm(p => ({ ...p, discount_value: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--sr-border)', background: 'var(--sr-surface)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', color: 'var(--sr-text)' }} />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Min Nights</label>
                              <input type="number" min="1" value={promoForm.min_nights} onChange={e => setPromoForm(p => ({ ...p, min_nights: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--sr-border)', background: 'var(--sr-surface)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', color: 'var(--sr-text)' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Max Uses</label>
                              <input type="number" min="1" placeholder="Unlimited" value={promoForm.max_uses} onChange={e => setPromoForm(p => ({ ...p, max_uses: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--sr-border)', background: 'var(--sr-surface)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', color: 'var(--sr-text)' }} />
                            </div>
                          </div>
                          {/* Applies To */}
                          <div>
                            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Applies To</label>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                              {[{ v: 'all', l: 'All Properties' }, { v: 'specific', l: 'Specific Property' }, { v: 'multiple', l: 'Multiple Properties' }].map(opt => (
                                <button key={opt.v} type="button" onClick={() => setPromoForm(p => ({ ...p, listing_scope: opt.v, listing_ids: [] }))} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1px solid ${promoForm.listing_scope === opt.v ? 'var(--sr-orange)' : 'var(--sr-border)'}`, background: promoForm.listing_scope === opt.v ? 'rgba(244,96,26,0.08)' : 'var(--sr-surface)', color: promoForm.listing_scope === opt.v ? 'var(--sr-orange)' : 'var(--sr-muted)', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.13s' }}>
                                  {opt.l}
                                </button>
                              ))}
                            </div>
                            {promoForm.listing_scope === 'specific' && (
                              <select value={promoForm.listing_ids[0] || ''} onChange={e => setPromoForm(p => ({ ...p, listing_ids: e.target.value ? [e.target.value] : [] }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--sr-border)', background: 'var(--sr-surface)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', color: 'var(--sr-text)' }}>
                                <option value="">Select a property…</option>
                                {listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                              </select>
                            )}
                            {promoForm.listing_scope === 'multiple' && (
                              <div style={{ border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px 12px', background: 'var(--sr-surface)', maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {listings.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--sr-sub)' }}>No properties found.</div>}
                                {listings.map(l => {
                                  const checked = promoForm.listing_ids.includes(l.id)
                                  return (
                                    <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem', color: 'var(--sr-text)' }}>
                                      <input type="checkbox" checked={checked} onChange={() => setPromoForm(p => ({ ...p, listing_ids: checked ? p.listing_ids.filter(id => id !== l.id) : [...p.listing_ids, l.id] }))} />
                                      {l.title}
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                            {promoForm.listing_scope === 'all' && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--sr-sub)', padding: '6px 0' }}>This code will work on any of your properties.</div>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Start Date</label>
                              <input type="date" value={promoForm.starts_at} onChange={e => setPromoForm(p => ({ ...p, starts_at: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--sr-border)', background: 'var(--sr-surface)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', color: 'var(--sr-text)' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>End Date</label>
                              <input type="date" value={promoForm.ends_at} onChange={e => setPromoForm(p => ({ ...p, ends_at: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--sr-border)', background: 'var(--sr-surface)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', color: 'var(--sr-text)' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 4 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem', color: 'var(--sr-text)' }}>
                              <input type="checkbox" checked={promoForm.is_active} onChange={e => setPromoForm(p => ({ ...p, is_active: e.target.checked }))} />
                              Active
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.84rem', color: 'var(--sr-text)' }}>
                              <input type="checkbox" checked={promoForm.auto_apply} onChange={e => setPromoForm(p => ({ ...p, auto_apply: e.target.checked }))} />
                              Auto-apply via URL
                            </label>
                          </div>
                          {promoForm.auto_apply && promoForm.code && (
                            <div style={{ background: 'var(--sr-surface)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.76rem' }}>
                              <div style={{ fontWeight: 700, color: 'var(--sr-sub)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Auto-apply URL</div>
                              <code style={{ color: 'var(--sr-orange)', wordBreak: 'break-all' }}>/listings/[id]?promo={promoForm.code}</code>
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
                            <button onClick={() => setPromoModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--sr-border)', background: 'none', color: 'var(--sr-text)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>Cancel</button>
                            <button onClick={savePromo} disabled={promoSaving || !promoForm.code.trim() || !promoForm.name.trim() || !promoForm.discount_value} style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: promoSaving ? '#A89880' : 'var(--sr-orange)', color: 'white', fontWeight: 700, cursor: promoSaving ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)' }}>
                              {promoSaving ? 'Saving…' : editingPromo ? 'Save Changes' : 'Create Promotion'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {activeNav === 'settings' && (
              <div>
                <div className="hd-page-title">Settings</div>
                <div className="hd-page-sub">Manage your host profile and account preferences.</div>

                {/* Profile card */}
                <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '16px', padding: '24px', marginBottom: '16px', maxWidth: '560px' }}>
                  <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.05rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: '16px' }}>Profile information</div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
                    <div className="hd-avatar" style={{ width: '52px', height: '52px', fontSize: '1.1rem' }}>{initials}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--sr-text)' }}>{profile?.full_name || '—'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--sr-sub)', marginTop: '2px' }}>{profile?.email || '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { label: 'Full name',  val: profile?.full_name || '—' },
                      { label: 'Email',      val: profile?.email     || '—' },
                      { label: 'Account type', val: 'Host' },
                      { label: 'Member since', val: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—' },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ background: 'var(--sr-card2)', borderRadius: '10px', padding: '12px 14px' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--sr-text)' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Switch to guest — owner only */}
                {myRole === 'owner' && <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '16px', padding: '24px', maxWidth: '560px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: '6px', color: 'var(--sr-text)' }}>
                        Switch to Guest account
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--sr-sub)', lineHeight: 1.6 }}>
                        Stop hosting and browse as a guest. Your listing history is saved — you can re-enable hosting any time from your account settings.
                      </p>
                    </div>
                    <button
                      onClick={() => setSwitchModal(true)}
                      style={{ flexShrink: 0, background: 'var(--sr-redl)', color: 'var(--sr-red)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '9px 18px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', whiteSpace: 'nowrap' }}
                    >
                      Switch account
                    </button>
                  </div>
                </div>}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Invite Team Member modal */}
      {inviteModal && (
        <div onClick={e => e.target === e.currentTarget && !inviteSending && setInviteModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 20, padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.4rem', fontWeight: 700, color: 'var(--sr-text)' }}>Invite Team Member</div>
              <button onClick={() => setInviteModal(false)} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: 8 }}>Email Address</label>
              <input type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} style={{ width: '100%', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '11px 14px', color: 'var(--sr-text)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', outline: 'none' }} />
            </div>

            {/* Role selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: 10 }}>Select Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { value: 'manager', label: 'Manager', icon: '🔵', color: '#60a5fa', desc: 'Manage listings & bookings' },
                  { value: 'staff',   label: 'Staff',   icon: '🟢', color: '#4ade80', desc: 'Handle bookings & guests' },
                  { value: 'finance', label: 'Finance', icon: '💛', color: '#fcd34d', desc: 'View earnings & payouts' },
                ].map(({ value, label, icon, color, desc }) => (
                  <button key={value} onClick={() => { setInviteRole(value); setInviteCustomRoleId(null) }} style={{ background: inviteRole === value ? `${color}18` : 'var(--sr-card2)', border: `1.5px solid ${inviteRole === value ? color : 'var(--sr-border)'}`, borderRadius: 12, padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--sr-font-sans)' }}>
                    <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: inviteRole === value ? color : 'var(--sr-text)', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', lineHeight: 1.4 }}>{desc}</div>
                  </button>
                ))}
                {/* Custom roles */}
                {customRoles.map(cr => (
                  <button key={cr.id} onClick={() => { setInviteRole('custom'); setInviteCustomRoleId(cr.id) }} style={{ background: inviteRole === 'custom' && inviteCustomRoleId === cr.id ? 'rgba(196,181,253,0.12)' : 'var(--sr-card2)', border: `1.5px solid ${inviteRole === 'custom' && inviteCustomRoleId === cr.id ? '#c084fc' : 'var(--sr-border)'}`, borderRadius: 12, padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--sr-font-sans)' }}>
                    <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>🎨</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: inviteRole === 'custom' && inviteCustomRoleId === cr.id ? '#c084fc' : 'var(--sr-text)', marginBottom: 3 }}>{cr.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', lineHeight: 1.4 }}>Custom · {cr.permissions?.length || 0} permissions</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Property access */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: 10 }}>Property Access</label>
              <div style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', borderBottom: listings.length > 0 ? '1px solid var(--sr-border)' : 'none' }}>
                  <input type="checkbox" checked={invitePropertyAccess.includes('all')} onChange={e => setInvitePropertyAccess(e.target.checked ? ['all'] : [])} style={{ accentColor: 'var(--sr-orange)', width: 15, height: 15 }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--sr-text)' }}>All Properties</span>
                </label>
                {listings.map((l, i) => (
                  <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: invitePropertyAccess.includes('all') ? 'default' : 'pointer', borderBottom: i < listings.length - 1 ? '1px solid var(--sr-border)' : 'none', opacity: invitePropertyAccess.includes('all') ? 0.5 : 1 }}>
                    <input type="checkbox" disabled={invitePropertyAccess.includes('all')} checked={invitePropertyAccess.includes('all') || invitePropertyAccess.includes(l.id)} onChange={e => { if (e.target.checked) setInvitePropertyAccess(p => [...p.filter(x => x !== 'all'), l.id]); else setInvitePropertyAccess(p => p.filter(x => x !== l.id)) }} style={{ accentColor: 'var(--sr-orange)', width: 15, height: 15 }} />
                    <span style={{ fontSize: '0.82rem', color: 'var(--sr-text)' }}>{l.title || 'Untitled'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Personal note */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: 8 }}>
                Personal Note <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.7 }}>(optional)</span>
              </label>
              <textarea rows={3} placeholder="Add a personal message to the invite…" value={inviteNote} onChange={e => setInviteNote(e.target.value)} style={{ width: '100%', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '11px 14px', color: 'var(--sr-text)', fontSize: '0.86rem', fontFamily: 'var(--sr-font-sans)', outline: 'none', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setInviteModal(false)} disabled={inviteSending} style={{ flex: 1, background: 'var(--sr-card2)', color: 'var(--sr-muted)', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>Cancel</button>
              <button onClick={sendInvite} disabled={inviteSending || !inviteEmail.trim()} style={{ flex: 2, background: inviteSending || !inviteEmail.trim() ? 'var(--sr-card2)' : 'var(--sr-orange)', color: inviteSending || !inviteEmail.trim() ? 'var(--sr-sub)' : 'white', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: '0.88rem', cursor: inviteSending || !inviteEmail.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.15s' }}>
                {inviteSending ? 'Sending invite…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Switch to Guest confirmation modal */}
      {switchModal && (
        <div
          onClick={e => e.target === e.currentTarget && !switching && setSwitchModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '14px', textAlign: 'center' }}>🧳</div>
            <h2 style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.3rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: '12px', textAlign: 'center' }}>
              Switch to Guest View?
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--sr-sub)', lineHeight: 1.7, marginBottom: '24px', textAlign: 'center' }}>
              Browse and book properties as a guest. Your listings stay active and your host account is untouched — switch back any time from the nav bar.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSwitchModal(false)}
                disabled={switching}
                style={{ flex: 1, background: 'var(--sr-card2)', color: 'var(--sr-muted)', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchToGuest}
                disabled={switching}
                style={{ flex: 2, background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 700, fontSize: '0.88rem', cursor: switching ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)', opacity: switching ? 0.6 : 1 }}
              >
                {switching ? 'Switching…' : 'Switch to Guest View'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Host Cancel Booking Modal ──────────────────────────────────── */}
      {hostCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && closeHostCancelModal()}>
          <div style={{ background: 'var(--sr-card)', borderRadius: 16, padding: 32, maxWidth: 440, width: '100%', border: '1px solid var(--sr-border)' }}>
            {hostCancelResult ? (
              <div style={{ textAlign: 'center' }}>
                {hostCancelResult.error ? (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
                    <div style={{ fontWeight: 700, color: 'var(--sr-text)', marginBottom: 8 }}>Cancellation failed</div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--sr-muted)', marginBottom: 20 }}>{hostCancelResult.error}</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>✓</div>
                    <div style={{ fontWeight: 700, color: 'var(--sr-text)', marginBottom: 8 }}>Booking cancelled</div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--sr-muted)', marginBottom: 20 }}>
                      Guest refund: ${Number(hostCancelResult.refund||0).toFixed(2)}. Host was notified.
                    </p>
                  </>
                )}
                <button onClick={closeHostCancelModal} style={{ background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--sr-font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 6 }}>Cancel booking</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--sr-muted)', marginBottom: 16 }}>
                  {hostCancelModal.listing_title} · Guest: {hostCancelModal.guest_name} · Check-in {hostCancelModal.check_in}
                </div>
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#f87171' }}>
                  Host-initiated cancellations issue a full refund to the guest.
                </div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: 6 }}>
                  Reason (required)
                </label>
                <textarea value={hostCancelReason} onChange={e => setHostCancelReason(e.target.value)} rows={3}
                  placeholder="Explain why you are cancelling this booking…"
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 8, fontSize: '0.84rem', color: 'var(--sr-text)', fontFamily: 'var(--sr-font-sans)', resize: 'vertical', outline: 'none', marginBottom: 18 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeHostCancelModal} style={{ flex: 1, background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', color: 'var(--sr-muted)', fontFamily: 'var(--sr-font-sans)' }}>
                    Keep booking
                  </button>
                  <button onClick={handleHostCancel} disabled={hostCancelling || !hostCancelReason.trim()}
                    style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: '0.86rem', fontWeight: 700, cursor: hostCancelReason.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--sr-font-sans)', opacity: (hostCancelling || !hostCancelReason.trim()) ? 0.6 : 1 }}>
                    {hostCancelling ? 'Cancelling…' : 'Cancel booking'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Create Task Modal ──────────────────────────────────────────── */}
      {taskModal && (
        <div onClick={e => e.target === e.currentTarget && setTaskModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 20, padding: '28px 28px 24px', width: '100%', maxWidth: 520 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)' }}>New Task</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--sr-sub)', marginTop: 2 }}>Assign a task to a property and team member.</div>
              </div>
              <button onClick={() => setTaskModal(false)} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', cursor: 'pointer', fontSize: '1.1rem', padding: 4, lineHeight: 1 }}>✕</button>
            </div>

            {taskFormErr && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: '#ef4444' }}>
                {taskFormErr}
              </div>
            )}

            <form onSubmit={handleCreateTask}>
              {/* Task Title */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: 6 }}>
                  Task Title <span style={{ color: 'var(--sr-orange)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Clean and prepare unit for guest check-in"
                  autoFocus
                  required
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 8, fontSize: '0.84rem', color: 'var(--sr-text)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {/* Description */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: 6 }}>
                  Description <span style={{ color: 'var(--sr-sub)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Add any notes or instructions…"
                  rows={2}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 8, fontSize: '0.84rem', color: 'var(--sr-text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
              </div>

              {/* Property */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: 6 }}>
                  Property <span style={{ color: 'var(--sr-orange)' }}>*</span>
                </label>
                <select
                  value={taskForm.listing_id}
                  onChange={e => setTaskForm(p => ({ ...p, listing_id: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 8, fontSize: '0.84rem', color: taskForm.listing_id ? 'var(--sr-text)' : 'var(--sr-sub)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  <option value="">Select a property…</option>
                  {listings.map(l => (
                    <option key={l.id} value={l.id}>{l.title || 'Untitled'}{l.city ? ` — ${l.city}` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Assign to team member + Due date row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: 6 }}>
                    Assign To
                  </label>
                  <select
                    value={taskForm.assigned_to}
                    onChange={e => setTaskForm(p => ({ ...p, assigned_to: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 8, fontSize: '0.84rem', color: taskForm.assigned_to ? 'var(--sr-text)' : 'var(--sr-sub)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
                  >
                    <option value="">Unassigned</option>
                    {(teamData?.members || []).filter(m => m.status === 'active').map(m => (
                      <option key={m.id} value={m.id}>{m.full_name || m.email || 'Team member'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: 6 }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 8, fontSize: '0.84rem', color: 'var(--sr-text)', outline: 'none', fontFamily: 'inherit', colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Priority / Status */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: 8 }}>
                  Priority
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { key: 'scheduled',   label: 'Normal',      color: 'var(--sr-sub)', bg: 'var(--sr-surface)' },
                    { key: 'in_progress', label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                    { key: 'urgent',      label: '🔴 Urgent',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                  ].map(opt => (
                    <button key={opt.key} type="button"
                      onClick={() => setTaskForm(p => ({ ...p, status: opt.key }))}
                      style={{ padding: '6px 14px', borderRadius: 100, border: `1.5px solid ${taskForm.status === opt.key ? opt.color : 'var(--sr-border)'}`, background: taskForm.status === opt.key ? opt.bg : 'transparent', color: taskForm.status === opt.key ? opt.color : 'var(--sr-muted)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)', transition: 'all 0.15s' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setTaskModal(false)}
                  style={{ flex: 1, background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', color: 'var(--sr-muted)', fontFamily: 'var(--sr-font-sans)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={taskSaving}
                  style={{ flex: 2, background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: '0.86rem', fontWeight: 700, cursor: taskSaving ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)', opacity: taskSaving ? 0.6 : 1 }}>
                  {taskSaving ? 'Creating…' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Property Access Editor Modal ───────────────────────────────── */}
      {accessEditMember && (() => {
        const m = accessEditMember
        const hasAll = m.allowed_listing_ids === null
        return (
          <div onClick={e => e.target === e.currentTarget && setAccessEditMember(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 20, padding: '28px 28px 24px', width: '100%', maxWidth: 480 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Property Access</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--sr-sub)', marginTop: 2 }}>
                    {m.full_name || m.email} · <span style={{ textTransform: 'capitalize' }}>{m.role}</span>
                  </div>
                </div>
                <button onClick={() => setAccessEditMember(null)} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', cursor: 'pointer', fontSize: '1.1rem', padding: 4, lineHeight: 1 }}>✕</button>
              </div>

              {/* Grant All toggle */}
              <div style={{ background: hasAll ? 'rgba(34,197,94,0.06)' : 'var(--sr-card2)', border: `1px solid ${hasAll ? 'rgba(34,197,94,0.2)' : 'var(--sr-border)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--sr-text)' }}>All Properties</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)' }}>Full access to every property</div>
                </div>
                {hasAll ? (
                  <span style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', borderRadius: 100, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 700 }}>Active</span>
                ) : (
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/host/team/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'grant_all_access' }) })
                      const data = await res.json()
                      if (data.success) { loadTeam(); setAccessEditMember(null); showToast('Full access granted', 'success') }
                      else showToast(data.error || 'Failed', 'error')
                    }}
                    style={{ background: 'rgba(244,96,26,0.08)', border: '1px solid rgba(244,96,26,0.25)', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--sr-orange)', cursor: 'pointer', fontFamily: 'var(--sr-font-sans)' }}
                  >
                    Grant All
                  </button>
                )}
              </div>

              {/* Per-listing toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {listings.map(l => {
                  const cellKey = `${m.id}:${l.id}`
                  const busy = !!accessLoading[cellKey]
                  const hasAccess = hasAll || (m.allowed_listing_ids || []).includes(l.id)
                  return (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--sr-card2)', borderRadius: 10, border: '1px solid var(--sr-border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--sr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)' }}>📍 {l.city}{l.state ? `, ${l.state}` : ''}</div>
                      </div>
                      <button
                        disabled={busy}
                        onClick={async () => {
                          await togglePropertyAccess(m.id, l.id, hasAccess)
                          // Refresh the modal member data from the updated teamData
                          setAccessEditMember(prev => {
                            if (!prev) return null
                            const current = prev.allowed_listing_ids
                            let next
                            if (hasAccess) {
                              next = current === null
                                ? listings.filter(x => x.id !== l.id).map(x => x.id)
                                : (current || []).filter(id => id !== l.id)
                            } else {
                              next = [...(current || []), l.id]
                              if (next.length === listings.length) next = null
                            }
                            return { ...prev, allowed_listing_ids: next }
                          })
                        }}
                        style={{ background: hasAccess ? 'rgba(34,197,94,0.1)' : 'var(--sr-card)', border: `1px solid ${hasAccess ? 'rgba(34,197,94,0.3)' : 'var(--sr-border)'}`, borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', fontWeight: 700, color: hasAccess ? '#4ade80' : 'var(--sr-sub)', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)', opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap' }}
                      >
                        {busy ? '…' : hasAccess ? '✓ Access' : '+ Grant'}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div style={{ marginTop: 18, textAlign: 'right' }}>
                <button onClick={() => setAccessEditMember(null)} style={{ background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '9px 20px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', color: 'var(--sr-muted)', fontFamily: 'var(--sr-font-sans)' }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Property Access Modal (per-property) ───────────────────────── */}
      {propAccessModal && (() => {
        const l = propAccessModal
        const activeNonOwners = (teamData?.members || []).filter(m => m.status === 'active' && m.role !== 'owner')
        return (
          <div onClick={e => e.target === e.currentTarget && setPropAccessModal(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden' }}>
              {/* Header image */}
              <div style={{ height: 110, position: 'relative', background: 'var(--sr-card2)' }}>
                {Array.isArray(l.images) && l.images[0]
                  ? <img src={l.images[0]} alt={l.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', opacity: 0.25 }}>🏠</div>
                }
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                <button onClick={() => setPropAccessModal(null)} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>✕</button>
                <div style={{ position: 'absolute', bottom: 12, left: 16 }}>
                  <div style={{ fontFamily: "var(--sr-font-display)", fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: 2 }}>{l.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>📍 {l.city}{l.state ? `, ${l.state}` : ''}</div>
                </div>
              </div>

              <div style={{ padding: '20px 24px 24px' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--sr-sub)', marginBottom: 14 }}>
                  Toggle access for each team member. Changes save instantly.
                </div>

                {activeNonOwners.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--sr-sub)', fontSize: '0.84rem' }}>
                    No team members yet. Invite someone from the Team Members tab.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {activeNonOwners.map(m => {
                      const cellKey = `${m.id}:${l.id}`
                      const busy = !!accessLoading[cellKey]
                      const hasAccess = !m.allowed_listing_ids || m.allowed_listing_ids.includes(l.id)
                      const TEAM_RS = {
                        manager: { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
                        staff:   { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
                        finance: { bg: 'rgba(251,191,36,0.12)',  text: '#fcd34d' },
                        custom:  { bg: 'rgba(192,132,252,0.12)', text: '#c084fc' },
                      }
                      const rs = TEAM_RS[m.role] || TEAM_RS.staff
                      const ini = m.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || m.email?.[0]?.toUpperCase() || '?'
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: hasAccess ? 'rgba(34,197,94,0.04)' : 'var(--sr-card2)', border: `1px solid ${hasAccess ? 'rgba(34,197,94,0.15)' : 'var(--sr-border)'}`, borderRadius: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: rs.bg, border: `1px solid ${rs.text}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: rs.text, flexShrink: 0 }}>{ini}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--sr-text)' }}>{m.full_name || m.email || '—'}</div>
                            <div style={{ fontSize: '0.7rem', color: rs.text, textTransform: 'capitalize' }}>{m.role}</div>
                          </div>
                          <button
                            disabled={busy}
                            onClick={() => togglePropertyAccess(m.id, l.id, hasAccess)}
                            style={{ background: hasAccess ? 'rgba(34,197,94,0.1)' : 'var(--sr-card)', border: `1px solid ${hasAccess ? 'rgba(34,197,94,0.3)' : 'var(--sr-border)'}`, borderRadius: 8, padding: '6px 14px', fontSize: '0.74rem', fontWeight: 700, color: hasAccess ? '#4ade80' : 'var(--sr-sub)', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)', opacity: busy ? 0.5 : 1, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                          >
                            {busy ? '…' : hasAccess ? '✓ Has Access' : '+ Grant Access'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ marginTop: 18, textAlign: 'right' }}>
                  <button onClick={() => setPropAccessModal(null)} style={{ background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '9px 20px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', color: 'var(--sr-muted)', fontFamily: 'var(--sr-font-sans)' }}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Reply to Review Modal ───────────────────────────────────────── */}
      {replyModal && (
        <div onClick={e => e.target === e.currentTarget && setReplyModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 20, padding: '28px 28px 24px', width: '100%', maxWidth: 500 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--sr-text)', marginBottom: 6 }}>
              {replyModal.host_reply ? 'Edit your response' : 'Respond to review'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--sr-muted)', marginBottom: 16 }}>
              {replyModal.guest_name} · {replyModal.listing_title} ·{' '}
              <span style={{ color: '#F59E0B' }}>{'★'.repeat(replyModal.rating)}</span>
            </div>
            {replyModal.comment && (
              <div style={{ background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: '0.82rem', color: 'var(--sr-muted)', lineHeight: 1.7, fontStyle: 'italic' }}>
                "{replyModal.comment}"
              </div>
            )}
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a thoughtful response visible to all guests…"
              rows={4}
              style={{ width: '100%', background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px 12px', fontSize: '0.84rem', color: 'var(--sr-text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setReplyModal(null)}
                style={{ flex: 1, background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', color: 'var(--sr-muted)', fontFamily: 'var(--sr-font-sans)' }}>
                Cancel
              </button>
              <button onClick={submitReply} disabled={replySaving}
                style={{ flex: 1, background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: '0.86rem', fontWeight: 700, cursor: replySaving ? 'not-allowed' : 'pointer', fontFamily: 'var(--sr-font-sans)', opacity: replySaving ? 0.6 : 1 }}>
                {replySaving ? 'Saving…' : replyModal.host_reply ? 'Update response' : 'Post response'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete listing confirmation */}
      {deleteModalListing && (() => {
        const listing = listings.find(l => l.id === deleteModalListing)
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setDeleteModalListing(null)}>
            <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--sr-text)', marginBottom: 8 }}>Remove listing?</div>
              <p style={{ fontSize: '0.88rem', color: 'var(--sr-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                {listing?.title && <strong style={{ color: 'var(--sr-text)' }}>"{listing.title}"</strong>}
                {listing?.title && ' will be removed from your properties and unpublished. Existing bookings are not affected.'}
                {!listing?.title && 'This listing will be removed from your properties and unpublished. Existing bookings are not affected.'}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setDeleteModalListing(null)}
                  style={{ padding: '10px 18px', borderRadius: 10, fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', color: 'var(--sr-muted)', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading === deleteModalListing}
                  onClick={() => callListingAction(deleteModalListing, 'delete_listing')}
                  style={{ padding: '10px 18px', borderRadius: 10, fontSize: '0.86rem', fontWeight: 700, cursor: actionLoading === deleteModalListing ? 'not-allowed' : 'pointer', background: 'var(--sr-red)', border: 'none', color: 'white', fontFamily: 'inherit', opacity: actionLoading === deleteModalListing ? 0.6 : 1 }}
                >
                  {actionLoading === deleteModalListing ? 'Removing…' : 'Remove listing'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
