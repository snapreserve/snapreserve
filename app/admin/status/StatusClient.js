'use client'
import { useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'operational',    label: '● Operational',    color: '#4ADE80' },
  { value: 'degraded',       label: '◐ Degraded',       color: '#FBBF24' },
  { value: 'partial_outage', label: '◑ Partial Outage', color: '#F97316' },
  { value: 'major_outage',   label: '● Major Outage',   color: '#F87171' },
  { value: 'maintenance',    label: '🔧 Maintenance',   color: '#60A5FA' },
]

const IMPACT_OPTIONS = [
  { value: 'none',     label: 'None' },
  { value: 'minor',    label: 'Minor' },
  { value: 'major',    label: 'Major' },
  { value: 'critical', label: 'Critical' },
]

const INCIDENT_STATUS_OPTIONS = [
  { value: 'investigating', label: 'Investigating' },
  { value: 'identified',    label: 'Identified' },
  { value: 'monitoring',    label: 'Monitoring' },
  { value: 'resolved',      label: 'Resolved' },
]

const STATUS_DOT = {
  operational:    '#4ADE80',
  degraded:       '#FBBF24',
  partial_outage: '#F97316',
  major_outage:   '#F87171',
  maintenance:    '#60A5FA',
}

function fmt(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function StatusClient({ initialComponents, initialIncidents }) {
  const [components, setComponents]   = useState(initialComponents)
  const [incidents, setIncidents]     = useState(initialIncidents)
  const [toast, setToast]             = useState(null)
  const [loadingComp, setLoadingComp] = useState(null)

  // New incident form
  const [showNewIncident, setShowNewIncident] = useState(false)
  const [newIncident, setNewIncident] = useState({ title: '', impact: 'minor', message: '', affected: [] })
  const [creatingIncident, setCreatingIncident] = useState(false)

  // Update incident
  const [updateModal, setUpdateModal] = useState(null) // { id, title }
  const [updateForm, setUpdateForm]   = useState({ status: 'monitoring', message: '' })
  const [updatingIncident, setUpdatingIncident] = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function updateComponentStatus(id, status) {
    setLoadingComp(id)
    try {
      const res = await fetch(`/api/admin/status/components/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setComponents(prev => prev.map(c => c.id === id ? { ...c, status } : c))
      showToast('Component status updated')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoadingComp(null)
    }
  }

  async function createIncident() {
    if (!newIncident.title.trim()) { showToast('Title required', 'error'); return }
    setCreatingIncident(true)
    try {
      const res = await fetch('/api/admin/status/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newIncident.title,
          impact: newIncident.impact,
          message: newIncident.message,
          affected_components: newIncident.affected,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setIncidents(prev => [{ ...json.incident, status_incident_updates: [] }, ...prev])
      setNewIncident({ title: '', impact: 'minor', message: '', affected: [] })
      setShowNewIncident(false)
      showToast('Incident created')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setCreatingIncident(false)
    }
  }

  async function updateIncident() {
    if (!updateForm.message.trim()) { showToast('Message required', 'error'); return }
    setUpdatingIncident(true)
    try {
      const res = await fetch(`/api/admin/status/incidents/${updateModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updateForm.status, message: updateForm.message }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      if (updateForm.status === 'resolved') {
        setIncidents(prev => prev.filter(i => i.id !== updateModal.id))
      } else {
        setIncidents(prev => prev.map(i =>
          i.id === updateModal.id
            ? { ...i, status: updateForm.status, message: updateForm.message }
            : i
        ))
      }
      setUpdateModal(null)
      setUpdateForm({ status: 'monitoring', message: '' })
      showToast(updateForm.status === 'resolved' ? 'Incident resolved ✓' : 'Incident updated')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUpdatingIncident(false)
    }
  }

  const selectStyle = {
    background: '#0F0D0A', border: '1px solid #2A2420', borderRadius: '8px',
    padding: '7px 10px', color: '#F5F0EB', fontSize: '0.82rem',
    fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
  }

  const inputStyle = {
    width: '100%', background: '#0F0D0A', border: '1px solid #2A2420',
    borderRadius: '8px', padding: '9px 12px', color: '#F5F0EB',
    fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          background: '#1A1712', border: `1px solid ${toast.type === 'error' ? 'rgba(248,113,113,0.4)' : 'rgba(74,222,128,0.4)'}`,
          borderRadius: '10px', padding: '12px 18px', fontSize: '0.84rem', fontWeight: 500,
          color: toast.type === 'error' ? '#F87171' : '#4ADE80',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Components */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A89880' }}>
            System Components
          </h2>
          <a
            href="https://status.snapreserve.app"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.78rem', color: '#F4601A', fontWeight: 600,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            View public page ↗
          </a>
        </div>

        <div style={{ background: '#1A1712', border: '1px solid #2A2420', borderRadius: '12px', overflow: 'hidden' }}>
          {components.map((comp, i) => (
            <div key={comp.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: i < components.length - 1 ? '1px solid #2A2420' : 'none',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#F5F0EB', marginBottom: '2px' }}>
                  {comp.name}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#6B5E52' }}>
                  Updated {fmt(comp.updated_at)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_DOT[comp.status] ?? '#4ADE80', flexShrink: 0 }} />
                <select
                  value={comp.status}
                  onChange={e => updateComponentStatus(comp.id, e.target.value)}
                  disabled={loadingComp === comp.id}
                  style={{ ...selectStyle, opacity: loadingComp === comp.id ? 0.5 : 1 }}
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active incidents */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A89880' }}>
            Active Incidents
          </h2>
          <button
            onClick={() => setShowNewIncident(true)}
            style={{
              background: '#F4601A', color: 'white', border: 'none', borderRadius: '8px',
              padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + New incident
          </button>
        </div>

        {incidents.length === 0 && (
          <div style={{
            background: '#1A1712', border: '1px solid #2A2420', borderRadius: '12px',
            padding: '32px', textAlign: 'center', color: '#6B5E52', fontSize: '0.86rem',
          }}>
            No active incidents. All systems normal.
          </div>
        )}

        {incidents.map(incident => (
          <div key={incident.id} style={{
            background: '#1A1712', border: '1px solid #2A2420',
            borderLeft: '3px solid #F4601A',
            borderRadius: '12px', padding: '18px 20px', marginBottom: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F5F0EB', marginBottom: '4px' }}>
                  {incident.title}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: '100px',
                    background: 'rgba(244,96,26,0.15)', color: '#F4601A',
                  }}>
                    {incident.status}
                  </span>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                    padding: '2px 8px', borderRadius: '100px',
                    background: 'rgba(255,255,255,0.06)', color: '#A89880',
                  }}>
                    {incident.impact} impact
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setUpdateModal({ id: incident.id, title: incident.title }); setUpdateForm({ status: 'monitoring', message: '' }) }}
                style={{
                  background: 'rgba(255,255,255,0.07)', color: '#F5F0EB', border: 'none',
                  borderRadius: '8px', padding: '7px 14px', fontSize: '0.8rem',
                  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                Post update
              </button>
            </div>
            {incident.message && (
              <p style={{ fontSize: '0.82rem', color: '#A89880', lineHeight: 1.6 }}>{incident.message}</p>
            )}
            <div style={{ fontSize: '0.72rem', color: '#6B5E52', marginTop: '6px' }}>
              Created {fmt(incident.created_at)}
            </div>
          </div>
        ))}
      </div>

      {/* New incident modal */}
      {showNewIncident && (
        <div
          onClick={e => e.target === e.currentTarget && setShowNewIncident(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div style={{ background: '#1A1712', border: '1px solid #2A2420', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '520px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F5F0EB', marginBottom: '20px' }}>
              Create Incident
            </h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '6px' }}>
                Title
              </label>
              <input
                value={newIncident.title}
                onChange={e => setNewIncident(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Payment processing delays"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '6px' }}>
                  Impact
                </label>
                <select
                  value={newIncident.impact}
                  onChange={e => setNewIncident(p => ({ ...p, impact: e.target.value }))}
                  style={{ ...inputStyle }}
                >
                  {IMPACT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '6px' }}>
                  Affected components
                </label>
                <div style={{ background: '#0F0D0A', border: '1px solid #2A2420', borderRadius: '8px', padding: '8px 10px', maxHeight: '120px', overflowY: 'auto' }}>
                  {components.map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.8rem', color: '#A89880', cursor: 'pointer', marginBottom: '4px' }}>
                      <input
                        type="checkbox"
                        checked={newIncident.affected.includes(c.id)}
                        onChange={e => setNewIncident(p => ({
                          ...p,
                          affected: e.target.checked
                            ? [...p.affected, c.id]
                            : p.affected.filter(id => id !== c.id),
                        }))}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '6px' }}>
                Initial message (shown on status page)
              </label>
              <textarea
                value={newIncident.message}
                onChange={e => setNewIncident(p => ({ ...p, message: e.target.value }))}
                placeholder="We are investigating reports of…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowNewIncident(false)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.07)', color: '#A89880', border: 'none', borderRadius: '8px', padding: '11px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={createIncident}
                disabled={creatingIncident}
                style={{ flex: 2, background: '#F4601A', color: 'white', border: 'none', borderRadius: '8px', padding: '11px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit', opacity: creatingIncident ? 0.6 : 1 }}
              >
                {creatingIncident ? 'Creating…' : 'Create incident'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update incident modal */}
      {updateModal && (
        <div
          onClick={e => e.target === e.currentTarget && setUpdateModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div style={{ background: '#1A1712', border: '1px solid #2A2420', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '460px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F5F0EB', marginBottom: '4px' }}>Post update</h2>
            <p style={{ fontSize: '0.8rem', color: '#6B5E52', marginBottom: '20px' }}>{updateModal.title}</p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '6px' }}>
                New status
              </label>
              <select
                value={updateForm.status}
                onChange={e => setUpdateForm(p => ({ ...p, status: e.target.value }))}
                style={{ ...inputStyle }}
              >
                {INCIDENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#A89880', marginBottom: '6px' }}>
                Update message
              </label>
              <textarea
                value={updateForm.message}
                onChange={e => setUpdateForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Describe what's happening or what was fixed…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setUpdateModal(null)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.07)', color: '#A89880', border: 'none', borderRadius: '8px', padding: '11px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancel
              </button>
              <button
                onClick={updateIncident}
                disabled={updatingIncident}
                style={{
                  flex: 2,
                  background: updateForm.status === 'resolved' ? '#16A34A' : '#F4601A',
                  color: 'white', border: 'none', borderRadius: '8px', padding: '11px',
                  fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'inherit',
                  opacity: updatingIncident ? 0.6 : 1,
                }}
              >
                {updatingIncident ? 'Posting…' : updateForm.status === 'resolved' ? '✓ Mark resolved' : 'Post update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
