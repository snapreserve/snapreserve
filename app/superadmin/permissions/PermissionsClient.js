'use client'
import { useState } from 'react'

const ROLE_COLORS = {
  super_admin:  '#F4601A',
  admin:        '#3B82F6',
  support:      '#22C55E',
  finance:      '#F59E0B',
  trust_safety: '#A855F7',
}

const VALID_VIEW_AS = ['admin', 'support', 'finance', 'trust_safety']

export default function PermissionsClient({ initialRoles, modules, actionLabels }) {
  const [roles,       setRoles]       = useState(initialRoles)
  const [selected,    setSelected]    = useState(initialRoles[0] || null)
  const [modal,       setModal]       = useState(false)   // create/edit modal
  const [editTarget,  setEditTarget]  = useState(null)    // null = create
  const [form,        setForm]        = useState({ name: '', description: '', color: '#6B7280', permissions: {} })
  const [saving,      setSaving]      = useState(false)
  const [toast,       setToast]       = useState(null)
  const [viewAsLoading, setViewAsLoading] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadRoles() {
    const res  = await fetch('/api/superadmin/custom-roles')
    const data = await res.json()
    if (res.ok) {
      setRoles(data.roles)
      // Re-select updated version of current selection
      if (selected) {
        const refreshed = data.roles.find(r => r.id === selected.id)
        setSelected(refreshed || data.roles[0] || null)
      }
    }
  }

  function openCreate() {
    setEditTarget(null)
    setForm({ name: '', description: '', color: '#6B7280', permissions: {} })
    setModal(true)
  }

  function openEdit(role) {
    setEditTarget(role)
    setForm({
      name:        role.name,
      description: role.description || '',
      color:       role.color || '#6B7280',
      permissions: JSON.parse(JSON.stringify(role.permissions || {})),
    })
    setModal(true)
  }

  function togglePerm(module, action) {
    setForm(prev => {
      const current = prev.permissions[module] || []
      const updated  = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action]
      return { ...prev, permissions: { ...prev.permissions, [module]: updated } }
    })
  }

  async function saveRole() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const url    = editTarget ? `/api/superadmin/custom-roles/${editTarget.id}` : '/api/superadmin/custom-roles'
      const method = editTarget ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data   = await res.json()
      if (!res.ok) { showToast(data.error || 'Failed to save', 'error'); return }
      await loadRoles()
      setModal(false)
      showToast(editTarget ? 'Role updated' : 'Role created')
    } catch { showToast('Error saving role', 'error') }
    finally { setSaving(false) }
  }

  async function deleteRole(role) {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return
    const res  = await fetch(`/api/superadmin/custom-roles/${role.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      await loadRoles()
      showToast('Role deleted')
    } else {
      showToast(data.error || 'Failed to delete', 'error')
    }
  }

  async function activateViewAs(roleName) {
    setViewAsLoading(roleName)
    try {
      const res = await fetch('/api/superadmin/view-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view_as: roleName }),
      })
      if (res.ok) window.location.href = '/admin'
      else showToast('Failed to activate preview', 'error')
    } catch { showToast('Error', 'error') }
    finally { setViewAsLoading(null) }
  }

  const moduleKeys = Object.keys(modules)

  return (
    <>
      <style>{`
        .perm-page { padding: 32px 40px; max-width: 1300px; }
        .perm-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; }
        .perm-title { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; color: var(--sr-text); margin-bottom: 4px; }
        .perm-sub { font-size: 0.85rem; color: var(--sr-muted); }
        .perm-body { display: grid; grid-template-columns: 300px 1fr; gap: 24px; align-items: start; }
        .perm-roles-list { display: flex; flex-direction: column; gap: 8px; }
        .perm-role-card { background: var(--sr-card); border: 2px solid transparent; border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all 0.15s; }
        .perm-role-card:hover { border-color: var(--sr-border); }
        .perm-role-card.selected { border-color: var(--sr-orange); }
        .prc-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .prc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .prc-name { font-weight: 700; font-size: 0.9rem; color: var(--sr-text); }
        .prc-system { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 2px 6px; border-radius: 4px; background: var(--sr-surface); color: var(--sr-sub); margin-left: auto; }
        .prc-desc { font-size: 0.76rem; color: var(--sr-sub); line-height: 1.5; }
        .prc-actions { display: flex; gap: 6px; margin-top: 10px; }
        .prc-btn { padding: 5px 12px; border-radius: 8px; border: 1px solid var(--sr-border); background: none; font-size: 0.74rem; font-weight: 600; cursor: pointer; color: var(--sr-text); font-family: 'DM Sans', sans-serif; transition: all 0.13s; }
        .prc-btn:hover { background: var(--sr-surface); }
        .prc-btn.view-as { background: #7C3AED; border-color: #7C3AED; color: white; }
        .prc-btn.view-as:hover { opacity: 0.9; }
        .prc-btn.danger { color: #EF4444; border-color: rgba(239,68,68,0.3); }
        .perm-matrix { background: var(--sr-card); border: 1px solid var(--sr-border); border-radius: 16px; overflow: hidden; }
        .pm-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--sr-border); display: flex; align-items: center; justify-content: space-between; }
        .pm-title { font-weight: 700; font-size: 1rem; color: var(--sr-text); }
        .pm-system-note { font-size: 0.74rem; color: var(--sr-sub); margin-top: 2px; }
        .pm-table { width: 100%; border-collapse: collapse; }
        .pm-module-row { border-bottom: 1px solid var(--sr-border); }
        .pm-module-row:last-child { border-bottom: none; }
        .pm-module-cell { padding: 14px 24px; vertical-align: top; width: 160px; }
        .pm-module-label { font-size: 0.8rem; font-weight: 700; color: var(--sr-text); display: flex; align-items: center; gap: 7px; }
        .pm-actions-cell { padding: 14px 24px; }
        .pm-actions-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .pm-perm-toggle { display: flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--sr-border); background: var(--sr-surface); font-size: 0.76rem; font-weight: 600; color: var(--sr-muted); cursor: pointer; transition: all 0.13s; font-family: 'DM Sans', sans-serif; }
        .pm-perm-toggle.granted { background: rgba(22,163,74,0.1); border-color: rgba(22,163,74,0.3); color: #16A34A; }
        .pm-perm-toggle.system { cursor: default; }
        .pm-perm-toggle.system.granted { background: rgba(22,163,74,0.08); }
        .pm-check { font-size: 0.7rem; }
        .create-btn { padding: 10px 22px; background: var(--sr-orange); border: none; border-radius: 10px; color: white; font-weight: 700; font-size: 0.86rem; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-box { background: var(--sr-card); border-radius: 20px; padding: 28px; width: 100%; max-width: 680px; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-size: 1.2rem; font-weight: 800; margin-bottom: 20px; color: var(--sr-text); }
        .form-row { margin-bottom: 16px; }
        .form-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sr-sub); display: block; margin-bottom: 6px; }
        .form-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--sr-border); background: var(--sr-surface); font-size: 0.86rem; font-family: 'DM Sans', sans-serif; color: var(--sr-text); outline: none; }
        .modal-matrix { margin-top: 8px; }
        .mm-module { margin-bottom: 14px; }
        .mm-module-name { font-size: 0.76rem; font-weight: 700; color: var(--sr-sub); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .mm-actions { display: flex; flex-wrap: wrap; gap: 6px; }
        .mm-toggle { padding: 5px 12px; border-radius: 8px; border: 1px solid var(--sr-border); background: var(--sr-surface); font-size: 0.74rem; font-weight: 600; cursor: pointer; color: var(--sr-muted); font-family: 'DM Sans', sans-serif; transition: all 0.13s; }
        .mm-toggle.on { background: rgba(22,163,74,0.1); border-color: rgba(22,163,74,0.3); color: #16A34A; }
        .modal-footer { display: flex; gap: 10px; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--sr-border); }
        @media (max-width: 900px) { .perm-body { grid-template-columns: 1fr; } .perm-page { padding: 20px; } }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, zIndex: 9999, background: toast.type === 'error' ? '#EF4444' : '#16A34A', color: 'white' }}>
          {toast.msg}
        </div>
      )}

      <div className="perm-page">
        <div className="perm-header">
          <div>
            <div className="perm-title">Permissions</div>
            <div className="perm-sub">
              Define what each admin role can access. System roles are read-only; create custom roles for tailored access.
            </div>
          </div>
          <button className="create-btn" onClick={openCreate}>+ Create Custom Role</button>
        </div>

        <div className="perm-body">
          {/* LEFT — role list */}
          <div className="perm-roles-list">
            {roles.map(r => {
              const dotColor = ROLE_COLORS[r.name] || r.color || '#6B7280'
              return (
                <div
                  key={r.id}
                  className={`perm-role-card${selected?.id === r.id ? ' selected' : ''}`}
                  onClick={() => setSelected(r)}
                >
                  <div className="prc-top">
                    <div className="prc-dot" style={{ background: dotColor }} />
                    <div className="prc-name">{r.name.replace(/_/g, ' ')}</div>
                    {r.is_system && <div className="prc-system">System</div>}
                  </div>
                  {r.description && <div className="prc-desc">{r.description}</div>}
                  <div className="prc-actions" onClick={e => e.stopPropagation()}>
                    {!r.is_system && (
                      <>
                        <button className="prc-btn" onClick={() => openEdit(r)}>Edit</button>
                        <button className="prc-btn danger" onClick={() => deleteRole(r)}>Delete</button>
                      </>
                    )}
                    {VALID_VIEW_AS.includes(r.name) && (
                      <button
                        className="prc-btn view-as"
                        disabled={viewAsLoading === r.name}
                        onClick={() => activateViewAs(r.name)}
                      >
                        {viewAsLoading === r.name ? '…' : '👁️ View As'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* RIGHT — permission matrix */}
          {selected ? (
            <div className="perm-matrix">
              <div className="pm-header">
                <div>
                  <div className="pm-title">{selected.name.replace(/_/g, ' ')} — Permission Matrix</div>
                  <div className="pm-system-note">
                    {selected.is_system
                      ? 'This is a system role. Permissions are read-only.'
                      : 'Click Edit to modify permissions for this custom role.'}
                  </div>
                </div>
                {!selected.is_system && (
                  <button className="prc-btn" onClick={() => openEdit(selected)}>Edit Permissions</button>
                )}
              </div>
              <table className="pm-table">
                <tbody>
                  {moduleKeys.map(key => {
                    const mod      = modules[key]
                    const granted  = selected.permissions?.[key] || []
                    return (
                      <tr key={key} className="pm-module-row">
                        <td className="pm-module-cell">
                          <div className="pm-module-label">
                            <span>{mod.icon}</span>
                            {mod.label}
                          </div>
                        </td>
                        <td className="pm-actions-cell">
                          <div className="pm-actions-grid">
                            {mod.actions.map(action => {
                              const isGranted = granted.includes(action)
                              return (
                                <div
                                  key={action}
                                  className={`pm-perm-toggle system${isGranted ? ' granted' : ''}`}
                                >
                                  <span className="pm-check">{isGranted ? '✓' : '×'}</span>
                                  {actionLabels[action] || action}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ background: 'var(--sr-card)', border: '1px solid var(--sr-border)', borderRadius: 16, padding: 40, textAlign: 'center', color: 'var(--sr-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🛡️</div>
              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--sr-text)' }}>Select a role</div>
              <div style={{ fontSize: '0.84rem' }}>Click any role on the left to see its permission matrix.</div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="modal-title">{editTarget ? `Edit: ${editTarget.name.replace(/_/g, ' ')}` : 'Create Custom Role'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--sr-muted)' }}>×</button>
            </div>

            <div className="form-row">
              <label className="form-label">Role Name *</label>
              <input
                className="form-input"
                placeholder="e.g. listing_reviewer"
                value={form.name}
                disabled={!!editTarget}
                onChange={e => setForm(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              />
              <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', marginTop: 3 }}>Lowercase, underscores only</div>
            </div>

            <div className="form-row">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                placeholder="What can this role do?"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="form-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <label className="form-label">Color</label>
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  style={{ width: 48, height: 36, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--sr-sub)', marginBottom: 4 }}>Preview</div>
                <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: `${form.color}20`, color: form.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {form.name || 'role name'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 4, marginBottom: 8 }}>
              <div className="form-label" style={{ marginBottom: 12 }}>Permissions</div>
              <div className="modal-matrix">
                {moduleKeys.map(key => {
                  const mod     = modules[key]
                  const granted = form.permissions?.[key] || []
                  return (
                    <div key={key} className="mm-module">
                      <div className="mm-module-name">
                        <span>{mod.icon}</span> {mod.label}
                      </div>
                      <div className="mm-actions">
                        {mod.actions.map(action => {
                          const isOn = granted.includes(action)
                          return (
                            <button
                              key={action}
                              className={`mm-toggle${isOn ? ' on' : ''}`}
                              onClick={() => togglePerm(key, action)}
                            >
                              {isOn ? '✓' : '+'} {actionLabels[action] || action}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--sr-border)', background: 'none', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: 'var(--sr-text)' }}>Cancel</button>
              <button onClick={saveRole} disabled={saving || !form.name.trim()} style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: saving ? '#A89880' : 'var(--sr-orange)', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
