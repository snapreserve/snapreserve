'use client'

export default function ViewAsExitButton() {
  async function exit() {
    await fetch('/api/superadmin/view-as', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ view_as: null }),
    })
    window.location.reload()
  }

  return (
    <button
      onClick={exit}
      style={{
        background: 'rgba(255,255,255,0.2)',
        border: '1px solid rgba(255,255,255,0.35)',
        color: 'white',
        padding: '5px 14px',
        borderRadius: '100px',
        fontSize: '0.76rem',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      Exit preview
    </button>
  )
}
