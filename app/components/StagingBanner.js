'use client'

/**
 * Visible banner shown on all pages in the STAGING environment.
 * Renders nothing in production or development.
 */
export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== 'staging') return null

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
