'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export default function OverridePage() {
  const [status, setStatus]     = useState(null) // { active, session }
  const [loading, setLoading]   = useState(true)
  const [password, setPassword] = useState('')
  const [reason, setReason]     = useState('')
  const [acting, setActing]     = useState(false)
  const [error, setError]       = useState('')
  const [toast, setToast]       = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/superadmin/override')
    const json = await res.json()
    setStatus(json)
    setLoading(false)
    if (json.session?.expires_at) {
      const ms = new Date(json.session.expires_at) - Date.now()
      setTimeLeft(Math.max(0, Math.floor(ms / 1000)))
    }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) { loadStatus(); return }
    const t = setTimeout(() => setTimeLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, loadStatus])

  async function activateOverride(e) {
    e.preventDefault()
    if (!password || !reason.trim() || reason.trim().length < 10) {
      setError('Password and a reason (min 10 chars) are required.')
      return
    }
    setActing(true)
    setError('')

    // Re-authenticate client-side to prove identity
    const { data: { user } } = await supabase.auth.getUser()
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password,
    })
    if (authErr) {
      setError('Incorrect password. Override mode not activated.')
      setActing(false)
      return
    }

    const res = await fetch('/api/superadmin/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to activate override.')
      setActing(false)
      return
    }

    setPassword('')
    setReason('')
    showToast('Override Mode activated. All actions will be logged.')
    await loadStatus()
    setActing(false)
  }

  async function revokeOverride() {
    setActing(true)
    await fetch('/api/superadmin/override', { method: 'DELETE' })
    showToast('Override Mode ended.')
    setTimeLeft(null)
    await loadStatus()
    setActing(false)
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div style={{padding:'48px',color:'var(--sr-sub)',textAlign:'center'}}>Loading…</div>
    )
  }

  return (
    <>
      <style>{`
        .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border); padding:16px 32px; }
        .topbar h1 { font-size:1.05rem; font-weight:700; font-family:'DM Sans',sans-serif; }
        .content { padding:32px; max-width:640px; }
        .section { background:var(--sr-surface); border:1px solid var(--sr-border); border-radius:12px; padding:28px; margin-bottom:20px; }
        .section h2 { font-size:0.95rem; font-weight:700; margin-bottom:6px; }
        .section p { font-size:0.84rem; color:var(--sr-muted); line-height:1.65; }
        .active-banner { background:var(--sr-redl); border:1px solid rgba(224,90,74,0.35); border-radius:12px; padding:20px 24px; margin-bottom:20px; }
        .active-title { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .active-label { font-size:0.9rem; font-weight:800; color:var(--sr-red); display:flex; align-items:center; gap:8px; }
        .pulse { width:10px; height:10px; border-radius:50%; background:var(--sr-red); animation:pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .timer { font-size:1.6rem; font-weight:800; color:var(--sr-red); font-family:'DM Mono',monospace; font-variant-numeric:tabular-nums; }
        .timer-label { font-size:0.72rem; color:var(--sr-muted); margin-top:2px; }
        .reason-box { background:var(--sr-bg); border:1px solid rgba(224,90,74,0.2); border-radius:8px; padding:12px; margin:12px 0; }
        .reason-label { font-size:0.65rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-bottom:4px; }
        .reason-text { font-size:0.85rem; color:var(--sr-text); }
        .btn-end { background:var(--sr-redl); border:1px solid rgba(224,90,74,0.35); color:var(--sr-red); padding:10px 20px; border-radius:8px; font-size:0.84rem; font-weight:700; cursor:pointer; font-family:inherit; width:100%; margin-top:4px; }
        .btn-end:hover { background:rgba(224,90,74,0.2); }
        .btn-end:disabled { opacity:0.5; cursor:not-allowed; }
        .field { margin-bottom:16px; }
        .field-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:var(--sr-sub); margin-bottom:6px; }
        .field-label .req { color:var(--sr-red); margin-left:2px; }
        .field-input { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border); border-radius:8px; padding:10px 13px; color:var(--sr-text); font-size:0.85rem; outline:none; font-family:inherit; }
        .field-input:focus { border-color:var(--sr-orange); }
        .field-textarea { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border); border-radius:8px; padding:10px 13px; color:var(--sr-text); font-size:0.85rem; resize:vertical; min-height:80px; outline:none; font-family:inherit; }
        .field-textarea:focus { border-color:var(--sr-orange); }
        .error-msg { background:var(--sr-redl); border:1px solid rgba(224,90,74,0.25); border-radius:8px; padding:10px 14px; font-size:0.82rem; color:var(--sr-red); margin-bottom:14px; }
        .warning-card { background:var(--sr-yellowl); border:1px solid rgba(212,170,74,0.25); border-radius:10px; padding:14px 16px; margin-bottom:20px; font-size:0.83rem; color:var(--sr-yellow); line-height:1.7; }
        .btn-activate { width:100%; background:var(--sr-orange); color:white; border:none; border-radius:10px; padding:13px; font-size:0.9rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .btn-activate:disabled { opacity:0.5; cursor:not-allowed; }
        .toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:12px; font-size:0.86rem; font-weight:600; z-index:9999; }
        .toast.success { background:var(--sr-green); color:white; }
        .toast.error { background:var(--sr-red); color:white; }
      `}</style>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="topbar">
        <h1>🔐 Break-Glass Override Mode</h1>
      </div>

      <div className="content">
        <div className="warning-card">
          <strong>⚠️ Use with extreme caution.</strong> Override Mode grants elevated permissions to bypass role restrictions. Every action taken while Override Mode is active is permanently logged to the Audit Log with <code>override=true</code> and your stated reason. Override Mode expires automatically after 15 minutes.
        </div>

        {status?.active ? (
          <div className="active-banner">
            <div className="active-title">
              <div className="active-label">
                <div className="pulse" />
                OVERRIDE MODE ACTIVE
              </div>
              <div style={{textAlign:'right'}}>
                <div className="timer">{timeLeft !== null ? fmtTime(timeLeft) : '—'}</div>
                <div className="timer-label">remaining</div>
              </div>
            </div>
            <div className="reason-box">
              <div className="reason-label">Stated reason</div>
              <div className="reason-text">{status.session.reason}</div>
            </div>
            <div style={{fontSize:'0.73rem',color:'var(--sr-sub)',marginBottom:'14px'}}>
              Activated {new Date(status.session.created_at).toLocaleTimeString()} · Expires {new Date(status.session.expires_at).toLocaleTimeString()}
            </div>
            <button className="btn-end" disabled={acting} onClick={revokeOverride}>
              {acting ? 'Ending…' : '🔒 End Override Mode now'}
            </button>
          </div>
        ) : (
          <div className="section">
            <h2>Activate Override Mode</h2>
            <p style={{marginBottom:'20px'}}>Requires your account password as re-authentication. Session expires in 15 minutes.</p>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={activateOverride}>
              <div className="field">
                <div className="field-label">Your password <span className="req">*</span></div>
                <input
                  type="password"
                  className="field-input"
                  placeholder="Re-enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="field">
                <div className="field-label">Override reason <span className="req">*</span> (min 10 chars)</div>
                <textarea
                  className="field-textarea"
                  placeholder="e.g. Reinstating falsely suspended host account after legal review confirmed no violation."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn-activate"
                disabled={acting || !password || reason.trim().length < 10}
              >
                {acting ? 'Verifying…' : '🔓 Activate Override Mode'}
              </button>
            </form>
          </div>
        )}

        <div className="section">
          <h2>What Override Mode allows</h2>
          <p style={{marginBottom:'12px'}}>While active, Super Admin can:</p>
          <ul style={{paddingLeft:'18px',color:'var(--sr-muted)',fontSize:'0.84rem',lineHeight:'2'}}>
            <li>Reinstate accounts without Trust &amp; Safety co-sign</li>
            <li>Approve appeals outside normal workflow</li>
            <li>All actions are tagged <code style={{background:'var(--sr-ol)',color:'var(--sr-orange)',padding:'1px 6px',borderRadius:'4px',fontSize:'0.78rem'}}>override=true</code> in the Audit Log</li>
          </ul>
          <p style={{marginTop:'12px',fontSize:'0.78rem',color:'var(--sr-sub)'}}>Permanent hard deletes are not permitted even in Override Mode. Use soft-delete only.</p>
        </div>
      </div>
    </>
  )
}
