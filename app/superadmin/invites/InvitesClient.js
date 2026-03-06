'use client'
import { useState } from 'react'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; display:flex; align-items:center; justify-content:space-between; }
  .topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }

  /* Page tabs */
  .page-tabs { display:flex; gap:4px; margin:0 32px; padding:16px 0 0; border-bottom:1px solid var(--sr-border-solid); flex-shrink:0; }
  .page-tab { padding:8px 18px; font-size:0.8rem; font-weight:700; cursor:pointer; border:none; background:none; color:var(--sr-sub); font-family:inherit; border-bottom:2px solid transparent; transition:all 0.13s; }
  .page-tab.act { color:var(--sr-orange); border-bottom-color:var(--sr-orange); }

  .content { padding:28px 32px; display:grid; grid-template-columns:340px 1fr; gap:28px; align-items:start; }
  .panel { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; padding:24px; }
  .panel-title { font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--sr-sub); margin-bottom:18px; }
  .form-label { font-size:0.78rem; font-weight:600; color:var(--sr-muted); margin-bottom:6px; display:block; }
  .form-input { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:9px 12px; color:var(--sr-text); font-size:0.85rem; outline:none; font-family:inherit; margin-bottom:12px; }
  .form-input:focus { border-color:var(--sr-orange); }
  .form-select { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:9px 12px; color:var(--sr-text); font-size:0.85rem; outline:none; cursor:pointer; margin-bottom:16px; font-family:inherit; }
  .form-select:focus { border-color:var(--sr-orange); }
  .generate-btn { width:100%; background:var(--sr-orange); color:#fff; border:none; border-radius:8px; padding:10px; font-size:0.88rem; font-weight:700; cursor:pointer; transition:opacity 0.15s; font-family:inherit; }
  .generate-btn:hover:not(:disabled) { opacity:0.9; }
  .generate-btn:disabled { opacity:0.5; cursor:not-allowed; }
  .link-box { margin-top:16px; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:12px; }
  .link-box-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-bottom:8px; }
  .link-text { font-size:0.78rem; color:var(--sr-text); word-break:break-all; font-family:monospace; }
  .copy-btn { margin-top:10px; background:var(--sr-border-solid); border:1px solid #3A3028; border-radius:6px; padding:6px 14px; color:var(--sr-text); font-size:0.78rem; font-weight:600; cursor:pointer; font-family:inherit; }
  .copy-btn:hover { border-color:var(--sr-orange); }
  .expires-text { font-size:0.72rem; color:var(--sr-muted); margin-top:8px; }
  .table-wrap { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; overflow:hidden; }
  .table-row { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:12px; padding:12px 20px; border-bottom:1px solid var(--sr-border-solid); align-items:center; }
  .table-row:last-child { border-bottom:none; }
  .table-row.hdr { background:var(--sr-bg); }
  .table-row.hdr span { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); }
  .ui-table-row { display:grid; grid-template-columns:1.5fr 1fr 1fr 1fr 1fr; gap:12px; padding:12px 20px; border-bottom:1px solid var(--sr-border-solid); align-items:center; }
  .ui-table-row:last-child { border-bottom:none; }
  .ui-table-row.hdr { background:var(--sr-bg); }
  .ui-table-row.hdr span { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); }
  .cell-main { font-size:0.84rem; font-weight:600; color:var(--sr-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cell-sub { font-size:0.72rem; color:var(--sr-muted); margin-top:2px; }
  .date-text { font-size:0.76rem; color:var(--sr-muted); }
  .badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:0.68rem; font-weight:700; }
  .badge-pending { background:rgba(234,179,8,0.15); color:#FCD34D; }
  .badge-sent    { background:rgba(96,165,250,0.15); color:#60A5FA; }
  .badge-accepted { background:rgba(74,222,128,0.1); color:#4ADE80; }
  .badge-expired { background:rgba(107,94,82,0.2); color:var(--sr-muted); }
  .badge-revoked { background:rgba(248,113,113,0.15); color:#F87171; }
  .role-badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:6px; font-size:0.68rem; font-weight:600; }
  .role-admin { background:rgba(26,110,244,0.15); color:#6EA4F4; }
  .role-support { background:rgba(22,163,74,0.15); color:#4ADE80; }
  .type-host { background:rgba(244,96,26,0.12); color:var(--sr-orange); }
  .type-traveler { background:rgba(96,165,250,0.12); color:#60A5FA; }
  .type-founder { background:rgba(245,158,11,0.12); color:#F59E0B; }
  .empty-row { padding:36px; text-align:center; color:var(--sr-sub); font-size:0.84rem; }
  .toast { position:fixed; bottom:24px; right:24px; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:12px 18px; font-size:0.84rem; font-weight:500; z-index:200; color:var(--sr-text); }
  .toast.success { border-color:rgba(74,222,128,0.4); color:#4ADE80; }
  .toast.error { border-color:rgba(248,113,113,0.4); color:#F87171; }
  @media(max-width:900px) { .content{grid-template-columns:1fr;} .ui-table-row{grid-template-columns:1.5fr 1fr 1fr;} .ui-table-row>*:nth-child(4),.ui-table-row>*:nth-child(5){display:none;} }
  @media(max-width:768px) { .topbar{padding:14px 20px;} .page-tabs,.content{padding-left:20px;padding-right:20px;} }
`

function statusBadge(status) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

function inviteTypeBadge(type) {
  const cls = type === 'host' ? 'type-host' : type === 'traveler' ? 'type-traveler' : type === 'founder_host' ? 'type-founder' : 'role-admin'
  const label = type === 'founder_host' ? 'Founder Host' : type || 'host'
  return <span className={`role-badge ${cls}`}>{label}</span>
}

export default function InvitesClient({ initialInvites, initialUserInvites }) {
  const [pageTab, setPageTab]         = useState('admin')
  const [invites, setInvites]         = useState(initialInvites)
  const [userInvites, setUserInvites] = useState(initialUserInvites)

  // Admin invite form
  const [email, setEmail]             = useState('')
  const [role, setRole]               = useState('admin')
  const [loading, setLoading]         = useState(false)
  const [generatedLink, setGeneratedLink] = useState(null)

  // User invite form
  const [uEmail, setUEmail]           = useState('')
  const [uName, setUName]             = useState('')
  const [uType, setUType]             = useState('host')
  const [uRegion, setURegion]         = useState('')
  const [uLoading, setULoading]       = useState(false)
  const [generatedUserLink, setGeneratedUserLink] = useState(null)

  const [toast, setToast]             = useState(null)

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
      showToast('Admin invite created successfully')
      const listRes = await fetch('/api/superadmin/invites')
      const listData = await listRes.json()
      if (listRes.ok) setInvites(listData.invites ?? [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function copyLink(link) {
    navigator.clipboard.writeText(link)
    showToast('Link copied to clipboard')
  }

  async function generateUserInvite() {
    if (!uEmail.trim() || !uEmail.includes('@')) return
    setULoading(true)
    try {
      const res = await fetch('/api/superadmin/user-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: uEmail.trim(), name: uName.trim() || null, invite_type: uType, region: uRegion.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      setGeneratedUserLink({ link: data.link, expires_at: data.expires_at, invite: data.invite })
      showToast('User invite created')
      // Refresh user invites list
      const listRes = await fetch('/api/superadmin/user-invites')
      const listData = await listRes.json()
      if (listRes.ok) setUserInvites(listData.invites ?? [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setULoading(false)
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="topbar"><h1>Invites</h1></div>

      {/* Page-level tabs */}
      <div className="page-tabs">
        <button className={`page-tab${pageTab === 'admin' ? ' act' : ''}`} onClick={() => setPageTab('admin')}>
          Admin Invites
        </button>
        <button className={`page-tab${pageTab === 'user' ? ' act' : ''}`} onClick={() => setPageTab('user')}>
          User Invites
        </button>
      </div>

      {/* ADMIN INVITES TAB */}
      {pageTab === 'admin' && (
        <div className="content">
          <div className="panel">
            <div className="panel-title">Generate Admin Invite</div>
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
                <button className="copy-btn" onClick={() => copyLink(generatedLink.link)}>Copy Link</button>
                <div className="expires-text">
                  Expires: {new Date(generatedLink.expires_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="panel-title" style={{padding:'0 0 14px'}}>All Admin Invites</div>
            <div className="table-wrap">
              <div className="table-row hdr">
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Created</span>
              </div>
              {invites.length === 0 ? (
                <div className="empty-row">No admin invites yet</div>
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
      )}

      {/* USER INVITES TAB */}
      {pageTab === 'user' && (
        <div className="content">
          <div className="panel">
            <div className="panel-title">Generate User Invite</div>
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email"
              placeholder="user@email.com"
              value={uEmail}
              onChange={e => setUEmail(e.target.value)}
            />
            <label className="form-label">Name (optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="First Last"
              value={uName}
              onChange={e => setUName(e.target.value)}
            />
            <label className="form-label">Invite Type</label>
            <select className="form-select" value={uType} onChange={e => setUType(e.target.value)}>
              <option value="host">Host</option>
              <option value="traveler">Traveler</option>
              <option value="founder_host">Founder Host</option>
            </select>
            <label className="form-label">Region (optional)</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Northeast, Southeast…"
              value={uRegion}
              onChange={e => setURegion(e.target.value)}
            />
            <button
              className="generate-btn"
              disabled={uLoading || !uEmail.trim() || !uEmail.includes('@')}
              onClick={generateUserInvite}
            >
              {uLoading ? 'Generating...' : 'Generate Invite'}
            </button>

            {generatedUserLink && (
              <div className="link-box">
                <div className="link-box-label">User Invite Link</div>
                <div className="link-text">{generatedUserLink.link}</div>
                <button className="copy-btn" onClick={() => copyLink(generatedUserLink.link)}>Copy Link</button>
                <div className="expires-text">
                  Expires: {new Date(generatedUserLink.expires_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="panel-title" style={{padding:'0 0 14px'}}>All User Invites</div>
            <div className="table-wrap">
              <div className="ui-table-row hdr">
                <span>Email / Name</span>
                <span>Type</span>
                <span>Status</span>
                <span>Sent By</span>
                <span>Created</span>
              </div>
              {userInvites.length === 0 ? (
                <div className="empty-row">No user invites yet</div>
              ) : userInvites.map(inv => (
                <div key={inv.id} className="ui-table-row">
                  <div>
                    <div className="cell-main">{inv.email}</div>
                    {inv.name && <div className="cell-sub">{inv.name}</div>}
                    {inv.region && <div className="cell-sub" style={{color:'var(--sr-orange)'}}>{inv.region}</div>}
                  </div>
                  <div>{inviteTypeBadge(inv.invite_type)}</div>
                  <div>{statusBadge(inv.status)}</div>
                  <div className="date-text">{inv.sent_by_name || '—'}</div>
                  <div className="date-text">
                    {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
