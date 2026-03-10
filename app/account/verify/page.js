'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function VerifyPage() {
  const [user, setUser]         = useState(null)
  const [status, setStatus]     = useState(null) // 'pending_review' | 'verified' | null
  const [file, setFile]         = useState(null)
  const [preview, setPreview]   = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult]     = useState(null) // { success } | { error }
  const fileInputRef            = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login?next=/account/verify'; return }
      setUser(user)
      const { data } = await supabase
        .from('users')
        .select('verification_status')
        .eq('id', user.id)
        .maybeSingle()
      setStatus(data?.verification_status || null)
    })
  }, [])

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/account/upload-document', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setResult({ error: json.error || 'Upload failed. Please try again.' })
      } else {
        setResult({ success: true })
        setStatus('pending_review')
        setFile(null)
        setPreview(null)
      }
    } catch {
      setResult({ error: 'Something went wrong. Please try again.' })
    }
    setUploading(false)
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>
          Identity verification
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#6B5F54' }}>
          Upload a government-issued photo ID to verify your account.
        </p>
      </div>

      {/* Status banner */}
      {status === 'verified' && (
        <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, color: '#15803D', marginBottom: '2px' }}>Your identity is verified</div>
            <div style={{ fontSize: '0.84rem', color: '#166534' }}>Your account has been verified. No further action is needed.</div>
          </div>
        </div>
      )}

      {status === 'pending_review' && !result?.success && (
        <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '2px' }}>Document under review</div>
            <div style={{ fontSize: '0.84rem', color: '#92400E' }}>We've received your document and are reviewing it. This usually takes 1–2 business days.</div>
          </div>
        </div>
      )}

      {/* Success confirmation */}
      {result?.success && (
        <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: '16px', padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📬</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px', color: '#15803D' }}>Document received!</div>
          <p style={{ fontSize: '0.88rem', color: '#166534' }}>
            Our team will review your document within 1–2 business days and update your account status.
          </p>
        </div>
      )}

      {/* Admin request context */}
      <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.94rem', marginBottom: '12px', color: '#1A1410' }}>
          📋 What we need
        </div>
        <p style={{ fontSize: '0.86rem', color: '#6B5F54', lineHeight: 1.75, marginBottom: '16px' }}>
          Please upload a clear photo or scan of a <strong style={{ color: '#1A1410' }}>government-issued photo ID</strong> such as:
        </p>
        <ul style={{ paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0' }}>
          {["Passport", "Driver's license", "National ID card", "State-issued ID"].map(item => (
            <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#6B5F54' }}>
              <span style={{ color: '#F4601A', flexShrink: 0 }}>✓</span> {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Upload area */}
      {status !== 'verified' && (
        <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.94rem', marginBottom: '16px', color: '#1A1410' }}>
            Upload your ID
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${file ? '#F4601A' : '#E8E2D9'}`,
              borderRadius: '12px',
              padding: '36px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: file ? 'rgba(244,96,26,0.03)' : '#FAFAF8',
              transition: 'all 0.18s',
              marginBottom: '16px',
            }}
          >
            {preview ? (
              <img src={preview} alt="ID preview" style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
            ) : (
              <>
                <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>🪪</div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1A1410', marginBottom: '4px' }}>
                  {file ? file.name : 'Click to upload your ID'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#A89880' }}>
                  JPG, PNG, WEBP or PDF — max 10MB
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {file && !preview && (
            <div style={{ fontSize: '0.84rem', color: '#6B5F54', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📄 <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}

          {result?.error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#DC2626', fontSize: '0.84rem', marginBottom: '14px' }}>
              {result.error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                background: !file || uploading ? '#E8E2D9' : '#F4601A',
                color: !file || uploading ? '#A89880' : 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 28px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: !file || uploading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.18s',
              }}
            >
              {uploading ? 'Uploading…' : 'Submit document'}
            </button>
            {file && (
              <button
                onClick={() => { setFile(null); setPreview(null); setResult(null) }}
                style={{ background: 'none', border: '1px solid #E8E2D9', borderRadius: '10px', padding: '12px 18px', fontSize: '0.88rem', color: '#6B5F54', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Clear
              </button>
            )}
          </div>

          <p style={{ fontSize: '0.75rem', color: '#A89880', marginTop: '14px', lineHeight: 1.6 }}>
            🔒 Your document is encrypted and stored securely. It will only be accessed by our verification team and deleted once your account is verified.
          </p>
        </div>
      )}
    </div>
  )
}
