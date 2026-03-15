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

function MfaSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/admin'

  const [step, setStep] = useState('loading') // loading | enroll | verify | done
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const sb = getSupabase()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Check if already enrolled
      const { data: factors } = await sb.auth.mfa.listFactors()
      if (factors?.totp?.length > 0) {
        router.replace('/admin/mfa-verify?next=' + encodeURIComponent(next))
        return
      }

      // Begin enrollment
      const { data, error: enrollError } = await sb.auth.mfa.enroll({ factorType: 'totp', issuer: 'SnapReserve™' })
      if (enrollError) { setError(enrollError.message); setStep('error'); return }

      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setFactorId(data.id)
      setStep('enroll')
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const sb = getSupabase()
      const { error: verifyError } = await sb.auth.mfa.challengeAndVerify({ factorId, code })
      if (verifyError) throw verifyError
      setStep('done')
      setTimeout(() => router.push(next), 1200)
    } catch (err) {
      setError(err.message || 'Invalid code')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'DM Sans',-apple-system,sans-serif; background:var(--sr-bg); color:var(--sr-text); min-height:100vh; display:flex; align-items:center; justify-content:center; }
        .card { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:20px; padding:40px; width:100%; max-width:420px; margin:20px; }
        .logo { display:inline-flex; align-items:center; margin-bottom:6px; }
        .logo img { height:24px; width:auto; }
        html[data-theme="light"] .logo img { filter: drop-shadow(0 0 3px rgba(0,0,0,0.45)); }
        .title { font-size:1.3rem; font-weight:700; margin-bottom:6px; }
        .subtitle { font-size:0.82rem; color:var(--sr-muted); margin-bottom:28px; line-height:1.5; }
        .step-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--sr-orange); margin-bottom:20px; }
        .qr-wrap { background:#fff; border-radius:12px; padding:16px; display:flex; align-items:center; justify-content:center; margin-bottom:20px; }
        .qr-wrap img { max-width:180px; width:100%; }
        .secret-box { background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:10px; padding:12px 16px; margin-bottom:20px; }
        .secret-label { font-size:0.67rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--sr-sub); margin-bottom:4px; }
        .secret-val { font-size:0.82rem; color:var(--sr-muted); letter-spacing:0.06em; word-break:break-all; font-family:monospace; }
        .form-label { font-size:0.78rem; font-weight:600; color:var(--sr-muted); margin-bottom:8px; }
        .code-input { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:10px; padding:13px 16px; font-size:1.1rem; letter-spacing:0.2em; text-align:center; color:var(--sr-text); outline:none; font-family:monospace; }
        .code-input:focus { border-color:var(--sr-orange); }
        .error-msg { background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.2); color:#F87171; border-radius:8px; padding:10px 14px; font-size:0.82rem; margin-bottom:14px; }
        .submit-btn { width:100%; background:var(--sr-orange); border:none; border-radius:11px; padding:14px; font-size:0.92rem; font-weight:700; color:white; cursor:pointer; font-family:inherit; margin-top:16px; transition:opacity 0.15s; }
        .submit-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .success { text-align:center; padding:20px 0; }
        .success-icon { font-size:2.5rem; margin-bottom:12px; }
        .success-msg { font-size:0.88rem; color:#4ADE80; font-weight:600; }
        .hint { font-size:0.74rem; color:var(--sr-sub); margin-top:16px; line-height:1.6; }
      `}</style>

      <div className="card">
        <div className="logo"><img src="/logo.png" alt="SnapReserve" /></div>

        {step === 'loading' && (
          <>
            <div className="title">Setting up MFA…</div>
            <div className="subtitle">Preparing your authenticator setup.</div>
          </>
        )}

        {step === 'enroll' && (
          <>
            <div className="step-label">Step 1 of 2</div>
            <div className="title">Set up two-factor auth</div>
            <div className="subtitle">Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.).</div>
            <div className="qr-wrap">
              {qrCode && <img src={qrCode} alt="MFA QR code" />}
            </div>
            <div className="secret-box">
              <div className="secret-label">Or enter manually</div>
              <div className="secret-val">{secret}</div>
            </div>
            <form onSubmit={handleVerify}>
              <div className="step-label" style={{marginBottom:'10px'}}>Step 2 of 2 — verify</div>
              <div className="form-label">Enter the 6-digit code from your app</div>
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
                {loading ? 'Verifying…' : 'Activate MFA →'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <div className="success">
            <div className="success-icon">✅</div>
            <div className="title" style={{marginBottom:'8px'}}>MFA enabled</div>
            <div className="success-msg">Redirecting to admin console…</div>
          </div>
        )}

        {step === 'error' && (
          <>
            <div className="title">Setup error</div>
            <div className="error-msg" style={{marginTop:'16px'}}>⚠ {error}</div>
          </>
        )}

        <div className="hint">MFA is required for all SnapReserve™ admin accounts. You will need your authenticator app every time you log in.</div>
      </div>
    </>
  )
}

export default function MfaSetupPage() {
  return (
    <Suspense fallback={null}>
      <MfaSetupContent />
    </Suspense>
  )
}
