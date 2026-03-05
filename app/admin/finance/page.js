import { getAdminSession } from '@/lib/get-admin-session'
import { redirect } from 'next/navigation'
import FinanceClient from './FinanceClient'

export const dynamic = 'force-dynamic'

export default async function FinancePage() {
  const { role, error } = await getAdminSession()
  if (error === 'unauthenticated') redirect('/login?next=/admin/finance')
  if (error === 'mfa_required')    redirect('/admin/mfa-verify?next=/admin/finance')
  if (!['admin', 'super_admin', 'finance'].includes(role)) redirect('/admin?error=forbidden')

  return <FinanceClient />
}
