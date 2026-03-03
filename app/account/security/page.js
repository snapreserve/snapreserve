'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function SecurityPage() {
  const router = useRouter()

  // ── Password change ──────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)  // { type: 'ok'|'err', text }

  async function handlePasswordChange(e) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'err', text: 'New passwords do not match.' })
      return
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ type: 'err', text: 'Password must be at least 8 characters.' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)

    // Re-auth with current password first
    const { data: { user } } = await supabase.auth.getUser()
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwForm.current,
    })
    if (signInErr) {
      setPwMsg({ type: 'err', text: 'Current password is incorrect.' })
      setPwSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    setPwSaving(false)
    if (error) {
      setPwMsg({ type: 'err', text: error.message })
    } else {
      setPwMsg({ type: 'ok', text: 'Password updated successfully.' })
      setPwForm({ current: '', next: '', confirm: '' })
    }
  }

  // ── Account deletion ─────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStep, setDeleteStep] = useState('warning')  // warning | reauth | blocked | done
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [reAuthError, setReAuthError] = useState('')

  function openDeleteModal() {
    setShowDeleteModal(true)
    setDeleteStep('warning')
    setDeletePassword('')
    setDeleteReason('')
    setReAuthError('')
  }

  function closeDeleteModal() {
    setShowDeleteModal(false)
  }

  async function handleDeleteConfirm() {
    setDeleting(true)
    setReAuthError('')

    // Re-authenticate before deletion
    const { data: { user } } = await supabase.auth.getUser()
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    })
    if (signInErr) {
      setReAuthError('Incorrect password. Please try again.')
      setDeleting(false)
      return
    }

    // Call delete API
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: deleteReason }),
    })
    const json = await res.json()
    setDeleting(false)

    if (!res.ok) {
      if (json.error === 'upcoming_bookings' || json.error === 'open_dispute') {
        setBlockReason(json.message)
        setDeleteStep('blocked')
      } else {
        setReAuthError(json.error ?? 'Something went wrong. Please try again.')
      }
      return
    }

    // Success — sign out and redirect
    await supabase.auth.signOut()
    setDeleteStep('done')
    setTimeout(() => router.push('/?account=deleted'), 1500)
  }

  const fieldStyle = {
    width: '100%', padding: '11px 14px', border: '1px solid #E8E2D9',
    borderRadius: '10px', fontSize: '0.9rem', fontFamily: 'inherit',
    background: 'white', outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontSize: '0.78rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    color: '#6B5F54', marginBottom: '6px',
  }

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>
          Security
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#6B5F54' }}>
          Manage your password and account access.
        </p>
      </div>

      {/* ── Change password ── */}
      <div style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px', padding: '28px', marginBottom: '24px' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '20px' }}>Change password</h2>
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
          <div>
            <label style={labelStyle}>Current password</label>
            <input type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} style={fieldStyle} required />
          </div>
          <div>
            <label style={labelStyle}>New password</label>
            <input type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} style={fieldStyle} required minLength={8} />
          </div>
          <div>
            <label style={labelStyle}>Confirm new password</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} style={fieldStyle} required />
          </div>
          {pwMsg && (
            <div style={{
              background: pwMsg.type === 'ok' ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.06)',
              border: `1px solid ${pwMsg.type === 'ok' ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.15)'}`,
              borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem',
              color: pwMsg.type === 'ok' ? '#16A34A' : '#DC2626',
            }}>{pwMsg.text}</div>
          )}
          <div>
            <button type="submit" disabled={pwSaving} style={{
              background: '#1A1410', color: 'white', border: 'none', borderRadius: '10px',
              padding: '12px 24px', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', opacity: pwSaving ? 0.6 : 1,
            }}>
              {pwSaving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Danger zone ── */}
      <div style={{ border: '1px solid rgba(220,38,38,0.25)', borderRadius: '16px', padding: '28px' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#DC2626', marginBottom: '8px' }}>
          Danger zone
        </h2>
        <p style={{ fontSize: '0.84rem', color: '#6B5F54', marginBottom: '20px', lineHeight: 1.7 }}>
          Once you delete your account, your personal information will be hidden and you will no longer
          be able to sign in. Booking history is retained for legal compliance.
        </p>
        <button onClick={openDeleteModal} style={{
          background: 'none', border: '1px solid #DC2626', color: '#DC2626',
          borderRadius: '10px', padding: '11px 22px', fontSize: '0.88rem',
          fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Delete my account
        </button>
      </div>

      {/* ── Delete modal ── */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }} onClick={e => e.target === e.currentTarget && closeDeleteModal()}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '36px', maxWidth: '520px', width: '100%' }}>

            {deleteStep === 'done' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: '14px' }}>✓</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '8px' }}>Account deleted</div>
                <p style={{ fontSize: '0.84rem', color: '#6B5F54' }}>Signing you out…</p>
              </div>
            )}

            {deleteStep === 'blocked' && (
              <div>
                <div style={{ fontSize: '1.6rem', marginBottom: '12px' }}>⚠️</div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: '1.3rem', marginBottom: '12px' }}>
                  Account cannot be deleted
                </h2>
                <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '10px', padding: '14px 16px', fontSize: '0.84rem', color: '#DC2626', marginBottom: '20px', lineHeight: 1.6 }}>
                  {blockReason}
                </div>
                <button onClick={closeDeleteModal} style={{
                  background: '#1A1410', color: 'white', border: 'none', borderRadius: '10px',
                  padding: '12px 24px', fontSize: '0.88rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Got it</button>
              </div>
            )}

            {deleteStep === 'warning' && (
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: '1.4rem', marginBottom: '16px', color: '#1A1410' }}>
                  Delete your account
                </h2>

                {/* Warning box */}
                <div style={{ background: '#FFF8F5', border: '1px solid #F4E0D4', borderRadius: '12px', padding: '18px', marginBottom: '20px', fontSize: '0.84rem', lineHeight: 1.75, color: '#6B5F54' }}>
                  <p style={{ fontWeight: 700, color: '#DC2626', marginBottom: '10px' }}>
                    This action cannot be undone.
                  </p>
                  <p style={{ marginBottom: '10px' }}><strong>What happens when you delete your account:</strong></p>
                  <ul style={{ paddingLeft: '18px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>Your name, phone number, and profile information will be hidden</li>
                    <li>You will no longer be able to sign in to SnapReserve</li>
                    <li>Your saved places and payment methods will be removed</li>
                  </ul>
                  <p style={{ marginBottom: '10px' }}><strong>What we keep for legal compliance:</strong></p>
                  <ul style={{ paddingLeft: '18px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>Booking history is retained for 7 years (financial regulation)</li>
                    <li>Completed transactions remain on record for tax and dispute purposes</li>
                    <li>Messages related to bookings are retained for 3 years</li>
                  </ul>
                  <p style={{ color: '#DC2626', fontWeight: 600 }}>
                    You cannot delete your account if you have upcoming bookings or open disputes.
                  </p>
                </div>

                {/* Reason */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Reason for leaving (optional)</label>
                  <textarea
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                    rows={2}
                    placeholder="Help us improve SnapReserve…"
                    style={{ ...fieldStyle, resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={closeDeleteModal} style={{
                    flex: 1, background: 'none', border: '1px solid #E8E2D9', borderRadius: '10px',
                    padding: '12px', fontSize: '0.88rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', color: '#6B5F54',
                  }}>Cancel</button>
                  <button onClick={() => setDeleteStep('reauth')} style={{
                    flex: 1, background: '#DC2626', color: 'white', border: 'none',
                    borderRadius: '10px', padding: '12px', fontSize: '0.88rem',
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Continue →</button>
                </div>
              </div>
            )}

            {deleteStep === 'reauth' && (
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: '1.4rem', marginBottom: '8px' }}>
                  Confirm your identity
                </h2>
                <p style={{ fontSize: '0.84rem', color: '#6B5F54', marginBottom: '20px' }}>
                  For your security, enter your password to permanently delete your account.
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    placeholder="Your current password"
                    style={fieldStyle}
                    autoFocus
                  />
                </div>

                {reAuthError && (
                  <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#DC2626', marginBottom: '16px' }}>
                    {reAuthError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setDeleteStep('warning')} style={{
                    flex: 1, background: 'none', border: '1px solid #E8E2D9', borderRadius: '10px',
                    padding: '12px', fontSize: '0.88rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', color: '#6B5F54',
                  }}>Back</button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleting || !deletePassword}
                    style={{
                      flex: 1, background: '#DC2626', color: 'white', border: 'none',
                      borderRadius: '10px', padding: '12px', fontSize: '0.88rem',
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      opacity: deleting || !deletePassword ? 0.6 : 1,
                    }}
                  >
                    {deleting ? 'Verifying…' : 'Delete my account permanently'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
