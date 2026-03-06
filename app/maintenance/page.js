export default function MaintenancePage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'DM Sans', -apple-system, sans-serif;
          background: #0F0D0A;
          color: #F5F0EB;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
      `}</style>

      <div style={{
        textAlign: 'center',
        padding: '40px 24px',
        maxWidth: '520px',
        width: '100%',
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.4rem',
          fontWeight: 900,
          marginBottom: '48px',
          color: 'white',
        }}>
          Snap<span style={{ color: '#F4601A' }}>Reserve™</span>
        </div>

        {/* Icon */}
        <div style={{ fontSize: '3.5rem', marginBottom: '24px' }}>🔧</div>

        {/* Badge */}
        <div style={{
          display: 'inline-block',
          background: 'rgba(244,96,26,0.1)',
          border: '1px solid rgba(244,96,26,0.25)',
          borderRadius: '100px',
          padding: '5px 16px',
          fontSize: '0.7rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: '#F4601A',
          marginBottom: '20px',
        }}>
          Scheduled Maintenance
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '2.2rem',
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: '16px',
          color: '#F5F0EB',
        }}>
          We'll be right back
        </h1>

        <p style={{
          fontSize: '0.92rem',
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1.8,
          marginBottom: '40px',
        }}>
          SnapReserve™™ is currently undergoing scheduled maintenance to improve your experience.
          We'll be back online shortly — thank you for your patience.
        </p>

        {/* Status card */}
        <div style={{
          background: '#1A1712',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          textAlign: 'left',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#F4601A',
              boxShadow: '0 0 0 3px rgba(244,96,26,0.2)',
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#F5F0EB' }}>
              Maintenance in progress
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: '✅', label: 'Core infrastructure', status: 'Online' },
              { icon: '🔧', label: 'Platform services', status: 'Updating' },
              { icon: '⏳', label: 'Bookings & payments', status: 'Paused' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.84rem',
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {row.icon} {row.label}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: row.status === 'Online' ? '#4ADE80' : row.status === 'Updating' ? '#F4601A' : '#FCD34D',
                }}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Support note */}
        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
          For urgent assistance, email us at{' '}
          <a
            href="mailto:support@snapreserve.app"
            style={{ color: '#F4601A', textDecoration: 'none' }}
          >
            support@snapreserve.app
          </a>
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(244,96,26,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(244,96,26,0.1); }
        }
      `}</style>
    </>
  )
}
