'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

function HostInbox({ userId, onAdminRead, unreadAdminCount = 0 }) {
  const [tab,          setTab]          = useState('inbox')
  const [convs,        setConvs]        = useState([])
  const [convLoading,  setConvLoading]  = useState(true)
  const [activeId,     setActiveId]     = useState(null)
  const [thread,       setThread]       = useState(null)
  const [threadLoading,setThreadLoading]= useState(false)
  const [draft,        setDraft]        = useState('')
  const [sending,      setSending]      = useState(false)
  const [toast,        setToast]        = useState(null)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', height: 'calc(100vh - 130px)' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999, background: toast.type === 'error' ? '#DC2626' : '#16A34A', color: 'white', padding: '12px 20px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        <button
          onClick={() => setTab('inbox')}
          style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', fontFamily: 'inherit', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', background: tab === 'inbox' ? '#F4601A' : 'rgba(255,255,255,0.06)', color: tab === 'inbox' ? 'white' : 'rgba(255,255,255,0.5)' }}
        >
          Guest Inbox {totalConvUnread > 0 && <span style={{ marginLeft: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '100px', padding: '1px 6px', fontSize: '0.68rem' }}>{totalConvUnread}</span>}
        </button>
        <button
          onClick={() => setTab('notifications')}
          style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', fontFamily: 'inherit', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', background: tab === 'notifications' ? '#F4601A' : 'rgba(255,255,255,0.06)', color: tab === 'notifications' ? 'white' : 'rgba(255,255,255,0.5)' }}
        >
          🛡️ SnapReserve Support {unreadAdminCount > 0 && <span style={{ marginLeft: '4px', background: 'rgba(255,255,255,0.25)', borderRadius: '100px', padding: '1px 6px', fontSize: '0.68rem' }}>{unreadAdminCount}</span>}
        </button>
      </div>

      {tab === 'notifications' && (
        <MessagesTab userId={userId} onRead={onAdminRead} />
      )}

      {tab === 'inbox' && (
        <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
          {/* Conversation list */}
          <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
            {convLoading && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>Loading…</div>}
            {!convLoading && convs.length === 0 && (
              <div style={{ background: '#1A1712', border: '1px solid #2A2420', borderRadius: '12px', padding: '28px', textAlign: 'center', color: '#6B5E52', fontSize: '0.82rem' }}>
                No guest messages yet.
              </div>
            )}
            {convs.map(c => {
              const unread   = c.host_unread_count || 0
              const isActive = activeId === c.id
              const img      = Array.isArray(c.listing?.images) ? c.listing.images[0] : null

              return (
                <button
                  key={c.id}
                  onClick={() => openThread(c.id)}
                  style={{ width: '100%', textAlign: 'left', background: isActive ? '#2A2420' : 'transparent', border: isActive ? '1px solid #F4601A' : '1px solid transparent', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginBottom: '2px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: unread > 0 ? 700 : 600, color: '#F5F0EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {c.listing?.title || 'Listing'}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#6B5E52', flexShrink: 0 }}>{fmtMsg(c.last_message_at)}</div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#A89880' }}>
                    {c.guest?.full_name || '—'}
                    {c.is_booked_guest_chat && <span style={{ marginLeft: '4px', color: '#4ADE80', fontWeight: 700 }}>✓</span>}
                    {c.status === 'blocked' && <span style={{ marginLeft: '4px', color: '#F87171' }}> · Blocked</span>}
                  </div>
                  <div style={{ fontSize: '0.71rem', color: '#6B5E52', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message_preview || 'No messages yet'}
                  </div>
                  {unread > 0 && (
                    <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F4601A' }} />
                      <span style={{ fontSize: '0.62rem', color: '#F4601A', fontWeight: 700 }}>{unread} new</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Thread pane */}
          <div style={{ flex: 1, background: '#1A1712', border: '1px solid #2A2420', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {!activeId ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B5E52', gap: '8px' }}>
                <div style={{ fontSize: '2rem' }}>💬</div>
                <div style={{ fontSize: '0.84rem' }}>Select a conversation</div>
              </div>
            ) : threadLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B5E52', fontSize: '0.84rem' }}>Loading…</div>
            ) : (
              <>
                {/* Header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2420', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#F5F0EB' }}>
                      {convs.find(c => c.id === activeId)?.listing?.title || 'Conversation'}
                      {conv?.is_booked_guest_chat && <span style={{ marginLeft: '8px', fontSize: '0.62rem', fontWeight: 700, background: 'rgba(74,222,128,0.1)', color: '#4ADE80', padding: '2px 6px', borderRadius: '100px' }}>✓ Booked</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#A89880', marginTop: '2px' }}>
                      Guest: {convs.find(c => c.id === activeId)?.guest?.full_name || '—'}
                      {blocked && <span style={{ marginLeft: '6px', color: '#F87171', fontWeight: 700 }}>· Blocked</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => doBlock(conv)}
                    style={{ fontSize: '0.72rem', fontWeight: 700, padding: '5px 12px', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', borderColor: blocked ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)', background: blocked ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', color: blocked ? '#4ADE80' : '#F87171' }}
                  >
                    {blocked ? 'Unblock' : '🚫 Block'}
                  </button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(thread?.messages || []).length === 0 && (
                    <div style={{ textAlign: 'center', color: '#6B5E52', fontSize: '0.82rem', marginTop: '32px' }}>No messages yet.</div>
                  )}
                  {(thread?.messages || []).map(m => {
                    const mine = m.sender_id === userId
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '72%', padding: '9px 13px', fontSize: '0.84rem', lineHeight: 1.6,
                          borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: mine ? '#F4601A' : '#2A2420',
                          color: mine ? 'white' : '#F5F0EB',
                        }}>
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

                {/* Compose */}
                {blocked ? (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #2A2420', textAlign: 'center', color: '#F87171', fontSize: '0.8rem', fontWeight: 600 }}>
                    You have blocked this user.
                  </div>
                ) : (
                  <form onSubmit={sendMsg} style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderTop: '1px solid #2A2420' }}>
                    <input
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
                      placeholder="Type a message…"
                      maxLength={2000}
                      style={{ flex: 1, padding: '9px 13px', background: '#0F0D0A', border: '1px solid #2A2420', borderRadius: '9px', color: '#F5F0EB', fontSize: '0.84rem', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      style={{ background: '#F4601A', color: 'white', border: 'none', borderRadius: '9px', padding: '9px 18px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (sending || !draft.trim()) ? 0.5 : 1 }}
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

function MessagesTab({ userId, onRead }) {
  const [msgs, setMsgs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [replies, setReplies]   = useState({})   // { [msgId]: draft text }
  const [sending, setSending]   = useState(null) // msgId currently sending
  const [toast, setToast]       = useState(null)

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

      // Mark all unread as read
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
      // Update local state
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

  if (loading) return <div style={{color:'rgba(255,255,255,0.3)',fontSize:'0.86rem'}}>Loading…</div>

  return (
    <>
      {toast && (
        <div style={{
          position:'fixed', bottom:'24px', right:'24px', padding:'12px 20px',
          borderRadius:'12px', fontSize:'0.85rem', fontWeight:600, zIndex:9999,
          background: toast.type === 'error' ? '#DC2626' : '#16A34A', color:'white',
        }}>
          {toast.msg}
        </div>
      )}

      {!msgs.length ? (
        <div className="inbox-empty">
          <div style={{fontSize:'2rem',marginBottom:'12px'}}>🛡️</div>
          <div style={{fontWeight:700,marginBottom:'6px'}}>No messages from SnapReserve yet.</div>
          <div style={{fontSize:'0.78rem',color:'#6B5E52',maxWidth:'260px',margin:'0 auto',lineHeight:1.6}}>
            If there's an issue with your listing or account, our support team will reach out here.
          </div>
        </div>
      ) : (
        <div className="inbox">
          <div style={{ background: 'rgba(244,96,26,0.06)', border: '1px solid rgba(244,96,26,0.18)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.1rem' }}>🛡️</span>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F5F0EB' }}>SnapReserve Support</div>
              <div style={{ fontSize: '0.72rem', color: '#A89880', marginTop: '1px' }}>Official messages from the SnapReserve team about your listings and account. You can reply directly here.</div>
            </div>
          </div>
          {msgs.map(m => {
            const cfg = MSG_TYPE_CFG[m.type] || MSG_TYPE_CFG.info
            const hasReplied = !!m.reply_body
            const draft = replies[m.id] || ''

            return (
              <div key={m.id} className={`inbox-msg ${!m.is_read ? 'unread' : ''}`}>
                <div style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:'100px',fontSize:'0.62rem',fontWeight:700,background:cfg.bg,color:cfg.color,marginBottom:'8px'}}>
                  {cfg.label}
                </div>
                <div className="inbox-msg-header">
                  <div className={`inbox-msg-subject ${!m.is_read ? 'unread' : ''}`}>
                    {m.subject || '(no subject)'}
                  </div>
                  <div className="inbox-msg-date">{fmtDate(m.created_at)}</div>
                </div>
                <div className="inbox-msg-body">{m.body}</div>

                {/* Previous reply */}
                {hasReplied && (
                  <div style={{
                    marginTop:'12px', background:'rgba(255,255,255,0.04)',
                    border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px',
                    padding:'10px 14px',
                  }}>
                    <div style={{fontSize:'0.65rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'rgba(255,255,255,0.3)',marginBottom:'4px'}}>
                      Your reply · {fmtDate(m.replied_at)}
                    </div>
                    <div style={{fontSize:'0.82rem',color:'#D0C8BE',lineHeight:1.6,whiteSpace:'pre-wrap'}}>
                      {m.reply_body}
                    </div>
                  </div>
                )}

                {/* Reply box — always available so host can send follow-ups */}
                <div style={{marginTop:'12px'}}>
                  <textarea
                    style={{
                      width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)',
                      borderRadius:'10px', padding:'10px 14px', color:'#F5F0EB', fontSize:'0.82rem',
                      resize:'vertical', minHeight:'64px', outline:'none', fontFamily:'inherit',
                      boxSizing:'border-box',
                    }}
                    placeholder={hasReplied ? 'Send a follow-up…' : 'Write a reply…'}
                    value={draft}
                    onChange={e => setReplies(prev => ({ ...prev, [m.id]: e.target.value }))}
                    onFocus={e => { e.target.style.borderColor = '#F4601A' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                  <div style={{display:'flex',justifyContent:'flex-end',marginTop:'6px'}}>
                    <button
                      onClick={() => submitReply(m.id)}
                      disabled={!draft || sending === m.id}
                      style={{
                        background: draft ? '#F4601A' : 'rgba(255,255,255,0.08)',
                        color: draft ? 'white' : 'rgba(255,255,255,0.3)',
                        border:'none', borderRadius:'8px', padding:'8px 18px',
                        fontSize:'0.8rem', fontWeight:700, cursor: draft ? 'pointer' : 'not-allowed',
                        fontFamily:'inherit', transition:'all 0.15s',
                      }}
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

const NAV = [
  { id: 'properties', label: 'My Properties', icon: '🏠' },
  { id: 'bookings',   label: 'Bookings',       icon: '📅' },
  { id: 'earnings',   label: 'Earnings',        icon: '💰' },
  { id: 'calendar',   label: 'Calendar',        icon: '🗓️' },
  { id: 'messages',   label: 'Messages',        icon: '💬' },
  { id: 'reviews',    label: 'Reviews',         icon: '⭐' },
  { id: 'payouts',    label: 'Payouts',         icon: '💳' },
  { id: 'settings',   label: 'Settings',        icon: '⚙️' },
]

const STATUS_CONFIG = {
  live:               { label: '● Live',              color: '#4ADE80', bg: '#16A34A' },
  approved:           { label: '✅ Approved',          color: '#F4601A', bg: '#F4601A' },
  pending_review:     { label: '⏳ Pending Review',    color: '#FCD34D', bg: '#D97706' },
  changes_requested:  { label: '🔄 Changes Needed',   color: '#93C5FD', bg: '#2563EB' },
  rejected:           { label: '❌ Rejected',          color: '#F87171', bg: '#DC2626' },
  draft:              { label: '○ Draft',             color: 'rgba(255,255,255,0.4)', bg: '#374151' },
  suspended:          { label: '🚫 Suspended',         color: '#DC2626', bg: '#DC2626' },
  pending_reapproval: { label: '⏳ Under Review',      color: '#D97706', bg: '#D97706' },
}

function statusCfg(s) {
  return STATUS_CONFIG[s] || STATUS_CONFIG.draft
}

export default function HostDashboard() {
  const router = useRouter()
  const [profile, setProfile]           = useState(null)
  const [listings, setListings]         = useState([])
  const [changeRequests, setChangeRequests] = useState({}) // { [listing_id]: [{notes, admin_email, created_at}] }
  const [loading, setLoading]           = useState(true)
  const [activeNav, setActiveNav]       = useState('properties')
  const [actionLoading, setActionLoading] = useState(null) // listing id currently acting on
  const [toast, setToast]               = useState(null)
  const [expandedCR, setExpandedCR]     = useState(null) // listing_id with expanded change notes
  const [switchModal, setSwitchModal]   = useState(false)
  const [switching, setSwitching]       = useState(false)
  const [explanations, setExplanations] = useState({}) // { [listing_id]: string }
  const [unreadMsgCount,  setUnreadMsgCount]  = useState(0)
  const [convUnreadCount, setConvUnreadCount] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: prof }, { data: lists }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('listings').select('*').eq('host_id', user.id).order('created_at', { ascending: false }),
      ])

      setProfile(prof)
      const listArr = lists || []
      setListings(listArr)

      // Fetch unread host messages count
      const { count: msgCount } = await supabase
        .from('host_messages')
        .select('id', { count: 'exact', head: true })
        .eq('host_user_id', user.id)
        .eq('is_read', false)
      setUnreadMsgCount(msgCount || 0)

      // Fetch conversation unread count (host_unread_count sum)
      const { data: convData } = await supabase
        .from('conversations')
        .select('host_unread_count')
        .eq('host_user_id', user.id)
        .eq('status', 'active')
      const totalConvUnread = (convData || []).reduce((n, c) => n + (c.host_unread_count || 0), 0)
      setConvUnreadCount(totalConvUnread)

      // Fetch change requests for all listings
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
        go_live:   '🚀 Your listing is now live!',
        unpublish: 'Listing unpublished.',
        resubmit:  '📤 Resubmitted for review.',
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
      showToast('Explanation submitted. We\'ll review it shortly.')
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

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0F0D0A'}}>
      <div style={{color:'rgba(255,255,255,0.4)',fontSize:'0.9rem'}}>Loading…</div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#0F0D0A; color:#F5F0EB; }
        .layout { display:flex; min-height:100vh; }
        .sidebar { width:220px; background:#0F0D0A; border-right:1px solid rgba(255,255,255,0.07); display:flex; flex-direction:column; position:fixed; top:0; left:0; bottom:0; z-index:100; }
        .sidebar-logo { padding:22px 20px 18px; border-bottom:1px solid rgba(255,255,255,0.07); }
        .logo-text { font-family:'Playfair Display',serif; font-size:1.15rem; font-weight:900; color:white; text-decoration:none; display:block; }
        .logo-text span { color:#F4601A; }
        .logo-sub { font-size:0.62rem; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.12em; margin-top:2px; }
        .sidebar-nav { flex:1; padding:16px 12px; overflow-y:auto; }
        .nav-item { display:flex; align-items:center; gap:10px; padding:10px 10px; border-radius:10px; cursor:pointer; margin-bottom:2px; color:rgba(255,255,255,0.45); font-size:0.86rem; font-weight:500; transition:all 0.15s; }
        .nav-item:hover { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.85); }
        .nav-item.active { background:#F4601A; color:white; font-weight:700; }
        .sidebar-footer { padding:12px 12px; border-top:1px solid rgba(255,255,255,0.07); }
        .mode-toggle { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:10px; margin-bottom:8px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); text-decoration:none; transition:all 0.15s; }
        .mode-toggle:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.12); }
        .mode-toggle-icon { font-size:0.9rem; width:20px; text-align:center; }
        .mode-toggle-label { font-size:0.78rem; font-weight:600; color:rgba(255,255,255,0.5); }
        .mode-toggle-sub { font-size:0.62rem; color:rgba(255,255,255,0.25); margin-top:1px; }
        .user-row { display:flex; align-items:center; gap:10px; padding:8px; border-radius:10px; cursor:pointer; }
        .user-row:hover { background:rgba(255,255,255,0.06); }
        .avatar { width:32px; height:32px; border-radius:50%; background:#F4601A; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.78rem; color:white; flex-shrink:0; }
        .user-name { font-size:0.78rem; font-weight:700; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .user-role { font-size:0.64rem; color:rgba(255,255,255,0.35); }
        .logout-btn { background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:0.9rem; padding:4px; flex-shrink:0; }
        .logout-btn:hover { color:white; }
        .main { margin-left:220px; flex:1; display:flex; flex-direction:column; }
        .topbar { display:flex; align-items:center; justify-content:space-between; padding:0 32px; height:64px; border-bottom:1px solid rgba(255,255,255,0.07); background:#0F0D0A; position:sticky; top:0; z-index:50; }
        .add-btn { background:#F4601A; color:white; border:none; border-radius:10px; padding:9px 18px; font-size:0.84rem; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-block; }
        .add-btn:hover { background:#FF7A35; }
        .content { padding:28px 32px; flex:1; }

        /* PROPERTY GRID */
        .prop-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .prop-card { background:#1A1712; border:1px solid rgba(255,255,255,0.08); border-radius:16px; overflow:hidden; transition:all 0.2s; position:relative; }
        .prop-card:hover { border-color:rgba(255,255,255,0.15); transform:translateY(-2px); box-shadow:0 8px 32px rgba(0,0,0,0.4); }
        .prop-img { height:160px; position:relative; overflow:hidden; background:#1F1C18; display:flex; align-items:center; justify-content:center; }
        .prop-img-placeholder { font-size:3rem; opacity:0.3; }
        .prop-status-badge { position:absolute; top:10px; left:10px; padding:3px 10px; border-radius:100px; font-size:0.66rem; font-weight:700; }
        .prop-body { padding:16px 18px; }
        .prop-name { font-size:0.96rem; font-weight:700; color:#F5F0EB; margin-bottom:4px; }
        .prop-loc { font-size:0.74rem; color:rgba(255,255,255,0.4); margin-bottom:14px; }
        .prop-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:14px; }
        .prop-stat { background:rgba(255,255,255,0.04); border-radius:8px; padding:8px; text-align:center; }
        .prop-stat-val { font-size:0.92rem; font-weight:700; color:#F4601A; }
        .prop-stat-lbl { font-size:0.62rem; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.05em; margin-top:2px; }
        .prop-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .prop-btn { border-radius:8px; padding:9px; font-size:0.8rem; font-weight:700; cursor:pointer; font-family:inherit; border:none; text-align:center; text-decoration:none; display:block; transition:opacity 0.15s; }
        .prop-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .prop-btn.green { background:#16A34A; color:white; }
        .prop-btn.orange { background:#F4601A; color:white; }
        .prop-btn.secondary { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.6); }
        .prop-btn.danger { background:rgba(248,113,113,0.1); color:#F87171; border:1px solid rgba(248,113,113,0.2); }
        .prop-btn:hover:not(:disabled) { opacity:0.85; }

        /* Status info banners */
        .status-banner { border-radius:10px; padding:12px 14px; margin-bottom:12px; font-size:0.8rem; line-height:1.6; }
        .status-banner.pending { background:rgba(251,191,36,0.06); border:1px solid rgba(251,191,36,0.15); color:#FCD34D; }
        .status-banner.changes { background:rgba(96,165,250,0.06); border:1px solid rgba(96,165,250,0.2); color:#93C5FD; }
        .status-banner.approved { background:rgba(244,96,26,0.06); border:1px solid rgba(244,96,26,0.2); color:#F4601A; }
        .status-banner.rejected { background:rgba(248,113,113,0.06); border:1px solid rgba(248,113,113,0.15); color:#F87171; }
        .status-banner.suspended { background:rgba(220,38,38,0.06); border:1px solid rgba(220,38,38,0.2); color:#F87171; }
        .status-banner.reapproval { background:rgba(217,119,6,0.06); border:1px solid rgba(217,119,6,0.2); color:#FCD34D; }
        .explanation-area { margin-top:10px; }
        .explanation-input { width:100%; background:#0F0D0A; border:1px solid rgba(248,113,113,0.3); border-radius:8px; padding:8px 12px; color:#F5F0EB; font-size:0.8rem; resize:vertical; min-height:64px; outline:none; font-family:inherit; box-sizing:border-box; }
        .explanation-input:focus { border-color:#F87171; }
        .explanation-submit { margin-top:8px; background:rgba(248,113,113,0.12); color:#F87171; border:1px solid rgba(248,113,113,0.3); border-radius:8px; padding:7px 14px; font-size:0.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .explanation-submit:disabled { opacity:0.4; cursor:not-allowed; }
        .msg-badge { display:inline-flex; align-items:center; justify-content:center; background:#DC2626; color:white; border-radius:100px; font-size:0.62rem; font-weight:800; min-width:16px; height:16px; padding:0 4px; margin-left:4px; }
        /* Messages tab */
        .inbox { display:flex; flex-direction:column; gap:10px; max-width:720px; }
        .inbox-msg { background:#1A1712; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px 20px; transition:border-color 0.15s; }
        .inbox-msg.unread { border-color:rgba(244,96,26,0.35); }
        .inbox-msg-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px; }
        .inbox-msg-subject { font-size:0.92rem; font-weight:700; color:#F5F0EB; }
        .inbox-msg-subject.unread { color:#F4601A; }
        .inbox-msg-date { font-size:0.7rem; color:#6B5E52; flex-shrink:0; }
        .inbox-msg-body { font-size:0.84rem; color:#D0C8BE; line-height:1.7; white-space:pre-wrap; }
        .inbox-msg-type { display:inline-flex; align-items:center; padding:2px 8px; border-radius:100px; font-size:0.62rem; font-weight:700; margin-bottom:8px; }
        .inbox-empty { text-align:center; padding:60px 20px; color:#6B5E52; font-size:0.86rem; }

        /* Change notes */
        .cr-box { background:#0F0D0A; border:1px solid rgba(96,165,250,0.2); border-radius:10px; padding:14px; margin-bottom:12px; }
        .cr-box-title { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#93C5FD; margin-bottom:8px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
        .cr-note { font-size:0.82rem; color:#F5F0EB; line-height:1.65; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
        .cr-note:last-child { border-bottom:none; }
        .cr-date { font-size:0.7rem; color:#6B5E52; margin-top:3px; }

        /* ADD CARD */
        .add-card { background:rgba(255,255,255,0.02); border:2px dashed rgba(255,255,255,0.1); border-radius:16px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:280px; cursor:pointer; transition:all 0.2s; text-decoration:none; }
        .add-card:hover { border-color:rgba(244,96,26,0.4); background:rgba(244,96,26,0.04); }
        .add-icon { width:48px; height:48px; border-radius:50%; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; font-size:1.4rem; margin-bottom:12px; }
        .add-title { font-size:0.92rem; font-weight:700; color:rgba(255,255,255,0.5); margin-bottom:4px; }
        .add-sub { font-size:0.74rem; color:rgba(255,255,255,0.25); }

        .empty { text-align:center; padding:72px 20px; }
        .empty-icon { font-size:2.8rem; margin-bottom:16px; }
        .empty-title { font-family:'Playfair Display',serif; font-size:1.3rem; font-weight:700; margin-bottom:8px; }
        .empty-sub { font-size:0.84rem; color:rgba(255,255,255,0.4); margin-bottom:24px; }

        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:12px; font-size:0.86rem; font-weight:600; z-index:9999; animation:fadeIn 0.2s; max-width:320px; }
        .toast.success { background:#16A34A; color:white; }
        .toast.error { background:#DC2626; color:white; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        @media(max-width:1100px) { .prop-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:768px) { .sidebar{display:none;} .main{margin-left:0;} .prop-grid{grid-template-columns:1fr;} .content{padding:20px;} }
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <a href="/" className="logo-text">Snap<span>Reserve</span></a>
            <div className="logo-sub">Host Dashboard</div>
          </div>
          <nav className="sidebar-nav">
            {NAV.map(item => (
              <div
                key={item.id}
                className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.id === 'messages' && (unreadMsgCount + convUnreadCount) > 0 && (
                  <span className="msg-badge">{unreadMsgCount + convUnreadCount}</span>
                )}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <a href="/dashboard" className="mode-toggle">
              <span className="mode-toggle-icon">🔍</span>
              <div>
                <div className="mode-toggle-label">Switch to Explore</div>
                <div className="mode-toggle-sub">Browse as a guest</div>
              </div>
            </a>
            <div className="user-row">
              <div className="avatar">{initials}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="user-name">{profile?.full_name || 'Host'}</div>
                <div className="user-role">Host Account</div>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Sign out">↪</button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="main">
          <div className="topbar">
            <div style={{fontWeight:700,fontSize:'1rem'}}>
              {NAV.find(n => n.id === activeNav)?.label}
            </div>
            {activeNav === 'properties' && (
              <a href="/list-property" className="add-btn">+ Add property</a>
            )}
          </div>

          <div className="content">
            {activeNav === 'properties' && (
              <div className="prop-grid">
                {listings.map(l => {
                  const cfg    = statusCfg(l.status)
                  const crs    = changeRequests[l.id] || []
                  const isActing = actionLoading === l.id
                  const crOpen = expandedCR === l.id

                  return (
                    <div key={l.id} className="prop-card">
                      {/* Image / placeholder */}
                      <div className="prop-img">
                        {Array.isArray(l.images) && l.images[0]
                          ? <img src={l.images[0]} alt={l.title} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : <div className="prop-img-placeholder">{l.type === 'hotel' ? '🏨' : '🏠'}</div>
                        }
                        <div
                          className="prop-status-badge"
                          style={{background: cfg.bg + '22', color: cfg.color, border: `1px solid ${cfg.color}44`}}
                        >
                          {cfg.label}
                        </div>
                      </div>

                      <div className="prop-body">
                        <div className="prop-name">{l.title}</div>
                        <div className="prop-loc">📍 {l.city}{l.state ? `, ${l.state}` : ''}</div>

                        {/* Status banners */}
                        {l.status === 'pending_review' && (
                          <div className="status-banner pending">
                            ⏳ Your listing is under review. We'll notify you within 24 hours.
                          </div>
                        )}
                        {l.status === 'approved' && (
                          <div className="status-banner approved">
                            ✅ Approved! Click "Go Live" to publish your listing.
                          </div>
                        )}
                        {l.status === 'rejected' && (
                          <div className="status-banner rejected">
                            ❌ Your listing was rejected. Contact support for details.
                          </div>
                        )}
                        {l.status === 'suspended' && (
                          <div className="status-banner suspended">
                            🚫 <strong>Listing suspended.</strong>
                            {l.suspension_reason && (
                              <div style={{marginTop:'4px',opacity:0.85}}>{l.suspension_reason}</div>
                            )}
                            <div className="explanation-area">
                              <textarea
                                className="explanation-input"
                                placeholder="Explain why this suspension should be lifted…"
                                value={explanations[l.id] || ''}
                                onChange={e => setExplanations(prev => ({ ...prev, [l.id]: e.target.value }))}
                              />
                              <button
                                className="explanation-submit"
                                onClick={() => submitExplanation(l.id)}
                                disabled={actionLoading === l.id}
                              >
                                {actionLoading === l.id ? 'Submitting…' : 'Submit explanation'}
                              </button>
                            </div>
                          </div>
                        )}
                        {l.status === 'pending_reapproval' && (
                          <div className="status-banner reapproval">
                            ⏳ Your explanation is under review. We'll get back to you shortly.
                          </div>
                        )}

                        {/* Change request notes */}
                        {l.status === 'changes_requested' && (
                          <div>
                            <div className="status-banner changes">
                              🔄 Our team has requested changes. Review the notes below, make your edits, then resubmit.
                            </div>
                            {crs.length > 0 && (
                              <div className="cr-box">
                                <div
                                  className="cr-box-title"
                                  onClick={() => setExpandedCR(crOpen ? null : l.id)}
                                >
                                  <span>Admin notes ({crs.length})</span>
                                  <span>{crOpen ? '▲' : '▼'}</span>
                                </div>
                                {crOpen && crs.map((cr, i) => (
                                  <div key={i} className="cr-note">
                                    <div>{cr.notes}</div>
                                    <div className="cr-date">
                                      {new Date(cr.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="prop-stats">
                          <div className="prop-stat">
                            <div className="prop-stat-val">${l.price_per_night}</div>
                            <div className="prop-stat-lbl">Per night</div>
                          </div>
                          <div className="prop-stat">
                            <div className="prop-stat-val" style={{color:'#4ADE80'}}>—</div>
                            <div className="prop-stat-lbl">Occupancy</div>
                          </div>
                          <div className="prop-stat">
                            <div className="prop-stat-val" style={{color:'#FCD34D'}}>{l.rating ?? '—'}</div>
                            <div className="prop-stat-lbl">Rating</div>
                          </div>
                        </div>

                        {/* Action buttons — status-gated */}
                        <div className="prop-actions">
                          {l.status === 'live' && (
                            <>
                              <a href={`/listings/${l.id}`} className="prop-btn secondary" target="_blank" rel="noreferrer">View listing</a>
                              <button
                                className="prop-btn secondary"
                                onClick={() => callListingAction(l.id, 'unpublish')}
                                disabled={isActing}
                              >
                                {isActing ? '…' : 'Unpublish'}
                              </button>
                            </>
                          )}

                          {l.status === 'approved' && (
                            <>
                              <button
                                className="prop-btn green"
                                onClick={() => callListingAction(l.id, 'go_live')}
                                disabled={isActing}
                              >
                                {isActing ? 'Publishing…' : '🚀 Go Live'}
                              </button>
                              <a href={`/listings/${l.id}`} className="prop-btn secondary" target="_blank" rel="noreferrer">Preview</a>
                            </>
                          )}

                          {l.status === 'pending_review' && (
                            <>
                              <button className="prop-btn secondary" disabled>⏳ In Review</button>
                              <a href={`/listings/${l.id}`} className="prop-btn secondary" target="_blank" rel="noreferrer">Preview</a>
                            </>
                          )}

                          {l.status === 'changes_requested' && (
                            <>
                              <button
                                className="prop-btn orange"
                                onClick={() => callListingAction(l.id, 'resubmit')}
                                disabled={isActing}
                              >
                                {isActing ? 'Submitting…' : '📤 Resubmit'}
                              </button>
                              <a href={`/listings/${l.id}`} className="prop-btn secondary" target="_blank" rel="noreferrer">Preview</a>
                            </>
                          )}

                          {l.status === 'rejected' && (
                            <>
                              <button className="prop-btn danger" disabled>❌ Rejected</button>
                              <a href="mailto:support@snapreserve.app" className="prop-btn secondary">Contact support</a>
                            </>
                          )}

                          {l.status === 'suspended' && (
                            <>
                              <button className="prop-btn danger" disabled>🚫 Suspended</button>
                              <a href="mailto:support@snapreserve.app" className="prop-btn secondary">Contact support</a>
                            </>
                          )}

                          {l.status === 'pending_reapproval' && (
                            <>
                              <button className="prop-btn secondary" disabled>⏳ Under Review</button>
                              <a href={`/listings/${l.id}`} className="prop-btn secondary" target="_blank" rel="noreferrer">Preview</a>
                            </>
                          )}

                          {(!l.status || l.status === 'draft') && (
                            <>
                              <a href="/list-property" className="prop-btn orange">Edit draft</a>
                              <button className="prop-btn secondary" disabled>Submit</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                <a href="/list-property" className="add-card">
                  <div className="add-icon">+</div>
                  <div className="add-title">Add new property</div>
                  <div className="add-sub">List your space on SnapReserve</div>
                </a>
              </div>
            )}

            {activeNav === 'settings' && (
              <div style={{ maxWidth: '560px' }}>
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
                    Settings
                  </h2>
                  <p style={{ fontSize: '0.86rem', color: 'rgba(255,255,255,0.4)' }}>
                    Manage your hosting preferences.
                  </p>
                </div>

                {/* Switch to Customer */}
                <div style={{
                  background: '#1A1712', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px', padding: '24px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: '6px' }}>
                        Switch to Customer account
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                        Stop hosting and browse as a guest. Your listing history is saved — you can re-enable hosting any time from your account settings.
                      </p>
                    </div>
                    <button
                      onClick={() => setSwitchModal(true)}
                      style={{
                        flexShrink: 0, background: 'rgba(248,113,113,0.1)',
                        color: '#F87171', border: '1px solid rgba(248,113,113,0.2)',
                        borderRadius: '10px', padding: '9px 18px', fontSize: '0.84rem',
                        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Switch account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeNav === 'messages' && (
              <HostInbox userId={profile?.id} onAdminRead={() => setUnreadMsgCount(0)} unreadAdminCount={unreadMsgCount} />
            )}

            {activeNav !== 'properties' && activeNav !== 'settings' && activeNav !== 'messages' && (
              <div className="empty">
                <div className="empty-icon">{NAV.find(n => n.id === activeNav)?.icon}</div>
                <div className="empty-title">{NAV.find(n => n.id === activeNav)?.label}</div>
                <div className="empty-sub">This section is coming soon.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Switch to Guest confirmation modal */}
      {switchModal && (
        <div
          onClick={e => e.target === e.currentTarget && !switching && setSwitchModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            background: '#1A1712', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '14px', textAlign: 'center' }}>🔄</div>
            <h2 style={{
              fontFamily: "'Playfair Display',serif", fontSize: '1.25rem',
              fontWeight: 700, color: '#F5F0EB', marginBottom: '12px', textAlign: 'center',
            }}>
              Switch to Customer?
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, marginBottom: '16px', textAlign: 'center' }}>
              You'll be switched to a guest account. Any live listings will be unpublished automatically.
            </p>

            {listings.filter(l => l.status === 'live').length > 0 && (
              <div style={{
                background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: '10px', padding: '12px 14px', fontSize: '0.82rem',
                color: '#FCD34D', marginBottom: '20px', lineHeight: 1.6,
              }}>
                ⚠️ {listings.filter(l => l.status === 'live').length} live listing{listings.filter(l => l.status === 'live').length > 1 ? 's' : ''} will be unpublished. You can re-enable hosting and republish at any time.
              </div>
            )}

            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: '24px' }}>
              Your listing history and earnings data are preserved.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSwitchModal(false)}
                disabled={switching}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)',
                  border: 'none', borderRadius: '10px', padding: '12px',
                  fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSwitchToGuest}
                disabled={switching}
                style={{
                  flex: 2, background: switching ? 'rgba(248,113,113,0.3)' : 'rgba(248,113,113,0.15)',
                  color: '#F87171', border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '10px', padding: '12px', fontWeight: 700,
                  fontSize: '0.88rem', cursor: switching ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {switching ? 'Switching…' : 'Yes, switch account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
