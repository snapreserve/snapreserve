import { redirect } from 'next/navigation'

/**
 * Fallback: redirect /account/admin → /admin.
 * Middleware also redirects this path; this handles direct hits.
 */
export default function AccountAdminRedirect() {
  redirect('/admin')
}
