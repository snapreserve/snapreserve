import Link from 'next/link'

export default function ListingNotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', fontFamily: 'Syne, sans-serif', background: '#faf6f0', minHeight: '100vh' }}>
      <h2 style={{ color: '#3a1f0d', marginBottom: 8 }}>Property not found</h2>
      <p style={{ color: '#6b5b4f', fontSize: '0.94rem', marginBottom: 24, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
        This listing may have been removed or the link might be incorrect.
      </p>
      <Link href="/listings" style={{ color: '#e8622a', fontWeight: 600 }}>← Back to listings</Link>
    </div>
  )
}
