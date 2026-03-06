'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ThemeToggle from '@/app/components/ThemeToggle'

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

function MessagesTab({ userId, onRead }) {
  const [msgs, setMsgs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [replies, setReplies] = useState({})
  const [sending, setSending] = useState(null)
  const [toast, setToast]     = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (!userId) return
    async function load() {
      const { data } = await supabase
        .from('host_messages')
        .select('id, listing_id, type, subject, body, is_read, created_at, reply_body, replied_at')
        .eq('host_user_id', userId)
        .order('created_at', { ascending: false })
      setMsgs(data || [])
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
            const draft = replies[m.id] || ''
            return (
              <div key={m.id} style={{ background: 'var(--sr-card)', border: `1px solid ${!m.is_read ? 'rgba(244,96,26,0.35)' : 'var(--sr-border)'}`, borderRadius: '14px', padding: '18px 20px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '100px', fontSize: '0.62rem', fontWeight: 700, background: cfg.bg, color: cfg.color, marginBottom: '8px' }}>
                  {cfg.label}
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

function MiniCalendar() {
  const now    = new Date()
  const year   = now.getFullYear()
  const month  = now.getMonth()
  const today  = now.getDate()
  const first  = new Date(year, month, 1).getDay()
  const days   = new Date(year, month + 1, 0).getDate()
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const cells = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)

  return (
    <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '16px', padding: '24px', maxWidth: '400px' }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: '16px', textAlign: 'center' }}>{monthName}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--sr-sub)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            style={{
              padding: '8px 4px', fontSize: '0.82rem', fontWeight: d === today ? 700 : 400,
              borderRadius: '8px',
              background: d === today ? 'var(--sr-orange)' : 'transparent',
              color: d === today ? 'white' : d ? 'var(--sr-text)' : 'transparent',
              cursor: d ? 'default' : 'default',
            }}
          >
            {d || ''}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)', marginBottom: '4px' }}>Legend</div>
        {[
          { color: 'var(--sr-orange)', label: 'Today' },
          { color: 'var(--sr-green)',  label: 'Booked' },
          { color: 'var(--sr-blue)',   label: 'Blocked' },
          { color: 'var(--sr-yellow)', label: 'Pending check-in' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--sr-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
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
  // Caller identity
  const [myRole,         setMyRole]         = useState(null)   // 'owner'|'manager'|'staff'|'finance'
  const [myHostId,       setMyHostId]       = useState(null)
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
  // Custom role create form
  const [newRoleName,          setNewRoleName]          = useState('')
  const [newRolePerms,         setNewRolePerms]         = useState([])
  const [newRoleSaving,        setNewRoleSaving]        = useState(false)

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

      const [{ data: prof }, { data: lists }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
        resolvedHostId
          ? supabase.from('listings').select('*').eq('host_id', resolvedHostId).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ])

      setProfile(prof)
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

  async function loadTeam() {
    if (teamLoading) return
    setTeamLoading(true)
    try {
      const [teamRes, rolesRes] = await Promise.all([
        fetch('/api/host/team'),
        fetch('/api/host/team/roles'),
      ])
      const teamJson  = await teamRes.json()
      const rolesJson = await rolesRes.json()
      if (teamRes.ok)  setTeamData(teamJson)
      if (rolesRes.ok) setCustomRoles(rolesJson.roles || [])
    } finally {
      setTeamLoading(false)
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
        if (action === 'resend_invite' && data.invite_link) {
          setInviteLink(data.invite_link)
          showToast('New invite link generated', 'success')
        } else {
          showToast(action === 'remove' ? 'Member removed' : 'Role updated', 'success')
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
      <div style={{ color: 'var(--sr-sub)', fontSize: '0.9rem', fontFamily: 'Syne, sans-serif' }}>Loading…</div>
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
        <div style={{ height: compact ? '120px' : '160px', position: 'relative', overflow: 'hidden', background: 'var(--sr-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Array.isArray(l.images) && l.images[0]
            ? <img src={l.images[0]} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ fontSize: '3rem', opacity: 0.3 }}>{l.type === 'hotel' ? '🏨' : '🏠'}</div>
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

          {l.status === 'approved' && (
            <div style={{ background: 'rgba(244,96,26,0.06)', border: '1px solid rgba(244,96,26,0.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--sr-orange)' }}>
              ✅ Approved! Click "Go Live" to publish your listing.
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

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
                  {isActing ? 'Publishing…' : '🚀 Go Live'}
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
          </div>

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
        </div>
      </div>
    )
  }

  // Sidebar nav config
  const ROLE_NAV = {
    owner:   new Set(['overview','bookings','properties','calendar','messages','earnings','payouts','team','permissions','access','activity','reviews','settings']),
    manager: new Set(['overview','bookings','properties','calendar','messages','activity','reviews']),
    staff:   new Set(['overview','bookings','calendar','messages']),
    finance: new Set(['overview','earnings','payouts','activity']),
  }
  // Custom role: use permissions[] from host_custom_roles
  const customNavSet = myCustomRole
    ? new Set(['overview', ...(myCustomRole.permissions || [])])
    : null
  const allowedNav = myRole === 'custom' && customNavSet
    ? customNavSet
    : myRole ? (ROLE_NAV[myRole] || ROLE_NAV.owner) : ROLE_NAV.owner

  const pendingCount = teamData?.members?.filter(m => m.status === 'pending').length || 0
  const NAV_SECTIONS = [
    {
      title: 'MAIN',
      items: [
        { id: 'overview',    label: 'Overview',    icon: '⬛' },
        { id: 'bookings',    label: 'Bookings',    icon: '📋', badge: 0 },
        { id: 'properties',  label: 'Properties',  icon: '🏨' },
        { id: 'calendar',    label: 'Calendar',    icon: '📅' },
        { id: 'messages',    label: 'Messages',    icon: '💬', badge: totalUnread },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        { id: 'earnings', label: 'Earnings', icon: '💰' },
        { id: 'payouts',  label: 'Payouts',  icon: '🏦' },
      ],
    },
    {
      title: 'TEAM',
      items: [
        { id: 'team',        label: 'Team Members',        icon: '👥', badge: pendingCount },
        { id: 'permissions', label: 'Roles & Permissions', icon: '🔐' },
        { id: 'access',      label: 'Property Access',     icon: '🏢' },
        { id: 'activity',    label: 'Activity Log',        icon: '📜' },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        { id: 'reviews',  label: 'Reviews',  icon: '⭐' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
      ],
    },
  ]

  function PlaceholderPage({ icon, title, subtitle }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '16px' }}>
        <div style={{ fontSize: '3rem' }}>{icon}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', fontWeight: 700, color: 'var(--sr-text)' }}>{title}</div>
        <div style={{ fontSize: '0.88rem', color: 'var(--sr-sub)', maxWidth: '340px', textAlign: 'center', lineHeight: 1.7 }}>{subtitle}</div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { font-family: 'Syne', -apple-system, sans-serif; background: var(--sr-bg); color: var(--sr-text); }
        .hd-layout { display: flex; min-height: 100vh; background: var(--sr-bg); }
        .hd-sidebar { width: 240px; background: var(--sr-surface); border-right: 1px solid var(--sr-border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; overflow-y: auto; }
        .hd-logo-wrap { padding: 24px 20px 20px; border-bottom: 1px solid var(--sr-border); flex-shrink: 0; }
        .hd-logo-text { font-family: 'Cormorant Garamond', serif; font-size: 1.3rem; font-weight: 700; color: var(--sr-text); text-decoration: none; display: block; letter-spacing: -0.01em; }
        .hd-logo-text span { color: var(--sr-orange); }
        .hd-logo-text sup { font-size: 0.55em; vertical-align: super; opacity: 0.7; }
        .hd-logo-sub { font-size: 0.6rem; font-weight: 700; color: var(--sr-sub); text-transform: uppercase; letter-spacing: 0.14em; margin-top: 4px; }
        .hd-nav-wrap { flex: 1; padding: 16px 12px; }
        .hd-nav-section-title { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--sr-sub); padding: 0 10px; margin-bottom: 6px; margin-top: 16px; }
        .hd-nav-section-title:first-child { margin-top: 0; }
        .hd-nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; cursor: pointer; color: var(--sr-muted); font-size: 0.86rem; font-weight: 500; transition: all 0.15s; margin-bottom: 2px; border: none; background: none; width: 100%; text-align: left; font-family: 'Syne', sans-serif; }
        .hd-nav-item:hover { background: var(--sr-overlay-xs); color: var(--sr-text); }
        .hd-nav-item.active { background: var(--sr-orange); color: white; font-weight: 700; }
        .hd-nav-badge { display: inline-flex; align-items: center; justify-content: center; background: var(--sr-red); color: white; border-radius: 100px; font-size: 0.58rem; font-weight: 800; min-width: 16px; height: 16px; padding: 0 4px; margin-left: auto; }
        .hd-sidebar-footer { padding: 14px 12px; border-top: 1px solid var(--sr-border); flex-shrink: 0; }
        .hd-user-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; cursor: default; margin-bottom: 8px; }
        .hd-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--sr-orange); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: white; flex-shrink: 0; font-family: 'Syne', sans-serif; }
        .hd-user-name { font-size: 0.8rem; font-weight: 700; color: var(--sr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hd-user-role { font-size: 0.62rem; color: var(--sr-sub); margin-top: 1px; }
        .hd-guest-link { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 9px; text-decoration: none; font-size: 0.78rem; font-weight: 600; color: var(--sr-muted); background: var(--sr-overlay-xs); border: 1px solid var(--sr-border); transition: all 0.15s; margin-bottom: 6px; }
        .hd-guest-link:hover { color: var(--sr-text); background: var(--sr-overlay-sm); }
        .hd-logout-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px; border-radius: 9px; font-size: 0.78rem; font-weight: 600; color: var(--sr-sub); background: none; border: none; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.15s; }
        .hd-logout-btn:hover { color: var(--sr-red); background: var(--sr-redl); }
        .hd-main { margin-left: 240px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
        .hd-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0 32px; height: 68px; border-bottom: 1px solid var(--sr-border); background: var(--sr-surface); position: sticky; top: 0; z-index: 50; gap: 16px; }
        .hd-greeting { font-family: 'Cormorant Garamond', serif; font-size: 1.15rem; font-weight: 600; color: var(--sr-text); }
        .hd-date { font-size: 0.72rem; color: var(--sr-sub); margin-top: 2px; }
        .hd-topbar-right { display: flex; align-items: center; gap: 10px; }
        .hd-add-btn { background: var(--sr-orange); color: white; border: none; border-radius: 10px; padding: 9px 18px; font-size: 0.82rem; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: opacity 0.15s; white-space: nowrap; }
        .hd-add-btn:hover { opacity: 0.88; }
        .hd-bell { position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 9px; border: 1px solid var(--sr-border); background: transparent; cursor: pointer; font-size: 1rem; color: var(--sr-muted); transition: all 0.15s; }
        .hd-bell:hover { border-color: var(--sr-orange); color: var(--sr-text); }
        .hd-bell-dot { position: absolute; top: 6px; right: 6px; width: 7px; height: 7px; border-radius: 50%; background: var(--sr-red); border: 2px solid var(--sr-surface); }
        .hd-content { padding: 32px; flex: 1; }
        .hd-page-title { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 700; color: var(--sr-text); margin-bottom: 4px; }
        .hd-page-sub { font-size: 0.84rem; color: var(--sr-sub); margin-bottom: 28px; }
        .hd-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
        .hd-stat-card { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 14px; padding: 20px 22px; }
        .hd-stat-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sr-sub); margin-bottom: 10px; }
        .hd-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; font-weight: 700; color: var(--sr-text); line-height: 1; margin-bottom: 6px; }
        .hd-stat-hint { font-size: 0.72rem; color: var(--sr-sub); }
        .hd-section-title { font-family: 'Cormorant Garamond', serif; font-size: 1.2rem; font-weight: 700; color: var(--sr-text); margin-bottom: 14px; }
        .hd-qa-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
        .hd-qa-btn { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 12px; padding: 16px; text-align: left; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.18s; text-decoration: none; display: block; color: var(--sr-text); }
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
        .hd-empty-title { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 700; margin-bottom: 8px; color: var(--sr-text); }
        .hd-empty-sub { font-size: 0.84rem; color: var(--sr-sub); margin-bottom: 24px; }
        .hd-toast { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 12px; font-size: 0.86rem; font-weight: 600; z-index: 9999; animation: hd-fadein 0.2s; max-width: 320px; font-family: 'Syne', sans-serif; }
        .hd-toast.success { background: var(--sr-green); color: white; }
        .hd-toast.error   { background: var(--sr-red);   color: white; }
        @keyframes hd-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 1200px) { .hd-stat-grid { grid-template-columns: repeat(2,1fr); } .hd-qa-grid { grid-template-columns: repeat(2,1fr); } .hd-prop-grid { grid-template-columns: repeat(2,1fr); } .hd-prop-preview-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 900px)  { .hd-stat-grid { grid-template-columns: repeat(2,1fr); } .hd-prop-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px)  { .hd-sidebar { display: none; } .hd-main { margin-left: 0; } .hd-content { padding: 20px; } .hd-stat-grid { grid-template-columns: 1fr 1fr; } .hd-qa-grid { grid-template-columns: 1fr 1fr; } .hd-prop-preview-grid { grid-template-columns: 1fr; } }
      `}</style>

      {toast && <div className={`hd-toast ${toast.type}`}>{toast.msg}</div>}

      <div className="hd-layout">
        {/* SIDEBAR */}
        <aside className="hd-sidebar">
          <div className="hd-logo-wrap">
            <a href="/" className="hd-logo-text">Snap<span>Reserve</span><sup>™</sup></a>
            <div className="hd-logo-sub">Host Portal</div>
          </div>

          <nav className="hd-nav-wrap">
            {NAV_SECTIONS.map(section => {
              const visibleItems = section.items.filter(item => allowedNav.has(item.id))
              if (!visibleItems.length) return null
              return (
                <div key={section.title}>
                  <div className="hd-nav-section-title">{section.title}</div>
                  {visibleItems.map(item => (
                    <button
                      key={item.id}
                      className={`hd-nav-item ${activeNav === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveNav(item.id)
                        if (['team','permissions','access','activity'].includes(item.id) && !teamData) loadTeam()
                        if (['bookings','earnings'].includes(item.id) && hostBookings.length === 0 && !hostBookingsLoading) loadHostBookings('all', 'all', 1)
                        if (item.id === 'reviews' && !hostReviewsMetrics && !hostReviewsLoading) loadHostReviews('all', 1)
                      }}
                    >
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>{item.icon}</span>
                      <span>{item.label}</span>
                      {item.badge > 0 && (
                        <span className="hd-nav-badge">{item.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              )
            })}
          </nav>

          <div className="hd-sidebar-footer">
            <div className="hd-user-row">
              <div className="hd-avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="hd-user-name">{profile?.full_name || 'Host'}</div>
                <div className="hd-user-role">
                  {myRole === 'owner'   ? 'Host · Owner'
                  : myRole === 'manager' ? 'Host · Manager'
                  : myRole === 'staff'   ? 'Host · Staff'
                  : myRole === 'finance' ? 'Host · Finance'
                  : myRole === 'custom' && myCustomRole ? `Host · ${myCustomRole.name}`
                  : 'Host Account'}
                </div>
              </div>
            </div>
            {myRole === 'owner' && (
              <button
                className="hd-guest-link"
                style={{ border: 'none', width: '100%', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}
                onClick={() => setSwitchModal(true)}
              >
                <span>🔄</span>
                <span>Switch to Guest Mode</span>
              </button>
            )}
            {myRole && myRole !== 'owner' && (
              <div style={{ fontSize: '0.68rem', color: 'var(--sr-sub)', padding: '8px 10px', background: 'var(--sr-overlay-xs)', borderRadius: 8, lineHeight: 1.5 }}>
                🔐 Team member account. For personal bookings, use a separate guest account.
              </div>
            )}
            <button className="hd-logout-btn" onClick={handleLogout}>
              <span>↪</span>
              <span>Sign out</span>
            </button>
          </div>
        </aside>

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
                  <a href="/list-property" className="hd-qa-btn">
                    <span className="hd-qa-icon">🏠</span>
                    <div className="hd-qa-label">Add Property</div>
                    <div className="hd-qa-sub">List a new space</div>
                  </a>
                  <button className="hd-qa-btn" style={{ border: '1px solid var(--sr-border)', color: 'var(--sr-text)' }} onClick={() => setActiveNav('properties')}>
                    <span className="hd-qa-icon">📋</span>
                    <div className="hd-qa-label">Edit Policies</div>
                    <div className="hd-qa-sub">Update listing rules</div>
                  </button>
                  <button className="hd-qa-btn" style={{ border: '1px solid var(--sr-border)', color: 'var(--sr-text)' }} onClick={() => setActiveNav('messages')}>
                    <span className="hd-qa-icon">💬</span>
                    <div className="hd-qa-label">View Messages</div>
                    <div className="hd-qa-sub">{totalUnread > 0 ? `${totalUnread} unread` : 'No new messages'}</div>
                  </button>
                  <button className="hd-qa-btn" style={{ border: '1px solid var(--sr-border)', color: 'var(--sr-text)' }} onClick={() => setSwitchModal(true)}>
                    <span className="hd-qa-icon">🔄</span>
                    <div className="hd-qa-label">Switch to Guest</div>
                    <div className="hd-qa-sub">Browse as a traveler</div>
                  </button>
                </div>

                {/* Properties preview */}
                <div className="hd-section-title">Your properties</div>
                {listings.length === 0 ? (
                  <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '14px', padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🏠</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: '6px' }}>No properties yet</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--sr-sub)', marginBottom: '18px' }}>Add your first property to start earning.</div>
                    <a href="/list-property" className="hd-add-btn" style={{ display: 'inline-flex' }}>+ Add Property</a>
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
                      style={{ background: 'var(--sr-orange)', color: 'white', border: 'none', borderRadius: '9px', padding: '9px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' }}
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
                                  {['confirmed','pending'].includes(b.status) && (
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
                  <a href="/list-property" className="hd-add-btn">+ Add Property</a>
                </div>

                {listings.length === 0 ? (
                  <div className="hd-empty">
                    <div className="hd-empty-icon">🏠</div>
                    <div className="hd-empty-title">No properties yet</div>
                    <div className="hd-empty-sub">List your first space and start earning on SnapReserve™.</div>
                    <a href="/list-property" className="hd-add-btn" style={{ display: 'inline-flex' }}>+ Add your first property</a>
                  </div>
                ) : (
                  <div className="hd-prop-grid">
                    {listings.map(l => <PropertyCard key={l.id} l={l} />)}
                    <a href="/list-property" className="hd-add-card">
                      <div className="hd-add-icon">+</div>
                      <div className="hd-add-title">Add new property</div>
                      <div className="hd-add-sub">List your space on SnapReserve™</div>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* ========== CALENDAR ========== */}
            {activeNav === 'calendar' && (
              <div>
                <div className="hd-page-title">Calendar</div>
                <div className="hd-page-sub">View your property availability and upcoming stays.</div>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <MiniCalendar />
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '16px', padding: '24px' }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: '14px' }}>Upcoming</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '10px' }}>
                        <div style={{ fontSize: '2rem' }}>📅</div>
                        <div style={{ fontSize: '0.86rem', color: 'var(--sr-sub)', textAlign: 'center' }}>No upcoming bookings. Your calendar is clear.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontWeight: 700, color: 'var(--sr-text)' }}>All Bookings — Earnings Breakdown</div>
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
                            <tr key={b.id} style={{ borderBottom: '1px solid var(--sr-border)', background: i%2===1 ? 'var(--sr-overlay-xs)' : 'transparent' }}>
                              <td style={{ padding: '12px 18px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--sr-orange)', fontWeight: 700 }}>{b.reference}</span>
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
            {activeNav === 'team' && (
              <div>
                {/* Org banner */}
                {teamData?.host_name && (
                  <div style={{ background: 'linear-gradient(135deg, #F4601A 0%, #c0440e 100%)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>Organisation</div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.9rem', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 14 }}>{teamData.host_name}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', borderRadius: 100, padding: '3px 12px', fontSize: '0.72rem', fontWeight: 600 }}>{listings.length} {listings.length === 1 ? 'Property' : 'Properties'}</span>
                        <span style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', borderRadius: 100, padding: '3px 12px', fontSize: '0.72rem', fontWeight: 600 }}>{teamData.members?.length || 0} Members</span>
                        <span style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', borderRadius: 100, padding: '3px 12px', fontSize: '0.72rem', fontWeight: 600 }}>✓ Verified</span>
                      </div>
                    </div>
                    {teamData.caller_role === 'owner' && (
                      <button onClick={() => setInviteModal(true)} style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '11px 22px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif', flexShrink: 0 }}>
                        + Invite Member
                      </button>
                    )}
                  </div>
                )}

                {/* Stats row */}
                {teamData && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                    {[
                      { label: 'Team Size',    val: teamData.members?.length || 0,                                                       hint: 'Total members' },
                      { label: 'Properties',   val: listings.length,                                                                      hint: 'Active listings' },
                      { label: 'Active',       val: teamData.members?.filter(m => m.status === 'active').length || 0,                     hint: 'Accepted invites' },
                      { label: 'Pending',      val: teamData.members?.filter(m => m.status === 'pending').length || 0,                    hint: 'Awaiting acceptance' },
                    ].map(({ label, val, hint }) => (
                      <div key={label} className="hd-stat-card">
                        <div className="hd-stat-label">{label}</div>
                        <div className="hd-stat-val">{val}</div>
                        <div className="hd-stat-hint">{hint}</div>
                      </div>
                    ))}
                  </div>
                )}

                {teamLoading && !teamData && (
                  <div style={{ color: 'var(--sr-sub)', fontSize: '0.88rem', padding: '40px 0' }}>Loading team…</div>
                )}

                {teamData && (
                  <>
                    {/* Generated invite link */}
                    {inviteLink && (
                      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem' }}>🔗</span>
                        <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--sr-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inviteLink}</span>
                        <button onClick={() => { navigator.clipboard.writeText(inviteLink); showToast('Copied!', 'success') }} style={{ background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Copy Link</button>
                        <button onClick={() => setInviteLink(null)} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', fontSize: '1rem', cursor: 'pointer', padding: '4px' }}>✕</button>
                      </div>
                    )}

                    {/* Members table */}
                    <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
                      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--sr-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Team Members</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--sr-sub)' }}>
                            {teamData.members.filter(m => m.status === 'active').length} active · {teamData.members.filter(m => m.status === 'pending').length} pending
                          </span>
                          {teamData.caller_role === 'owner' && (
                            <button onClick={() => setInviteModal(true)} style={{ background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 9, padding: '7px 16px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                              + Invite
                            </button>
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
                            {teamData.members.filter(m => m.status !== 'pending').map((m) => {
                              const RS = {
                                owner:   { bg: 'rgba(244,96,26,0.12)',   text: '#F4601A',  icon: '👑' },
                                manager: { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa',  icon: '🔵' },
                                staff:   { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80',  icon: '🟢' },
                                finance: { bg: 'rgba(251,191,36,0.12)',  text: '#fcd34d',  icon: '💛' },
                                custom:  { bg: 'rgba(192,132,252,0.12)', text: '#c084fc',  icon: '🎨' },
                              }
                              const rs = RS[m.role] || RS.staff
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
                                    <span style={{ background: rs.bg, color: rs.text, border: `1px solid ${rs.text}33`, borderRadius: 100, padding: '4px 12px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                      {rs.icon} {roleLabel}
                                    </span>
                                  </td>
                                  <td style={{ padding: '14px 20px' }}>
                                    <span style={{ background: 'var(--sr-card2)', color: m.allowed_listing_ids ? 'var(--sr-orange)' : 'var(--sr-sub)', borderRadius: 100, padding: '3px 10px', fontSize: '0.68rem', fontWeight: 600 }}>
                                      {!m.allowed_listing_ids ? 'All Properties' : `${m.allowed_listing_ids.length} Propert${m.allowed_listing_ids.length !== 1 ? 'ies' : 'y'}`}
                                    </span>
                                  </td>
                                  <td style={{ padding: '14px 20px' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, color: '#4ade80' }}>
                                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} /> Active
                                    </span>
                                  </td>
                                  <td style={{ padding: '14px 20px' }}>
                                    {!isOwner && teamData.caller_role === 'owner' && (
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
                                          style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 8, padding: '5px 10px', fontSize: '0.72rem', color: 'var(--sr-muted)', cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', outline: 'none' }}
                                        >
                                          <option value="manager">Manager</option>
                                          <option value="staff">Staff</option>
                                          <option value="finance">Finance</option>
                                          {customRoles.map(cr => (
                                            <option key={cr.id} value={`custom:${cr.id}`}>{cr.name}</option>
                                          ))}
                                        </select>
                                        <button onClick={() => handleMemberAction(m.id, 'remove')} disabled={isBusy} style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', color: '#f87171', cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif' }}>
                                          {isBusy ? '…' : 'Remove'}
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                            {teamData.members.filter(m => m.status !== 'pending').length === 0 && (
                              <tr>
                                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>No active team members yet. Invite someone to get started.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pending invites */}
                    {teamData.members.filter(m => m.status === 'pending').length > 0 && (
                      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--sr-border)' }}>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 700, color: 'var(--sr-text)' }}>Pending Invites</div>
                        </div>
                        {teamData.members.filter(m => m.status === 'pending').map(m => {
                          const RS2 = {
                            owner:   { bg: 'rgba(244,96,26,0.12)',   text: '#F4601A' },
                            manager: { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
                            staff:   { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
                            finance: { bg: 'rgba(251,191,36,0.12)',  text: '#fcd34d' },
                            custom:  { bg: 'rgba(192,132,252,0.12)', text: '#c084fc' },
                          }
                          const rs2 = RS2[m.role] || RS2.staff
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
                              {teamData.caller_role === 'owner' && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => handleMemberAction(m.id, 'resend_invite')} disabled={isBusy} style={{ background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', color: 'var(--sr-muted)', cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif' }}>↺ Resend</button>
                                  <button onClick={() => handleMemberAction(m.id, 'remove')} disabled={isBusy} style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', color: '#f87171', cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif' }}>{isBusy ? '…' : 'Cancel'}</button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {!teamLoading && !teamData && (
                  <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, padding: '40px', textAlign: 'center', maxWidth: 480 }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👥</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 8 }}>Team not available</div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--sr-sub)', lineHeight: 1.6 }}>
                      Team management is available for host accounts. If you're a team member, your owner needs to send you a new invite.
                    </div>
                  </div>
                )}
              </div>
            )}

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
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Permission Matrix</div>
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
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 6 }}>Custom Roles</div>
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
                              <button onClick={() => deleteCustomRole(cr.id)} style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'Syne, sans-serif' }}>
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
                          <input type="text" placeholder="e.g. Concierge, Cleaner, Supervisor…" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} maxLength={40} style={{ width: '100%', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px 14px', color: 'var(--sr-text)', fontSize: '0.86rem', fontFamily: 'Syne, sans-serif', outline: 'none' }} />
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
                        <button onClick={createCustomRole} disabled={!newRoleName.trim() || newRoleSaving} style={{ background: !newRoleName.trim() || newRoleSaving ? 'var(--sr-card2)' : '#c084fc', color: !newRoleName.trim() || newRoleSaving ? 'var(--sr-sub)' : '#0a0507', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 700, fontSize: '0.84rem', cursor: !newRoleName.trim() || newRoleSaving ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', transition: 'all 0.15s' }}>
                          {newRoleSaving ? 'Creating…' : 'Create Role'}
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ========== PROPERTY ACCESS ========== */}
            {activeNav === 'access' && (
              <div>
                <div className="hd-page-title">Property Access</div>
                <div className="hd-page-sub">Control which team members can access and manage each property.</div>

                {teamLoading && !teamData && (
                  <div style={{ color: 'var(--sr-sub)', fontSize: '0.88rem', padding: '40px 0' }}>Loading…</div>
                )}

                {teamData && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
                      {listings.map(l => (
                        <div key={l.id} style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 14, overflow: 'hidden' }}>
                          <div style={{ height: 110, background: l.images?.[0] ? `url(${l.images[0]}) center/cover no-repeat` : 'var(--sr-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                            {!l.images?.[0] && '🏨'}
                          </div>
                          <div style={{ padding: '14px 16px' }}>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title || 'Untitled'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginBottom: 8 }}>{l.city}, {l.country || 'United States'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)' }}>
                              {(() => { const n = teamData.members.filter(m => m.status === 'active' && m.role !== 'owner' && (!m.allowed_listing_ids || m.allowed_listing_ids.includes(l.id))).length; return `${n} member${n !== 1 ? 's' : ''} with access` })()}
                            </div>
                          </div>
                        </div>
                      ))}
                      {listings.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>No properties yet.</div>
                      )}
                    </div>

                    {listings.length > 0 && (
                      <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--sr-border)' }}>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Member Access Matrix</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--sr-sub)', marginTop: 4 }}>
                            {teamData.members.filter(m => m.status === 'active' && m.role !== 'owner').every(m => !m.allowed_listing_ids)
                              ? 'All active members currently have access to all properties.'
                              : 'Some members have restricted property access. Click cells to toggle.'}
                          </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--sr-border)' }}>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', width: '25%' }}>Member</th>
                                {listings.map(l => (
                                  <th key={l.id} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sr-sub)' }}>
                                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{l.title?.split(' ').slice(0, 2).join(' ') || 'Property'}</div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {teamData.members.filter(m => m.status === 'active').map((m, i) => (
                                <tr key={m.id} style={{ borderBottom: '1px solid var(--sr-border)', background: i % 2 === 1 ? 'var(--sr-overlay-xs)' : 'transparent' }}>
                                  <td style={{ padding: '12px 24px' }}>
                                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--sr-text)' }}>{m.full_name || m.email || '—'}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', textTransform: 'capitalize', marginTop: 2 }}>{m.role}</div>
                                  </td>
                                  {listings.map(l => {
                                    const hasAccess = m.role === 'owner' || !m.allowed_listing_ids || m.allowed_listing_ids.includes(l.id)
                                    const cellKey = `${m.id}:${l.id}`
                                    const busy = !!accessLoading[cellKey]
                                    const isOwnerRow = m.role === 'owner'
                                    return (
                                      <td key={l.id} style={{ padding: '10px 16px', textAlign: 'center' }}>
                                        {isOwnerRow ? (
                                          <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.85rem' }}>✓</span>
                                        ) : hasAccess ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                            <span style={{ color: '#4ade80', fontWeight: 700, fontSize: '0.85rem' }}>✓</span>
                                            {teamData.caller_role === 'owner' && (
                                              <button
                                                onClick={() => togglePropertyAccess(m.id, l.id, true)}
                                                disabled={busy}
                                                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: '0.58rem', color: '#f87171', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', lineHeight: 1.5 }}
                                              >
                                                {busy ? '…' : 'Remove'}
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                            <span style={{ color: 'var(--sr-sub)', fontSize: '0.85rem' }}>—</span>
                                            {teamData.caller_role === 'owner' && (
                                              <button
                                                onClick={() => togglePropertyAccess(m.id, l.id, false)}
                                                disabled={busy}
                                                style={{ background: 'rgba(110,164,244,0.08)', border: '1px solid rgba(110,164,244,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: '0.58rem', color: '#6ea4f4', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', lineHeight: 1.5 }}
                                              >
                                                {busy ? '…' : 'Add'}
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                              {teamData.members.filter(m => m.status === 'active').length === 0 && (
                                <tr>
                                  <td colSpan={listings.length + 1} style={{ padding: '32px', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>No active team members.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!teamLoading && !teamData && (
                  <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, padding: '40px', textAlign: 'center', maxWidth: 480 }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏢</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 8 }}>No organisation</div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--sr-sub)', lineHeight: 1.6 }}>Property access control is only available for host organisations.</div>
                  </div>
                )}
              </div>
            )}

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

                {teamLoading && !teamData && (
                  <div style={{ color: 'var(--sr-sub)', fontSize: '0.88rem', padding: '40px 0' }}>Loading…</div>
                )}

                <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--sr-border)' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--sr-text)' }}>Recent Activity</div>
                  </div>
                  <div style={{ padding: '0 24px' }}>
                    {teamData?.members?.length > 0 ? (
                      teamData.members
                        .flatMap(m => {
                          const events = []
                          if (m.invited_at) events.push({ name: m.full_name || m.invite_email || m.email || 'Unknown', role: m.role, action: `Invited as ${m.role}`, at: m.invited_at, icon: '📨' })
                          if (m.accepted_at) events.push({ name: m.full_name || m.invite_email || m.email || 'Unknown', role: m.role, action: 'Accepted invitation', at: m.accepted_at, icon: '✅' })
                          return events
                        })
                        .sort((a, b) => new Date(b.at) - new Date(a.at))
                        .map((ev, i, arr) => {
                          const RC = { owner: '#F4601A', manager: '#60a5fa', staff: '#4ade80', finance: '#fcd34d' }
                          return (
                            <div key={i} style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--sr-border)' : 'none', alignItems: 'flex-start' }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>{ev.icon}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.84rem', color: 'var(--sr-text)', fontWeight: 600 }}>
                                  <span style={{ color: RC[ev.role] || 'var(--sr-orange)' }}>{ev.name}</span> — {ev.action}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginTop: 3 }}>
                                  {new Date(ev.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          )
                        })
                    ) : (
                      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>
                        No activity yet. Invite your first team member to get started.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeNav === 'settings' && (
              <div>
                <div className="hd-page-title">Settings</div>
                <div className="hd-page-sub">Manage your host profile and account preferences.</div>

                {/* Profile card */}
                <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '16px', padding: '24px', marginBottom: '16px', maxWidth: '560px' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: '16px' }}>Profile information</div>
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

                {/* Switch to guest */}
                <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: '16px', padding: '24px', maxWidth: '560px' }}>
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
                      style={{ flexShrink: 0, background: 'var(--sr-redl)', color: 'var(--sr-red)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '9px 18px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' }}
                    >
                      Switch account
                    </button>
                  </div>
                </div>
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
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 700, color: 'var(--sr-text)' }}>Invite Team Member</div>
              <button onClick={() => setInviteModal(false)} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: 8 }}>Email Address</label>
              <input type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} style={{ width: '100%', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '11px 14px', color: 'var(--sr-text)', fontSize: '0.86rem', fontFamily: 'Syne, sans-serif', outline: 'none' }} />
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
                  <button key={value} onClick={() => { setInviteRole(value); setInviteCustomRoleId(null) }} style={{ background: inviteRole === value ? `${color}18` : 'var(--sr-card2)', border: `1.5px solid ${inviteRole === value ? color : 'var(--sr-border)'}`, borderRadius: 12, padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Syne, sans-serif' }}>
                    <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: inviteRole === value ? color : 'var(--sr-text)', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', lineHeight: 1.4 }}>{desc}</div>
                  </button>
                ))}
                {/* Custom roles */}
                {customRoles.map(cr => (
                  <button key={cr.id} onClick={() => { setInviteRole('custom'); setInviteCustomRoleId(cr.id) }} style={{ background: inviteRole === 'custom' && inviteCustomRoleId === cr.id ? 'rgba(196,181,253,0.12)' : 'var(--sr-card2)', border: `1.5px solid ${inviteRole === 'custom' && inviteCustomRoleId === cr.id ? '#c084fc' : 'var(--sr-border)'}`, borderRadius: 12, padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Syne, sans-serif' }}>
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
              <textarea rows={3} placeholder="Add a personal message to the invite…" value={inviteNote} onChange={e => setInviteNote(e.target.value)} style={{ width: '100%', background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '11px 14px', color: 'var(--sr-text)', fontSize: '0.86rem', fontFamily: 'Syne, sans-serif', outline: 'none', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setInviteModal(false)} disabled={inviteSending} style={{ flex: 1, background: 'var(--sr-card2)', color: 'var(--sr-muted)', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Cancel</button>
              <button onClick={sendInvite} disabled={inviteSending || !inviteEmail.trim()} style={{ flex: 2, background: inviteSending || !inviteEmail.trim() ? 'var(--sr-card2)' : 'var(--sr-orange)', color: inviteSending || !inviteEmail.trim() ? 'var(--sr-sub)' : 'white', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: '0.88rem', cursor: inviteSending || !inviteEmail.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', transition: 'all 0.15s' }}>
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
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: '12px', textAlign: 'center' }}>
              Switch to Guest View?
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--sr-sub)', lineHeight: 1.7, marginBottom: '24px', textAlign: 'center' }}>
              Browse and book properties as a guest. Your listings stay active and your host account is untouched — switch back any time from the nav bar.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSwitchModal(false)}
                disabled={switching}
                style={{ flex: 1, background: 'var(--sr-card2)', color: 'var(--sr-muted)', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchToGuest}
                disabled={switching}
                style={{ flex: 2, background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 700, fontSize: '0.88rem', cursor: switching ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', opacity: switching ? 0.6 : 1 }}
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
                <button onClick={closeHostCancelModal} style={{ background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--sr-text)', marginBottom: 6 }}>Cancel booking</div>
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
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 8, fontSize: '0.84rem', color: 'var(--sr-text)', fontFamily: 'Syne, sans-serif', resize: 'vertical', outline: 'none', marginBottom: 18 }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeHostCancelModal} style={{ flex: 1, background: 'var(--sr-card2)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', color: 'var(--sr-muted)', fontFamily: 'Syne, sans-serif' }}>
                    Keep booking
                  </button>
                  <button onClick={handleHostCancel} disabled={hostCancelling || !hostCancelReason.trim()}
                    style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: '0.86rem', fontWeight: 700, cursor: hostCancelReason.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Syne, sans-serif', opacity: (hostCancelling || !hostCancelReason.trim()) ? 0.6 : 1 }}>
                    {hostCancelling ? 'Cancelling…' : 'Cancel booking'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Reply to Review Modal ──────────────────────────────────────── */}
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
                style={{ flex: 1, background: 'var(--sr-bg)', border: '1px solid var(--sr-border)', borderRadius: 10, padding: '10px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', color: 'var(--sr-muted)', fontFamily: 'Syne, sans-serif' }}>
                Cancel
              </button>
              <button onClick={submitReply} disabled={replySaving}
                style={{ flex: 1, background: 'var(--sr-orange)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: '0.86rem', fontWeight: 700, cursor: replySaving ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', opacity: replySaving ? 0.6 : 1 }}>
                {replySaving ? 'Saving…' : replyModal.host_reply ? 'Update response' : 'Post response'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
