'use client'
import { useState } from 'react'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  .topbar { background:#1A1712; border-bottom:1px solid #2A2420; padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
  .topbar h1 { font-size:1.05rem; font-weight:700; color:#F5F0EB; }
  .content { padding:32px; display:grid; grid-template-columns:340px 1fr; gap:28px; align-items:start; }
  .panel { background:#1A1712; border:1px solid #2A2420; border-radius:12px; padding:24px; }
  .panel-title { font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#6B5E52; margin-bottom:18px; }
  .form-label { font-size:0.78rem; font-weight:600; color:#A89880; margin-bottom:6px; display:block; }
  .form-input { width:100%; background:#0F0D0A; border:1px solid #2A2420; border-radius:8px; padding:9px 12px; color:#F5F0EB; font-size:0.85rem; outline:none; font-family:inherit; margin-bottom:12px; }
  .form-input:focus { border-color:#F4601A; }
  .form-select { width:100%; background:#0F0D0A; border:1px solid #2A2420; border-radius:8px; padding:9px 12px; color:#F5F0EB; font-size:0.85rem; outline:none; cursor:pointer; margin-bottom:16px; }
  .generate-btn { width:100%; background:#F4601A; color:#fff; border:none; border-radius:8px; padding:10px; font-size:0.88rem; font-weight:700; cursor:pointer; transition:opacity 0.15s; }
  .generate-btn:hover:not(:disabled) { opacity:0.9; }
  .generate-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .link-box { margin-top:16px; background:#0F0D0A; border:1px solid #2A2420; border-radius:8px; padding:12px; }
  .link-box-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; margin-bottom:8px; }
  .link-text { font-size:0.78rem; color:#F5F0EB; word-break:break-all; font-family:monospace; }
  .copy-btn { margin-top:10px; background:#2A2420; border:1px solid #3A3028; border-radius:6px; padding:6px 14px; color:#F5F0EB; font-size:0.78rem; font-weight:600; cursor:pointer; }
  .copy-btn:hover { border-color:#F4601A; }
  .expires-text { font-size:0.72rem; color:#A89880; margin-top:8px; }
  .table-wrap { background:#1A1712; border:1px solid #2A2420; border-radius:12px; overflow:hidden; }
  .table-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:12px; padding:12px 20px; border-bottom:1px solid #2A2420; align-items:center; }
  .table-row:last-child { border-bottom:none; }
  .table-row.hdr { background:#141210; }
  .table-row.hdr span { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#6B5E52; }
  .cell-main { font-size:0.84rem; font-weight:600; color:#F5F0EB; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cell-sub { font-size:0.72rem; color:#A89880; margin-top:2px; }
  .date-text { font-size:0.76rem; color:#A89880; }
  .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; }
  .badge-pending { background:rgba(234,179,8,0.15); color:#FCD34D; }
  .badge-accepted { background:rgba(74,222,128,0.1); color:#4ADE80; }
  .badge-expired { background:rgba(107,94,82,0.2); color:#A89880; }
  .badge-revoked { background:rgba(248,113,113,0.15); color:#F87171; }
  .role-badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:6px; font-size:0.68rem; font-weight:600; }
  .role-admin { background:rgba(26,110,244,0.15); color:#6EA4F4; }
  .role-support { background:rgba(22,163,74,0.15); color:#4ADE80; }
  .empty-row { padding:36px; text-align:center; color:#6B5E52; font-size:0.84rem; }
  .toast { position:fixed; bottom:24px; right:24px; background:#1A1712; border:1px solid #2A2420; border-radius:10px; padding:12px 18px; font-size:0.84rem; font-weight:500; z-index:200; color:#F5F0EB; }
  .toast.success { border-color:rgba(74,222,128,0.4); color:#4ADE80; }
  .toast.error { border-color:rgba(248,113,113,0.4); color:#F87171; }
  @media(max-width:900px) { .content{grid-template-columns:1fr;} }
`

function statusBadge(status) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

export default function InvitesClient({ initialInvites }) {
  const [invites, setInvites] = useState(initialInvites)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')
  const [loading, setLoading] = useState(false)
  const [generatedLink, setGeneratedLink] = useState(null)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function generateInvite() {
    if (!email.trim() || !email.includes('@')) return
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setGeneratedLink({ link: data.link, expires_at: data.expires_at, token: data.token })
      showToast('Invite created successfully')
      // Refresh invites list
      const listRes = await fetch('/api/superadmin/invites')
      const listData = await listRes.json()
      if (listRes.ok) setInvites(listData.invites ?? [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    if (!generatedLink) return
    navigator.clipboard.writeText(generatedLink.link)
    showToast('Link copied to clipboard')
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="topbar"><h1>Admin Invites</h1></div>
      <div className="content">
        <div className="panel">
          <div className="panel-title">Generate Invite Link</div>
          <label className="form-label">Email address</label>
          <input
            className="form-input"
            type="email"
            placeholder="admin@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <label className="form-label">Role</label>
          <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="support">Support</option>
          </select>
          <button
            className="generate-btn"
            disabled={loading || !email.trim() || !email.includes('@')}
            onClick={generateInvite}
          >
            {loading ? 'Generating...' : 'Generate Link'}
          </button>

          {generatedLink && (
            <div className="link-box">
              <div className="link-box-label">Invite Link</div>
              <div className="link-text">{generatedLink.link}</div>
              <button className="copy-btn" onClick={copyLink}>Copy Link</button>
              <div className="expires-text">
                Expires: {new Date(generatedLink.expires_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="panel-title" style={{padding:'0 0 14px'}}>All Invites</div>
          <div className="table-wrap">
            <div className="table-row hdr">
              <span>Email</span>
              <span>Role</span>
              <span>Status</span>
              <span>Created</span>
            </div>
            {invites.length === 0 ? (
              <div className="empty-row">No invites yet</div>
            ) : invites.map(inv => (
              <div key={inv.id} className="table-row">
                <div>
                  <div className="cell-main">{inv.email}</div>
                  <div className="cell-sub" style={{fontFamily:'monospace', fontSize:'0.68rem'}}>{inv.token?.slice(0,12)}…</div>
                </div>
                <div><span className={`role-badge role-${inv.role}`}>{inv.role}</span></div>
                <div>{statusBadge(inv.status)}</div>
                <div className="date-text">
                  {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
