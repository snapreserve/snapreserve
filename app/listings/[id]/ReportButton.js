'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const REASONS = [
  { value: '',                    label: 'Select a reason…' },
  { value: 'incorrect_info',      label: 'Incorrect information' },
  { value: 'misleading_photos',   label: 'Misleading photos' },
  { value: 'scam_fraud',          label: 'Scam or fraud' },
  { value: 'safety_concern',      label: 'Safety concern' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'other',               label: 'Other' },
]

export default function ReportButton({ listingId }) {
  const router = useRouter()
  const [open, setOpen]             = useState(false)
  const [reason, setReason]         = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]       = useState(false)
  const [error, setError]           = useState('')

  async function handleOpen() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?next=/listings/${listingId}`)
      return
    }
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    setReason('')
    setDescription('')
    setError('')
    setSuccess(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!reason) { setError('Please select a reason.'); return }
    if (description.trim().length < 20) { setError('Description must be at least 20 characters.'); return }

    setSubmitting(true)
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_type: 'listing', target_id: listingId, reason, description }),
    })
    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) { setError(json.error || 'Something went wrong.'); return }
    setSuccess(true)
  }

  const charCount = description.trim().length

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#A89880', fontSize: '0.76rem', fontFamily: 'inherit',
          textDecoration: 'underline', padding: 0,
        }}
      >
        🚩 Report this listing
      </button>

      {open && (
        <div
          onClick={e => e.target === e.currentTarget && handleClose()}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            background: 'white', borderRadius: '20px', padding: '32px',
            width: '100%', maxWidth: '480px', boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '14px' }}>✅</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: '#1A1410' }}>
                  Report submitted
                </div>
                <p style={{ fontSize: '0.86rem', color: '#6B5F54', lineHeight: 1.7, marginBottom: '24px' }}>
                  Thank you for helping keep SnapReserve™ safe. Our team will review your report within 24 hours.
                </p>
                <button
                  onClick={handleClose}
                  style={{ background: '#F4601A', color: 'white', border: 'none', borderRadius: '10px', padding: '11px 28px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#F4601A', marginBottom: '6px' }}>
                      Report listing
                    </div>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: '#1A1410' }}>
                      What's the issue?
                    </h2>
                  </div>
                  <button
                    onClick={handleClose}
                    style={{ background: '#F3F0EB', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1rem', color: '#6B5F54', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B5F54', marginBottom: '7px' }}>
                      Reason
                    </label>
                    <select
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      style={{
                        width: '100%', padding: '11px 14px', border: '1.5px solid #E8E2D9',
                        borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit',
                        background: 'white', color: reason ? '#1A1410' : '#A89880', outline: 'none',
                      }}
                    >
                      {REASONS.map(r => (
                        <option key={r.value} value={r.value} disabled={!r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B5F54', marginBottom: '7px' }}>
                      Description <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Please describe the issue in detail so our team can investigate effectively…"
                      rows={4}
                      style={{
                        width: '100%', padding: '12px 14px', border: '1.5px solid #E8E2D9',
                        borderRadius: '10px', fontSize: '0.88rem', fontFamily: 'inherit',
                        resize: 'vertical', outline: 'none', color: '#1A1410', lineHeight: 1.6,
                      }}
                    />
                    <div style={{ fontSize: '0.72rem', color: charCount >= 20 ? '#16A34A' : '#A89880', marginTop: '4px', textAlign: 'right' }}>
                      {charCount} / 20 min characters
                    </div>
                  </div>

                  {error && (
                    <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#DC2626', marginBottom: '16px' }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={handleClose}
                      style={{ flex: 1, background: '#F3F0EB', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', color: '#6B5F54' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        flex: 2, background: submitting ? '#D4CEC5' : '#F4601A',
                        color: 'white', border: 'none', borderRadius: '10px',
                        padding: '12px', fontWeight: 700, fontSize: '0.88rem',
                        cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {submitting ? 'Submitting…' : 'Submit report'}
                    </button>
                  </div>

                  <p style={{ fontSize: '0.72rem', color: '#A89880', textAlign: 'center', marginTop: '14px', lineHeight: 1.6 }}>
                    Your identity is never shared with the host. False reports may result in account suspension.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
