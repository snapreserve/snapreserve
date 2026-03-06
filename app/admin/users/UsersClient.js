'use client'
import { useState, useMemo } from 'react'

const AVATAR_COLORS = ['var(--sr-orange)','#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4']
function avatarColor(id = '') {
  const n = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

function AccountTypeBadge({ user }) {
  if (user.is_host || user.user_role === 'host') {
    const isAlsoGuest = user.booking_count > 0
    return (
      <span style={{ display: 'inline-flex', gap: '4px' }}>
        <span style={{ background: 'rgba(244,96,26,0.12)', color: 'var(--sr-orange)', border: '1px solid rgba(244,96,26,0.25)', borderRadius: 100, padding: '2px 9px', fontSize: '0.68rem', fontWeight: 700 }}>Host</span>
        {isAlsoGuest && <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 100, padding: '2px 9px', fontSize: '0.68rem', fontWeight: 700 }}>Guest</span>}
      </span>
    )
  }
  return <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 100, padding: '2px 9px', fontSize: '0.68rem', fontWeight: 700 }}>Guest</span>
}

function StatusBadge({ active, suspended }) {
  if (suspended) return <span style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 100, padding: '2px 9px', fontSize: '0.68rem', fontWeight: 700 }}>Suspended</span>
  if (active === false) return <span style={{ background: 'rgba(107,95,84,0.12)', color: 'var(--sr-muted)', border: '1px solid rgba(107,95,84,0.25)', borderRadius: 100, padding: '2px 9px', fontSize: '0.68rem', fontWeight: 700 }}>Deactivated</span>
  return <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 100, padding: '2px 9px', fontSize: '0.68rem', fontWeight: 700 }}>Active</span>
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtMoney(n) {
  return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const FILTERS = [
  { id: 'all',       label: 'All'       },
  { id: 'active',    label: 'Active'    },
  { id: 'hosts',     label: 'Hosts'     },
  { id: 'guests',    label: 'Guests'    },
  { id: 'suspended', label: 'Suspended' },
]

export default function UsersClient({ initialUsers, role }) {
  const [users, setUsers]         = useState(initialUsers)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [actionLoading, setAL]    = useState(null)
  const [toast, setToast]         = useState(null)
  const [msgModal, setMsgModal]   = useState(false)
  const [msgSubject, setMsgSubj]  = useState('')
  const [msgBody, setMsgBody]     = useState('')
  const [msgSending, setMsgSend]  = useState(false)
  const [suspModal, setSuspModal] = useState(false)
  const [suspReason, setSuspReason] = useState('')
  const [suspCat, setSuspCat]     = useState('policy_violation')
  const [suspending, setSuspending] = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const filtered = useMemo(() => {
    let list = users
    if (filter === 'active')    list = list.filter(u => u.is_active !== false && !u.suspended_at)
    if (filter === 'hosts')     list = list.filter(u => u.is_host || u.user_role === 'host')
    if (filter === 'guests')    list = list.filter(u => !u.is_host && u.user_role !== 'host')
    if (filter === 'suspended') list = list.filter(u => !!u.suspended_at)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      )
    }
    return list
  }, [users, filter, search])

  const stats = useMemo(() => ({
    total:     users.length,
    active:    users.filter(u => u.is_active !== false && !u.suspended_at).length,
    hosts:     users.filter(u => u.is_host || u.user_role === 'host').length,
    suspended: users.filter(u => !!u.suspended_at).length,
  }), [users])

  async function suspendUser() {
    if (!selected || !suspReason.trim() || suspending) return
    setSuspending(true)
    try {
      const res = await fetch(`/api/admin/guests/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suspend', reason: suspReason.trim(), category: suspCat }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const now = new Date().toISOString()
      setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, suspended_at: now, suspension_reason: suspReason.trim() } : u))
      setSelected(prev => ({ ...prev, suspended_at: now, suspension_reason: suspReason.trim() }))
      setSuspModal(false); setSuspReason(''); setSuspCat('policy_violation')
      showToast('User suspended.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSuspending(false)
    }
  }

  async function unsuspendUser(user) {
    if (actionLoading) return
    setAL('unsuspend_' + user.id)
    try {
      const res = await fetch(`/api/admin/guests/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, suspended_at: null, suspension_reason: null, is_active: true } : u))
      if (selected?.id === user.id) setSelected(prev => ({ ...prev, suspended_at: null, suspension_reason: null, is_active: true }))
      showToast('User reactivated.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setAL(null)
    }
  }

  async function sendMessage() {
    if (!selected || !msgBody.trim() || msgSending) return
    if (!selected.is_host && selected.user_role !== 'host') {
      showToast('In-app messages are only available for hosts.', 'error')
      return
    }
    setMsgSend(true)
    try {
      const res = await fetch('/api/host/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host_user_id: selected.id, subject: msgSubject || 'Message from SnapReserve™', body: msgBody }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setMsgModal(false); setMsgSubj(''); setMsgBody('')
      showToast('Message sent.')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setMsgSend(false)
    }
  }

  const canSuspend = ['admin', 'super_admin', 'trust_safety'].includes(role)

  const initials = u => u.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || u.email?.[0]?.toUpperCase() || '?'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', -apple-system, sans-serif", background: 'var(--sr-bg)', color: 'var(--sr-text)' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, zIndex: 9999, background: toast.type === 'error' ? '#EF4444' : '#10B981', color: 'white' }}>
          {toast.msg}
        </div>
      )}

      {/* LEFT PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>All Users</h1>
              <div style={{ fontSize: '0.78rem', color: 'var(--sr-muted)', marginTop: 3 }}>Registered platform users</div>
            </div>
            <a href="/admin" style={{ fontSize: '0.78rem', color: 'var(--sr-muted)', textDecoration: 'none' }}>← Back to Overview</a>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total',     val: stats.total,     color: 'var(--sr-text)' },
              { label: 'Active',    val: stats.active,    color: '#10B981' },
              { label: 'Hosts',     val: stats.hosts,     color: 'var(--sr-orange)' },
              { label: 'Suspended', val: stats.suspended, color: '#EF4444' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--sr-surface)', border: '1px solid var(--sr-border-solid)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--sr-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters + Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{
                  padding: '6px 14px', borderRadius: 100, fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: filter === f.id ? 'var(--sr-orange)' : 'var(--sr-border-solid)',
                  color: filter === f.id ? 'white' : 'var(--sr-muted)',
                  fontFamily: 'inherit',
                }}>{f.label}</button>
              ))}
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{ flex: 1, minWidth: 200, background: 'var(--sr-surface)', border: '1px solid var(--sr-border-solid)', borderRadius: 10, padding: '8px 14px', fontSize: '0.82rem', color: 'var(--sr-text)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sr-border-solid)' }}>
                {['User', 'Account Type', 'Status', 'Joined', 'Bookings', 'Listings', ''].map(h => (
                  <th key={h} style={{ padding: '10px 10px', textAlign: 'left', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--sr-sub)', fontSize: '0.86rem' }}>No users found.</td></tr>
              )}
              {filtered.map(u => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  style={{ borderBottom: '1px solid var(--sr-border-mid)', cursor: 'pointer', background: selected?.id === u.id ? 'rgba(244,96,26,0.06)' : 'transparent', transition: 'background 0.1s' }}
                >
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(u.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials(u)}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--sr-text)' }}>{u.full_name || '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 10px' }}><AccountTypeBadge user={u} /></td>
                  <td style={{ padding: '10px 10px' }}><StatusBadge active={u.is_active} suspended={!!u.suspended_at} /></td>
                  <td style={{ padding: '10px 10px', color: 'var(--sr-muted)' }}>{fmtDate(u.created_at)}</td>
                  <td style={{ padding: '10px 10px', color: 'var(--sr-muted)', textAlign: 'center' }}>{u.booking_count || '—'}</td>
                  <td style={{ padding: '10px 10px', color: 'var(--sr-muted)', textAlign: 'center' }}>
                    {(u.is_host || u.user_role === 'host') ? (u.listing_count || '—') : '—'}
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <button onClick={e => { e.stopPropagation(); setSelected(u) }} style={{ background: 'none', border: '1px solid var(--sr-border-solid)', borderRadius: 8, padding: '5px 12px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--sr-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT PANEL */}
      {selected && (
        <div style={{ width: 340, background: 'var(--sr-surface)', borderLeft: '1px solid var(--sr-border-solid)', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '20px 20px 0', borderBottom: '1px solid var(--sr-border-solid)', paddingBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarColor(selected.id), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials(selected)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--sr-text)' }}>{selected.full_name || '—'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--sr-sub)', marginTop: 2 }}>{selected.email}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--sr-sub)', cursor: 'pointer', fontSize: '1.2rem', padding: 4, lineHeight: 1 }}>×</button>
            </div>
            <AccountTypeBadge user={selected} />
            <span style={{ marginLeft: 6 }}><StatusBadge active={selected.is_active} suspended={!!selected.suspended_at} /></span>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Joined',     val: fmtDate(selected.created_at) },
                { label: 'Bookings',   val: selected.booking_count || 0 },
                { label: 'Total Spent', val: fmtMoney(selected.total_spent) },
                { label: 'Listings',   val: (selected.is_host || selected.user_role === 'host') ? (selected.listing_count || 0) : 'N/A' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--sr-darker)', border: '1px solid var(--sr-border-solid)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--sr-text)' }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Suspension info */}
            {selected.suspended_at && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>SUSPENDED · {fmtDate(selected.suspended_at)}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--sr-muted)', lineHeight: 1.5 }}>{selected.suspension_reason || 'No reason provided.'}</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(selected.is_host || selected.user_role === 'host') && (
                <a
                  href={`/admin/hosts`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--sr-darker)', border: '1px solid var(--sr-border-solid)', borderRadius: 10, textDecoration: 'none', color: 'var(--sr-text)', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  <span>🏨</span> View Host Profile
                </a>
              )}
              {(selected.is_host || selected.user_role === 'host') && (
                <a
                  href={`/admin/listings`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--sr-darker)', border: '1px solid var(--sr-border-solid)', borderRadius: 10, textDecoration: 'none', color: 'var(--sr-text)', fontSize: '0.82rem', fontWeight: 600 }}
                >
                  <span>📋</span> View Listings
                </a>
              )}
              <a
                href={`/admin/guests`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--sr-darker)', border: '1px solid var(--sr-border-solid)', borderRadius: 10, textDecoration: 'none', color: 'var(--sr-text)', fontSize: '0.82rem', fontWeight: 600 }}
              >
                <span>🧳</span> View Bookings
              </a>
              {(selected.is_host || selected.user_role === 'host') && (
                <button
                  onClick={() => { setMsgSubj(''); setMsgBody(''); setMsgModal(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--sr-darker)', border: '1px solid var(--sr-border-solid)', borderRadius: 10, color: 'var(--sr-text)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}
                >
                  <span>💬</span> Message User
                </button>
              )}
              {canSuspend && !selected.suspended_at && (
                <button
                  onClick={() => { setSuspReason(''); setSuspCat('policy_violation'); setSuspModal(true) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#EF4444', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}
                >
                  <span>🚫</span> Suspend User
                </button>
              )}
              {canSuspend && selected.suspended_at && (
                <button
                  onClick={() => unsuspendUser(selected)}
                  disabled={!!actionLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, color: '#10B981', fontSize: '0.82rem', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left' }}
                >
                  <span>✓</span> {actionLoading ? 'Reactivating…' : 'Reactivate User'}
                </button>
              )}
            </div>

            {/* User details */}
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--sr-sub)', marginBottom: 10 }}>Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'User ID',   val: selected.id?.slice(0, 12) + '…' },
                { label: 'Role',      val: selected.user_role || 'user' },
                { label: 'Is Host',   val: selected.is_host ? 'Yes' : 'No' },
                { label: 'Active',    val: selected.is_active !== false ? 'Yes' : 'No' },
              ].map(d => (
                <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '6px 0', borderBottom: '1px solid var(--sr-border-mid)' }}>
                  <span style={{ color: 'var(--sr-sub)' }}>{d.label}</span>
                  <span style={{ color: 'var(--sr-muted)', fontFamily: 'monospace' }}>{d.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND MODAL */}
      {suspModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--sr-surface)', border: '1px solid var(--sr-border-solid)', borderRadius: 16, padding: '28px 32px', maxWidth: 440, width: '100%' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--sr-text)', marginBottom: 4 }}>Suspend User</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--sr-muted)', marginBottom: 20 }}>{selected?.full_name} · {selected?.email}</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 6 }}>CATEGORY</label>
              <select
                value={suspCat}
                onChange={e => setSuspCat(e.target.value)}
                style={{ width: '100%', background: 'var(--sr-darker)', border: '1px solid var(--sr-border-solid)', borderRadius: 8, padding: '9px 12px', color: 'var(--sr-text)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none' }}
              >
                <option value="policy_violation">Policy Violation</option>
                <option value="fraud">Fraud</option>
                <option value="spam">Spam</option>
                <option value="abuse">Abuse</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 6 }}>REASON</label>
              <textarea
                value={suspReason}
                onChange={e => setSuspReason(e.target.value)}
                placeholder="Describe why this user is being suspended…"
                rows={3}
                style={{ width: '100%', background: 'var(--sr-darker)', border: '1px solid var(--sr-border-solid)', borderRadius: 8, padding: '10px 12px', color: 'var(--sr-text)', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setSuspModal(false)} style={{ padding: '9px 20px', background: 'none', border: '1px solid var(--sr-border-solid)', borderRadius: 9, color: 'var(--sr-muted)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={suspendUser} disabled={!suspReason.trim() || suspending} style={{ padding: '9px 20px', background: suspReason.trim() ? '#EF4444' : 'var(--sr-border-solid)', border: 'none', borderRadius: 9, color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: suspReason.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {suspending ? 'Suspending…' : 'Confirm Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MESSAGE MODAL */}
      {msgModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--sr-surface)', border: '1px solid var(--sr-border-solid)', borderRadius: 16, padding: '28px 32px', maxWidth: 480, width: '100%' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--sr-text)', marginBottom: 4 }}>Message User</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--sr-muted)', marginBottom: 20 }}>{selected?.full_name} · {selected?.email}</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 6 }}>SUBJECT</label>
              <input
                value={msgSubject}
                onChange={e => setMsgSubj(e.target.value)}
                placeholder="Message from SnapReserve™"
                style={{ width: '100%', background: 'var(--sr-darker)', border: '1px solid var(--sr-border-solid)', borderRadius: 8, padding: '9px 12px', color: 'var(--sr-text)', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--sr-sub)', display: 'block', marginBottom: 6 }}>MESSAGE</label>
              <textarea
                value={msgBody}
                onChange={e => setMsgBody(e.target.value)}
                placeholder="Write your message…"
                rows={4}
                style={{ width: '100%', background: 'var(--sr-darker)', border: '1px solid var(--sr-border-solid)', borderRadius: 8, padding: '10px 12px', color: 'var(--sr-text)', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setMsgModal(false)} style={{ padding: '9px 20px', background: 'none', border: '1px solid var(--sr-border-solid)', borderRadius: 9, color: 'var(--sr-muted)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={sendMessage} disabled={!msgBody.trim() || msgSending} style={{ padding: '9px 20px', background: msgBody.trim() ? 'var(--sr-orange)' : 'var(--sr-border-solid)', border: 'none', borderRadius: 9, color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: msgBody.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {msgSending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
