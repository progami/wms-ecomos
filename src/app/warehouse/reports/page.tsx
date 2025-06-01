import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ReportsClientPage from './client-page'

export default async function WarehouseReportsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Get the user's warehouse
  const warehouseId = session.user.warehouseId
  if (!warehouseId && session.user.role === 'warehouse_staff') {
    redirect('/dashboard')
  }

  // Get warehouse info
  const warehouse = warehouseId
    ? await prisma.warehouse.findUnique({
        where: { id: warehouseId },
      })
    : null

  // Get current month stats
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlyTransactions = await prisma.inventoryTransaction.aggregate({
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      transactionDate: { gte: startOfMonth },
    },
    _count: true,
  })

  // Get inventory value stats
  const inventoryStats = await prisma.inventoryBalance.aggregate({
    where: warehouseId ? { warehouseId } : {},
    _sum: {
      currentCartons: true,
      currentPallets: true,
    },
  })

  return (
    <ReportsClientPage
      warehouse={warehouse}
      inventoryStats={inventoryStats}
      monthlyTransactions={monthlyTransactions}
    />
  )
}