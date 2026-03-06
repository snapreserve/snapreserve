// lib/validate.js
// Centralized input validation and sanitization helpers.
// Import these instead of scattering ad-hoc checks across route files.

/**
 * Trim a string and enforce a maximum byte length.
 * Returns null for empty / non-string inputs.
 */
export function sanitizeText(value, maxLength = 1000) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null
}

/**
 * Validate a UUID v4 string.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function isValidUUID(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * Basic email format check (RFC 5321 practical subset).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value) && value.length <= 320
}

/**
 * Clamp parseInt(value) to [min, max]. Returns min on NaN.
 */
export function clampInt(value, min, max) {
  const n = parseInt(value, 10)
  return isNaN(n) ? min : Math.min(Math.max(n, min), max)
}

/**
 * Return true only if value is one of the allowed strings.
 */
export function isAllowedValue(value, allowed) {
  return Array.isArray(allowed) && allowed.includes(value)
}

/**
 * Validate that a redirect path is a safe internal relative path.
 * Blocks open-redirect attacks via protocol-relative URLs (//evil.com)
 * and path traversal (/../).
 */
export function isSafeRedirectPath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&    // blocks protocol-relative redirects
    !path.includes('..') &&      // blocks path traversal
    path.length <= 2000
  )
}
