'use client'

/**
 * Visible banner only on the staging host (e.g. staging.snapreserve.app).
 * Main site (snapreserve.app) never shows this, regardless of env vars.
 */
export default function StagingBanner({ host = '' }) {
  const isStagingHost = typeof host === 'string' && host.toLowerCase().includes('staging')
  if (!isStagingHost) return null

  return (
    <div style={{
      position:       'sticky',
      top:            0,
      zIndex:         9999,
      background:     '#B45309',
      color:          '#FEF3C7',
      textAlign:      'center',
      padding:        '9px 16px',
      fontSize:       '0.82rem',
      fontWeight:     700,
      letterSpacing:  '0.04em',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            '10px',
    }}>
      <span>⚠</span>
      <span>STAGING – NOT LIVE &nbsp;|&nbsp; Test cards only</span>
      <span>⚠</span>
    </div>
  )
}
