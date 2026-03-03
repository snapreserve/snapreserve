'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function MfaVerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/admin'

  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      const sb = getSupabase()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: factors } = await sb.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (!totp) { router.push('/admin/mfa-setup?next=' + encodeURIComponent(next)); return }

      setFactorId(totp.id)

      // Issue a challenge immediately
      const { data: challengeData, error: challengeError } = await sb.auth.mfa.challenge({ factorId: totp.id })
      if (challengeError) { setError(challengeError.message); return }
      setChallengeId(challengeData.id)
      setReady(true)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const sb = getSupabase()
      const { error: verifyError } = await sb.auth.mfa.verify({ factorId, challengeId, code })
      if (verifyError) throw verifyError
      router.push(next)
    } catch (err) {
      setError(err.message || 'Invalid code — try again')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:#0F0D0A; color:#F5F0EB; min-height:100vh; display:flex; align-items:center; justify-content:center; }
        .card { background:#1A1712; border:1px solid #2A2420; border-radius:20px; padding:40px; width:100%; max-width:380px; margin:20px; }
        .logo { font-size:1rem; font-weight:800; color:#F4601A; margin-bottom:6px; }
        .title { font-size:1.3rem; font-weight:700; margin-bottom:6px; }
        .subtitle { font-size:0.82rem; color:#A89880; margin-bottom:28px; line-height:1.5; }
        .lock-icon { font-size:2.5rem; text-align:center; margin-bottom:20px; }
        .form-label { font-size:0.78rem; font-weight:600; color:#A89880; margin-bottom:8px; }
        .code-input { width:100%; background:#0F0D0A; border:1px solid #2A2420; border-radius:10px; padding:16px; font-size:1.4rem; letter-spacing:0.3em; text-align:center; color:#F5F0EB; outline:none; font-family:monospace; }
        .code-input:focus { border-color:#F4601A; }
        .error-msg { background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.2); color:#F87171; border-radius:8px; padding:10px 14px; font-size:0.82rem; margin-bottom:14px; }
        .submit-btn { width:100%; background:#F4601A; border:none; border-radius:11px; padding:14px; font-size:0.92rem; font-weight:700; color:white; cursor:pointer; font-family:inherit; margin-top:16px; transition:opacity 0.15s; }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .hint { font-size:0.74rem; color:#6B5E52; margin-top:16px; text-align:center; }
      `}</style>

      <div className="card">
        <div className="logo">SnapReserve Admin</div>
        <div className="lock-icon">🔐</div>
        <div className="title">Two-factor verification</div>
        <div className="subtitle">Enter the 6-digit code from your authenticator app to continue.</div>

        {!ready && !error && <div style={{color:'#A89880',fontSize:'0.84rem'}}>Loading…</div>}

        {error && !ready && <div className="error-msg">⚠ {error}</div>}

        {ready && (
          <form onSubmit={handleVerify}>
            <div className="form-label">Authenticator code</div>
            {error && <div className="error-msg">⚠ {error}</div>}
            <input
              className="code-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              autoComplete="one-time-code"
              autoFocus
            />
            <button className="submit-btn" type="submit" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying…' : 'Continue →'}
            </button>
          </form>
        )}

        <div className="hint">Lost access to your authenticator? Contact your super admin.</div>
      </div>
    </>
  )
}

export default function MfaVerifyPage() {
  return (
    <Suspense fallback={null}>
      <MfaVerifyContent />
    </Suspense>
  )
}
