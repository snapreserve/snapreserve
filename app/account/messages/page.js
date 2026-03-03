'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

function fmt(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MessagesPage() {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)   // active thread's booking_id
  const [messages, setMessages] = useState([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id))
    fetch('/api/account/messages').then(r => r.json()).then(data => {
      setThreads(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  async function openThread(bookingId) {
    setActive(bookingId)
    setMsgsLoading(true)
    const res = await fetch(`/api/account/messages/${bookingId}`)
    const data = await res.json()
    setMessages(Array.isArray(data) ? data : [])
    setMsgsLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    // Mark thread as read in local state
    setThreads(ts => ts.map(t => t.booking_id === bookingId ? { ...t, unread: false } : t))
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!draft.trim() || !active) return
    setSending(true)
    const res = await fetch(`/api/account/messages/${active}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: draft.trim() }),
    })
    const msg = await res.json()
    setSending(false)
    if (res.ok) {
      setMessages(m => [...m, msg])
      setDraft('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  const activeThread = threads.find(t => t.booking_id === active)

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>Messages</h1>
        <p style={{ fontSize: '0.88rem', color: '#6B5F54' }}>Chat with hosts about your stays.</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', minHeight: '520px' }}>
        {/* Thread list */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          {loading && <div style={{ color: '#A89880', fontSize: '0.84rem' }}>Loading…</div>}
          {!loading && threads.length === 0 && (
            <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#A89880', fontSize: '0.84rem' }}>
              No messages yet
            </div>
          )}
          {threads.map(t => (
            <button key={t.booking_id} onClick={() => openThread(t.booking_id)} style={{
              width: '100%', background: active === t.booking_id ? 'white' : 'transparent',
              border: active === t.booking_id ? '1px solid #E8E2D9' : '1px solid transparent',
              borderRadius: '12px', padding: '14px', cursor: 'pointer', fontFamily: 'inherit',
              textAlign: 'left', marginBottom: '6px', transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: t.unread ? 700 : 600, fontSize: '0.84rem', color: '#1A1410', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.booking?.listings?.title ?? 'Booking'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#A89880', flexShrink: 0, marginLeft: '8px' }}>
                  {fmt(t.latest_at)}
                </div>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#A89880', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.latest_message}
              </div>
              {t.unread && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F4601A', marginTop: '6px' }} />
              )}
            </button>
          ))}
        </div>

        {/* Message pane */}
        <div style={{ flex: 1, background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!active ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A89880', fontSize: '0.88rem' }}>
              Select a conversation
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8E2D9' }}>
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                  {activeThread?.booking?.listings?.title}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#A89880' }}>
                  {activeThread?.booking?.check_in} – {activeThread?.booking?.check_out}
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {msgsLoading && <div style={{ color: '#A89880', fontSize: '0.84rem' }}>Loading…</div>}
                {messages.map(m => {
                  const mine = m.sender_id === userId
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '72%', padding: '10px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: mine ? '#F4601A' : '#F3F0EB',
                        color: mine ? 'white' : '#1A1410',
                        fontSize: '0.84rem', lineHeight: 1.6,
                      }}>
                        {m.message}
                        <div style={{ fontSize: '0.66rem', marginTop: '4px', opacity: 0.65, textAlign: 'right' }}>
                          {fmt(m.created_at)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid #E8E2D9' }}>
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  style={{
                    flex: 1, padding: '10px 14px', border: '1px solid #E8E2D9',
                    borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <button type="submit" disabled={sending || !draft.trim()} style={{
                  background: '#F4601A', color: 'white', border: 'none', borderRadius: '10px',
                  padding: '10px 20px', fontSize: '0.84rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', opacity: sending ? 0.6 : 1,
                }}>
                  {sending ? '…' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
