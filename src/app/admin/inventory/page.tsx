import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Filter, Upload } from 'lucide-react'
import { ExportButton } from '@/components/common/export-button'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { prisma } from '@/lib/prisma'

export default async function AdminInventoryPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'system_admin') {
    redirect('/auth/login')
  }

  // Fetch real inventory data
  const inventoryBalances = await prisma.inventoryBalance.findMany({
    include: {
      warehouse: true,
      sku: true,
    },
    orderBy: [
      { warehouse: { name: 'asc' } },
      { sku: { skuCode: 'asc' } },
    ],
    // Show all inventory balances
  })

  const totalSkus = await prisma.sku.count()
  const totalCartons = await prisma.inventoryBalance.aggregate({
    _sum: { currentCartons: true }
  })
  const totalPallets = await prisma.inventoryBalance.aggregate({
    _sum: { currentPallets: true }
  })
  const lowStockItems = await prisma.inventoryBalance.count({
    where: { currentCartons: { lt: 10 } }
  })

  // Get recent transactions
  const recentTransactions = await prisma.inventoryTransaction.findMany({
    include: {
      warehouse: true,
      sku: true,
      createdBy: true,
    },
    orderBy: { transactionDate: 'desc' },
    take: 20,
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory Management</h1>
            <p className="text-muted-foreground">
              Manage inventory across all warehouses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/import"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Link>
            <ExportButton
              endpoint="/api/export/inventory"
              fileName="inventory"
              buttonText="Export"
            />
            <Link
              href="/admin/inventory/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Transaction
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by SKU, batch, or reference..."
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Total SKUs" value={totalSkus.toString()} />
          <SummaryCard title="Total Cartons" value={(totalCartons._sum.currentCartons || 0).toLocaleString()} />
          <SummaryCard title="Total Pallets" value={(totalPallets._sum.currentPallets || 0).toString()} />
          <SummaryCard title="Low Stock Items" value={lowStockItems.toString()} highlight={lowStockItems > 0} />
        </div>

        {/* Inventory Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch/Lot
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cartons
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pallets
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryBalances.map((balance) => (
                <tr key={balance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {balance.warehouse.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {balance.sku.skuCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {balance.batchLot}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {balance.currentCartons.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {balance.currentPallets}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {balance.currentUnits.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {balance.lastTransactionDate 
                      ? new Date(balance.lastTransactionDate).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/admin/inventory/${balance.sku.skuCode}`} className="text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {inventoryBalances.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No inventory data found. Import data to see inventory levels.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Transactions */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.transactionDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.transactionType === 'RECEIVE' ? 'bg-green-100 text-green-800' : 
                      transaction.transactionType === 'SHIP' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {transaction.transactionType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.warehouse.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.sku.skuCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {transaction.referenceId || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {transaction.cartonsIn > 0 ? `+${transaction.cartonsIn}` : `-${transaction.cartonsOut}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.createdBy.fullName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}

interface SummaryCardProps {
  title: string
  value: string
  highlight?: boolean
}

function SummaryCard({ title, value, highlight }: SummaryCardProps) {
  return (
    <div className={`border rounded-lg p-4 ${highlight ? 'border-orange-400 bg-orange-50' : ''}`}>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-orange-600' : ''}`}>
        {value}
      </p>
    </div>
  )
}