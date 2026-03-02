'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ALL_ROLES = ['admin', 'support', 'finance', 'trust_safety', 'super_admin']
const ROLE_COLORS = {
  super_admin: '#F4601A',
  admin: '#6EA4F4',
  support: '#4ADE80',
  finance: '#FCD34D',
  trust_safety: '#C084FC',
}

export default function RolesClient({ initialRoles, emailMap }) {
  const router = useRouter()
  const [roles, setRoles] = useState(initialRoles)
  const [emails, setEmails] = useState(emailMap)
  const [grantEmail, setGrantEmail] = useState('')
  const [grantRole, setGrantRole] = useState('admin')
  const [grantUserId, setGrantUserId] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [toast, setToast] = useState(null)
  const [acting, setActing] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function lookupUser() {
    setLookupLoading(true)
    setLookupError('')
    setGrantUserId('')
    try {
      const res = await fetch(`/api/superadmin/users/lookup?email=${encodeURIComponent(grantEmail)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'User not found')
      setGrantUserId(json.user_id)
      setEmails(prev => ({ ...prev, [json.user_id]: grantEmail }))
    } catch (err) {
      setLookupError(err.message)
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleGrant(e) {
    e.preventDefault()
    if (!grantUserId) { setLookupError('Look up the user first'); return }
    setActing(true)
    try {
      const res = await fetch('/api/superadmin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: grantUserId, role: grantRole }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`Role "${grantRole}" granted successfully`)
      setGrantEmail('')
      setGrantUserId('')
      setGrantRole('admin')
      router.refresh()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActing(false)
    }
  }

  async function handleRevoke(targetUserId, roleToRevoke) {
    if (!confirm(`Revoke "${roleToRevoke}" from ${emails[targetUserId] || targetUserId}?`)) return
    setActing(true)
    try {
      const res = await fetch('/api/superadmin/roles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId, role: roleToRevoke }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast('Role revoked')
      setRoles(prev => prev.map(r =>
        r.user_id === targetUserId && r.role === roleToRevoke
          ? { ...r, is_active: false }
          : r
      ))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setActing(false)
    }
  }

  const displayed = roles.filter(r => showInactive ? true : r.is_active)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; }
        .topbar h1 { font-size:1.05rem; font-weight:700; }
        .content { padding:28px 32px; }
        .two-col { display:grid; grid-template-columns:1fr 1.6fr; gap:24px; }
        .panel { background:#1A1712; border:1px solid #2A2420; border-radius:14px; padding:24px; }
        .panel-title { font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#A89880; margin-bottom:20px; }
        .form-label { font-size:0.75rem; font-weight:600; color:#A89880; margin-bottom:7px; }
        .input { width:100%; background:#0F0D0A; border:1px solid #2A2420; border-radius:9px; padding:11px 14px; font-size:0.87rem; font-family:inherit; color:#F5F0EB; outline:none; }
        .input:focus { border-color:#F4601A; }
        .input-row { display:flex; gap:8px; margin-bottom:14px; }
        .input-row .input { flex:1; }
        .lookup-btn { background:#2A2420; border:1px solid #3A3430; color:#A89880; border-radius:9px; padding:11px 16px; font-size:0.82rem; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }
        .lookup-btn:hover { color:#F5F0EB; }
        .found-box { background:rgba(74,222,128,0.06); border:1px solid rgba(74,222,128,0.15); border-radius:9px; padding:10px 14px; font-size:0.8rem; color:#4ADE80; margin-bottom:14px; }
        .error-msg { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.18); border-radius:9px; padding:9px 14px; font-size:0.78rem; color:#F87171; margin-bottom:12px; }
        .select { width:100%; background:#0F0D0A; border:1px solid #2A2420; border-radius:9px; padding:11px 14px; font-size:0.87rem; font-family:inherit; color:#F5F0EB; outline:none; margin-bottom:14px; }
        .submit-btn { width:100%; background:#F4601A; border:none; border-radius:10px; padding:12px; font-size:0.88rem; font-weight:700; color:white; cursor:pointer; font-family:inherit; }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .table-wrap { background:#1A1712; border:1px solid #2A2420; border-radius:14px; overflow:hidden; }
        .table-row { display:grid; grid-template-columns:1.4fr 1fr 140px 80px; gap:12px; padding:13px 20px; border-bottom:1px solid #2A2420; align-items:center; }
        .table-row:last-child { border-bottom:none; }
        .table-row.hdr { background:#141210; }
        .table-row.hdr span { font-size:0.67rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; }
        .row-email { font-size:0.84rem; color:#F5F0EB; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .role-pill { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; }
        .inactive-pill { opacity:0.4; }
        .date-text { font-size:0.75rem; color:#A89880; }
        .revoke-btn { background:rgba(248,113,113,0.08); border:1px solid rgba(248,113,113,0.18); color:#F87171; border-radius:7px; padding:5px 12px; font-size:0.75rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .revoke-btn:hover { background:rgba(248,113,113,0.18); }
        .revoke-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .toggle-row { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
        .toggle-label { font-size:0.78rem; color:#A89880; cursor:pointer; user-select:none; }
        .empty { padding:36px; text-align:center; color:#6B5E52; font-size:0.84rem; }
        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:12px; font-size:0.86rem; font-weight:600; z-index:9999; }
        .toast.success { background:#16A34A; color:white; }
        .toast.error { background:#DC2626; color:white; }
        @media(max-width:1024px) { .two-col{grid-template-columns:1fr;} .table-row{grid-template-columns:1fr 100px 60px;} .table-row>*:nth-child(3){display:none;} }
        @media(max-width:768px) { .content{padding:20px;} }
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="topbar"><h1>Role Management</h1></div>

      <div className="content">
        <div className="two-col">
          {/* Grant role form */}
          <div className="panel">
            <div className="panel-title">Grant a Role</div>

            <div className="form-label">User email</div>
            <div className="input-row">
              <input
                className="input"
                type="email"
                placeholder="user@example.com"
                value={grantEmail}
                onChange={e => { setGrantEmail(e.target.value); setGrantUserId(''); setLookupError('') }}
              />
              <button className="lookup-btn" onClick={lookupUser} disabled={!grantEmail || lookupLoading}>
                {lookupLoading ? '…' : 'Look up'}
              </button>
            </div>

            {grantUserId && (
              <div className="found-box">✓ User found: {emails[grantUserId] || grantUserId}</div>
            )}
            {lookupError && <div className="error-msg">⚠ {lookupError}</div>}

            <div className="form-label">Role to grant</div>
            <select className="select" value={grantRole} onChange={e => setGrantRole(e.target.value)}>
              {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <form onSubmit={handleGrant}>
              <button className="submit-btn" type="submit" disabled={acting || !grantUserId}>
                {acting ? 'Granting…' : `Grant ${grantRole} role →`}
              </button>
            </form>
          </div>

          {/* Roles table */}
          <div>
            <div className="toggle-row">
              <input
                type="checkbox"
                id="show-inactive"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
              />
              <label className="toggle-label" htmlFor="show-inactive">Show revoked roles</label>
            </div>
            <div className="table-wrap">
              <div className="table-row hdr">
                <span>User</span>
                <span>Role</span>
                <span>Granted</span>
                <span></span>
              </div>
              {displayed.length === 0
                ? <div className="empty">No roles found</div>
                : displayed.map(r => (
                  <div key={r.id} className={`table-row ${!r.is_active ? 'inactive-pill' : ''}`}>
                    <div className="row-email">{emails[r.user_id] || r.user_id}</div>
                    <div>
                      <span
                        className="role-pill"
                        style={{ background: `${ROLE_COLORS[r.role]}22`, color: ROLE_COLORS[r.role] }}
                      >
                        {r.role}
                      </span>
                      {!r.is_active && <span style={{fontSize:'0.65rem',color:'#6B5E52',marginLeft:'6px'}}>revoked</span>}
                    </div>
                    <div className="date-text">
                      {r.granted_at ? new Date(r.granted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </div>
                    <div>
                      {r.is_active && (
                        <button
                          className="revoke-btn"
                          onClick={() => handleRevoke(r.user_id, r.role)}
                          disabled={acting}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
