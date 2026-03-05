'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'DM Sans',-apple-system,sans-serif; background:var(--sr-bg); color:var(--sr-text); }
  .topbar { background:var(--sr-surface); border-bottom:1px solid var(--sr-border-solid); padding:16px 32px; }
  .topbar h1 { font-size:1.05rem; font-weight:700; color:var(--sr-text); }
  .content { padding:32px; max-width:640px; }
  .section { background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:12px; padding:24px; margin-bottom:16px; }
  .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
  .section-title { font-size:0.9rem; font-weight:700; color:var(--sr-text); }
  .section-desc { font-size:0.78rem; color:var(--sr-muted); margin-top:4px; }
  .updated-text { font-size:0.7rem; color:var(--sr-sub); }
  .form-input { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:9px 12px; color:var(--sr-text); font-size:0.85rem; outline:none; font-family:inherit; }
  .form-input:focus { border-color:var(--sr-orange); }
  .form-textarea { width:100%; background:var(--sr-bg); border:1px solid var(--sr-border-solid); border-radius:8px; padding:9px 12px; color:var(--sr-text); font-size:0.82rem; outline:none; font-family:monospace; min-height:100px; resize:vertical; }
  .form-textarea:focus { border-color:var(--sr-orange); }
  .save-btn { margin-top:12px; background:var(--sr-orange); color:#fff; border:none; border-radius:8px; padding:8px 20px; font-size:0.85rem; font-weight:600; cursor:pointer; }
  .save-btn:disabled { opacity:0.5; cursor:not-allowed; }
  /* Toggle */
  .toggle-wrap { display:flex; align-items:center; gap:14px; }
  .toggle { position:relative; width:44px; height:24px; }
  .toggle input { opacity:0; width:0; height:0; }
  .toggle-slider { position:absolute; inset:0; background:var(--sr-border-solid); border-radius:24px; cursor:pointer; transition:0.2s; border:1px solid #3A3028; }
  .toggle-slider:before { content:''; position:absolute; width:18px; height:18px; left:2px; top:2px; background:var(--sr-sub); border-radius:50%; transition:0.2s; }
  input:checked + .toggle-slider { background:rgba(244,96,26,0.2); border-color:var(--sr-orange); }
  input:checked + .toggle-slider:before { transform:translateX(20px); background:var(--sr-orange); }
  .toggle-label { font-size:0.88rem; font-weight:600; color:var(--sr-text); }
  .toast { position:fixed; bottom:24px; right:24px; background:var(--sr-surface); border:1px solid var(--sr-border-solid); border-radius:10px; padding:12px 18px; font-size:0.84rem; font-weight:500; z-index:200; color:var(--sr-text); }
  .toast.success { border-color:rgba(74,222,128,0.4); color:#4ADE80; }
  .toast.error { border-color:rgba(248,113,113,0.4); color:#F87171; }
  .loading-state { padding:48px; text-align:center; color:var(--sr-sub); }
`

export default function SettingsPage() {
  const [settings, setSettings] = useState(null)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [waitlistEnabled, setWaitlistEnabled] = useState(true)
  const [waitlistV2Enabled, setWaitlistV2Enabled] = useState(false)
  const [intlLeadsEnabled, setIntlLeadsEnabled]   = useState(false)
  const [supportEmail, setSupportEmail] = useState('')
  const [saving, setSaving] = useState({})
  const [toast, setToast] = useState(null)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/superadmin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push('/admin'); return }
        const s = data.settings ?? {}
        setSettings(s)
        setMaintenanceMode(s.maintenance_mode?.value ?? false)
        setWaitlistEnabled(s.waitlist_enabled?.value ?? true)
        setWaitlistV2Enabled(s.waitlist_v2_enabled?.value ?? false)
        setIntlLeadsEnabled(s.intl_leads_enabled?.value ?? false)
        setSupportEmail(s.support_email?.value ?? '')
      })
      .catch(() => router.push('/admin'))
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function saveSetting(key, value) {
    setSaving(prev => ({ ...prev, [key]: true }))
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setSettings(prev => ({
        ...prev,
        [key]: { value, updated_at: new Date().toISOString() },
      }))
      showToast(`${key} updated`)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }))
    }
  }

  async function toggleMaintenance(val) {
    setMaintenanceMode(val)
    await saveSetting('maintenance_mode', val)
  }

  async function toggleWaitlist(val) {
    setWaitlistEnabled(val)
    await saveSetting('waitlist_enabled', val)
  }

  async function toggleWaitlistV2(val) {
    setWaitlistV2Enabled(val)
    await saveSetting('waitlist_v2_enabled', val)
  }

  async function toggleIntlLeads(val) {
    setIntlLeadsEnabled(val)
    await saveSetting('intl_leads_enabled', val)
  }

  async function saveEmail() {
    await saveSetting('support_email', supportEmail.trim())
  }

  function fmt(ts) {
    if (!ts) return null
    return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })
  }

  if (!settings) return (
    <>
      <style>{STYLES}</style>
      <div className="topbar"><h1>Platform Settings</h1></div>
      <div className="loading-state">Loading settings...</div>
    </>
  )

  return (
    <>
      <style>{STYLES}</style>
      <div className="topbar"><h1>Platform Settings</h1></div>
      <div className="content">

        {/* Maintenance Mode */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Maintenance Mode</div>
              <div className="section-desc">Takes the platform offline for all users</div>
              {settings.maintenance_mode?.updated_at && (
                <div className="updated-text">Last updated: {fmt(settings.maintenance_mode.updated_at)}</div>
              )}
            </div>
          </div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={e => toggleMaintenance(e.target.checked)}
                disabled={saving.maintenance_mode}
              />
              <span className="toggle-slider" />
            </label>
            <span className="toggle-label">{maintenanceMode ? 'Enabled — site is offline' : 'Disabled — site is live'}</span>
          </div>
        </div>

        {/* Waitlist */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Waitlist Sign-ups</div>
              <div className="section-desc">Allow users to join the waitlist on the coming-soon page</div>
              {settings.waitlist_enabled?.updated_at && (
                <div className="updated-text">Last updated: {fmt(settings.waitlist_enabled.updated_at)}</div>
              )}
            </div>
          </div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input
                type="checkbox"
                checked={waitlistEnabled}
                onChange={e => toggleWaitlist(e.target.checked)}
                disabled={saving.waitlist_enabled}
              />
              <span className="toggle-slider" />
            </label>
            <span className="toggle-label">{waitlistEnabled ? 'Enabled — accepting sign-ups' : 'Disabled — form is closed'}</span>
          </div>
        </div>

        {/* Waitlist v2 */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Waitlist v2 — Site Lock</div>
              <div className="section-desc">Redirects all public routes to /waitlist. Admins are unaffected.</div>
              {settings.waitlist_v2_enabled?.updated_at && (
                <div className="updated-text">Last updated: {fmt(settings.waitlist_v2_enabled.updated_at)}</div>
              )}
            </div>
          </div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input
                type="checkbox"
                checked={waitlistV2Enabled}
                onChange={e => toggleWaitlistV2(e.target.checked)}
                disabled={saving.waitlist_v2_enabled}
              />
              <span className="toggle-slider" />
            </label>
            <span className="toggle-label">{waitlistV2Enabled ? 'Enabled — site locked to /waitlist' : 'Disabled — site is open'}</span>
          </div>
        </div>

        {/* International Leads */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">🌍 International Expansion Leads</div>
              <div className="section-desc">Shows "Outside the US?" section on the waitlist page to capture global leads.</div>
              {settings.intl_leads_enabled?.updated_at && (
                <div className="updated-text">Last updated: {fmt(settings.intl_leads_enabled.updated_at)}</div>
              )}
            </div>
          </div>
          <div className="toggle-wrap">
            <label className="toggle">
              <input
                type="checkbox"
                checked={intlLeadsEnabled}
                onChange={e => toggleIntlLeads(e.target.checked)}
                disabled={saving.intl_leads_enabled}
              />
              <span className="toggle-slider" />
            </label>
            <span className="toggle-label">{intlLeadsEnabled ? 'Enabled — international section visible' : 'Disabled — US only'}</span>
          </div>
        </div>

        {/* Support Email */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Support Email</div>
              <div className="section-desc">Shown to users on error pages and help screens</div>
              {settings.support_email?.updated_at && (
                <div className="updated-text">Last updated: {fmt(settings.support_email.updated_at)}</div>
              )}
            </div>
          </div>
          <input
            className="form-input"
            type="email"
            placeholder="support@snapreserve.app"
            value={supportEmail}
            onChange={e => setSupportEmail(e.target.value)}
          />
          <button
            className="save-btn"
            disabled={saving.support_email}
            onClick={saveEmail}
          >
            {saving.support_email ? 'Saving...' : 'Save'}
          </button>
        </div>

      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}
