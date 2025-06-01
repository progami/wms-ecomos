import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Redirect based on user role
  switch (session.user.role) {
    case 'warehouse_staff':
      redirect('/warehouse/inventory')
    case 'finance_admin':
      redirect('/finance/dashboard')
    case 'system_admin':
      redirect('/admin/dashboard')
    case 'manager':
      redirect('/dashboard')
    default:
      redirect('/dashboard')
  }
}