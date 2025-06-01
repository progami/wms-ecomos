import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { FileText, Download, Package2, TrendingUp, Users, Calendar } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { prisma } from '@/lib/prisma'

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // This page is for managers and viewers
  if (!['manager', 'viewer'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  // Get summary statistics
  const totalInventory = await prisma.inventoryBalance.aggregate({
    _sum: { currentCartons: true }
  })

  const activeWarehouses = await prisma.warehouse.count()
  const totalTransactions = await prisma.inventoryTransaction.count({
    where: {
      transactionDate: {
        gte: new Date(new Date().setDate(new Date().getDate() - 30))
      }
    }
  })

  const reports = [
    {
      name: 'Executive Summary',
      description: 'High-level overview of operations',
      icon: FileText,
      category: 'Executive',
      access: ['manager', 'viewer'],
    },
    {
      name: 'Inventory Status Report',
      description: 'Current stock levels across warehouses',
      icon: Package2,
      category: 'Operations',
      access: ['manager', 'viewer'],
    },
    {
      name: 'Monthly Activity Report',
      description: 'Transaction summary and trends',
      icon: TrendingUp,
      category: 'Operations',
      access: ['manager', 'viewer'],
    },
    {
      name: 'Warehouse Performance',
      description: 'Efficiency metrics by location',
      icon: Users,
      category: 'Analytics',
      access: ['manager'],
    },
    {
      name: 'Cost Summary',
      description: 'High-level cost overview',
      icon: Calendar,
      category: 'Financial',
      access: ['manager'],
    },
  ]

  const userReports = reports.filter(r => r.access.includes(session.user.role))

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Access operational and analytical reports
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="dashboard-card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Inventory</p>
                <h2 className="text-3xl font-bold text-blue-900 mt-1">
                  {(totalInventory._sum.currentCartons || 0).toLocaleString()}
                </h2>
                <p className="text-xs text-blue-600 mt-1">Cartons across all locations</p>
              </div>
              <Package2 className="h-10 w-10 text-blue-400" />
            </div>
          </div>

          <div className="dashboard-card bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Active Warehouses</p>
                <h2 className="text-3xl font-bold text-green-900 mt-1">{activeWarehouses}</h2>
                <p className="text-xs text-green-600 mt-1">Operating locations</p>
              </div>
              <Users className="h-10 w-10 text-green-400" />
            </div>
          </div>

          <div className="dashboard-card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Monthly Activity</p>
                <h2 className="text-3xl font-bold text-purple-900 mt-1">{totalTransactions}</h2>
                <p className="text-xs text-purple-600 mt-1">Transactions (30 days)</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Available Reports */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Reports</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userReports.map((report, index) => (
              <div
                key={index}
                className="bg-white border rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:border-primary cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <report.icon className="h-8 w-8 text-gray-400 group-hover:text-primary transition-colors" />
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {report.category}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary mb-1">
                  {report.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                <button className="inline-flex items-center text-sm text-primary hover:text-primary/80 font-medium">
                  <Download className="h-4 w-4 mr-1" />
                  View Report
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4">Quick Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Most Active Warehouse</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">FMC</p>
              <p className="text-xs text-gray-500">Based on transaction volume</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Top SKU by Volume</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">CS 010</p>
              <p className="text-xs text-gray-500">Highest inventory levels</p>
            </div>
          </div>
        </div>

        {session.user.role === 'viewer' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              ℹ️ As a viewer, you have access to read-only reports. Contact your manager for additional access.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}