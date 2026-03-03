'use client'
import { useState, useEffect } from 'react'

export default function SavedPage() {
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)

  useEffect(() => {
    fetch('/api/account/saved').then(r => r.json()).then(data => {
      setSaved(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  async function handleRemove(listingId) {
    setRemoving(listingId)
    await fetch(`/api/account/saved/${listingId}`, { method: 'DELETE' })
    setSaved(s => s.filter(p => p.listings?.id !== listingId))
    setRemoving(null)
  }

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.7rem', fontWeight: 700, marginBottom: '6px' }}>Saved places</h1>
        <p style={{ fontSize: '0.88rem', color: '#6B5F54' }}>Properties you've liked and want to revisit.</p>
      </div>

      {loading && <div style={{ color: '#A89880', fontSize: '0.88rem' }}>Loading…</div>}

      {!loading && saved.length === 0 && (
        <div style={{
          background: 'white', border: '1px solid #E8E2D9', borderRadius: '16px',
          padding: '48px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>❤️</div>
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>No saved places yet</div>
          <div style={{ fontSize: '0.84rem', color: '#A89880', marginBottom: '20px' }}>
            Heart a property while browsing to save it here.
          </div>
          <a href="/" style={{
            background: '#F4601A', color: 'white', borderRadius: '10px',
            padding: '11px 24px', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700,
          }}>Browse properties</a>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {saved.map(item => {
          const l = item.listings
          return (
            <div key={item.id} style={{ background: 'white', border: '1px solid #E8E2D9', borderRadius: '14px', overflow: 'hidden' }}>
              {/* Image */}
              <div style={{
                height: '150px', background: '#E8E2D9',
                backgroundImage: l?.main_image_url ? `url(${l.main_image_url})` : undefined,
                backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative',
              }}>
                <button
                  onClick={() => handleRemove(l.id)}
                  disabled={removing === l.id}
                  title="Remove from saved"
                  style={{
                    position: 'absolute', top: '10px', right: '10px',
                    background: 'white', border: 'none', borderRadius: '50%',
                    width: '32px', height: '32px', cursor: 'pointer',
                    fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', opacity: removing === l.id ? 0.5 : 1,
                  }}
                >
                  ❤️
                </button>
              </div>
              <div style={{ padding: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l?.title}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#6B5F54', marginBottom: '10px' }}>
                  {l?.city}, {l?.country}
                </div>
                {l?.price_per_night && (
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    ${l.price_per_night}<span style={{ fontWeight: 400, color: '#A89880', fontSize: '0.76rem' }}>/night</span>
                  </div>
                )}
                <a href={`/properties/${l?.id}`} style={{
                  display: 'block', marginTop: '10px', textAlign: 'center',
                  background: '#F3F0EB', borderRadius: '8px', padding: '8px',
                  fontSize: '0.76rem', fontWeight: 700, textDecoration: 'none', color: '#1A1410',
                }}>
                  View property →
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
