import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Package2, TrendingUp, Truck, AlertCircle, Clock, Calendar } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { prisma } from '@/lib/prisma'

export default async function WarehouseDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Only warehouse staff and admins can access this page
  if (!['staff', 'admin'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  // Get the user's warehouse
  const warehouseId = session.user.warehouseId

  // Get warehouse info
  const warehouse = warehouseId
    ? await prisma.warehouse.findUnique({
        where: { id: warehouseId },
      })
    : null

  // Get inventory stats
  const inventoryStats = await prisma.inventoryBalance.aggregate({
    where: warehouseId ? { warehouseId } : {},
    _sum: {
      currentCartons: true,
      currentPallets: true,
      currentUnits: true,
    },
  })

  // Get SKU count
  const skuCount = await prisma.inventoryBalance.groupBy({
    where: warehouseId ? { warehouseId } : {},
    by: ['skuId'],
  })

  // Get recent transactions
  const recentTransactions = await prisma.inventoryTransaction.findMany({
    where: warehouseId ? { warehouseId } : {},
    include: {
      warehouse: true,
      sku: true,
      createdBy: true,
    },
    orderBy: { transactionDate: 'desc' },
    take: 10,
  })

  // Get today's activity
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayActivity = await prisma.inventoryTransaction.aggregate({
    where: {
      ...(warehouseId ? { warehouseId } : {}),
      transactionDate: { gte: today },
    },
    _count: true,
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Dashboard</h1>
          <p className="text-muted-foreground">
            {warehouse ? `${warehouse.name} Warehouse` : 'All Warehouses Overview'}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Inventory"
            value={(inventoryStats._sum.currentCartons || 0).toLocaleString()}
            description="Cartons in stock"
            icon={Package2}
            trend={`${skuCount.length} SKUs`}
          />
          <DashboardCard
            title="Today's Transactions"
            value={todayActivity._count.toString()}
            description="Movements today"
            icon={TrendingUp}
            trend="Live tracking"
          />
          <DashboardCard
            title="Pallets Used"
            value={(inventoryStats._sum.currentPallets || 0).toString()}
            description="Current pallets"
            icon={Truck}
            trend="Space utilization"
          />
          <DashboardCard
            title="Pending Tasks"
            value="0"
            description="Actions required"
            icon={AlertCircle}
            trend="All clear"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Transactions */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {transaction.transactionType === 'RECEIVE' ? '📥' : '📤'} {transaction.sku.skuCode}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.transactionType} - {transaction.cartonsIn || transaction.cartonsOut} cartons
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.transactionDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      by {transaction.createdBy.fullName.split(' ')[0]}
                    </p>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <p className="text-sm text-gray-500">No recent transactions</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <QuickActionCard
                title="Receive Goods"
                description="Record incoming shipments"
                href="/warehouse/receive"
                icon="📥"
              />
              <QuickActionCard
                title="Ship Orders"
                description="Process outbound shipments"
                href="/warehouse/ship"
                icon="📤"
              />
              <QuickActionCard
                title="Stock Count"
                description="Perform inventory count"
                href="/warehouse/inventory"
                icon="📊"
              />
              <QuickActionCard
                title="View Reports"
                description="Check inventory reports"
                href="/warehouse/reports"
                icon="📋"
              />
            </div>
          </div>
        </div>

        {/* Inventory by SKU */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Top SKUs by Volume
          </h3>
          <div className="space-y-2">
            {recentTransactions.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{item.sku.skuCode}</span>
                <span className="text-sm text-gray-500">{item.sku.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

interface DashboardCardProps {
  title: string
  value: string
  description: string
  icon: React.ElementType
  trend: string
}

function DashboardCard({ title, value, description, icon: Icon, trend }: DashboardCardProps) {
  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between space-x-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h2 className="text-2xl font-bold mt-1">{value}</h2>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          <p className="text-xs text-gray-500 mt-2">{trend}</p>
        </div>
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    </div>
  )
}

interface QuickActionCardProps {
  title: string
  description: string
  href: string
  icon: string
}

function QuickActionCard({ title, description, href, icon }: QuickActionCardProps) {
  return (
    <a
      href={href}
      className="block p-4 border rounded-lg hover:shadow-lg transition-shadow hover:border-primary"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </a>
  )
}