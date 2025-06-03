'use client'

import { FileText, Download, Calendar, TrendingUp, Package2, DollarSign } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ReportGenerator } from '@/components/reports/report-generator'

interface ReportsClientPageProps {
  warehouse: { id: string; name: string } | null
  inventoryStats: {
    _sum: {
      currentCartons: number | null
      currentPallets: number | null
    }
  }
  monthlyTransactions: {
    _count: number
  }
}

export default function ReportsClientPage({ 
  warehouse, 
  inventoryStats, 
  monthlyTransactions 
}: ReportsClientPageProps) {
  const reports = [
    {
      name: 'Monthly Inventory Summary',
      description: 'Current inventory levels by SKU and batch',
      icon: Package2,
      lastGenerated: 'Today',
      category: 'Inventory',
      reportType: 'monthly-inventory',
    },
    {
      name: 'Inventory Ledger',
      description: 'All inbound and outbound movements',
      icon: TrendingUp,
      lastGenerated: 'Yesterday',
      category: 'Operations',
      reportType: 'inventory-ledger',
    },
    {
      name: 'Storage Utilization',
      description: 'Pallet usage and warehouse capacity',
      icon: FileText,
      lastGenerated: '2 days ago',
      category: 'Storage',
      reportType: 'storage-charges',
    },
    {
      name: 'Weekly Activity Report',
      description: 'Summary of weekly operations',
      icon: Calendar,
      lastGenerated: 'Monday',
      category: 'Operations',
      reportType: 'inventory-ledger',
    },
    {
      name: 'Stock Aging Report',
      description: 'Inventory age analysis by batch',
      icon: DollarSign,
      lastGenerated: 'Last week',
      category: 'Inventory',
      reportType: 'monthly-inventory',
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">
              {warehouse ? `${warehouse.name} Warehouse Reports` : 'Warehouse Operations Reports'}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Monthly Transactions</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{monthlyTransactions._count}</p>
                <p className="text-xs text-blue-600 mt-1">Since start of month</p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Current Inventory</p>
                <p className="text-3xl font-bold text-green-900 mt-1">
                  {(inventoryStats._sum.currentCartons || 0).toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1">Total cartons</p>
              </div>
              <Package2 className="h-10 w-10 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Space Utilization</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {inventoryStats._sum.currentPallets || 0}
                </p>
                <p className="text-xs text-purple-600 mt-1">Pallets in use</p>
              </div>
              <FileText className="h-10 w-10 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Available Reports */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Reports</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report, index) => (
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Last generated: {report.lastGenerated}
                  </p>
                  <ReportGenerator
                    reportType={report.reportType}
                    reportName="Export"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center px-4 py-2 bg-white border rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Reports
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-white border rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              <FileText className="h-4 w-4 mr-2" />
              Custom Report
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-white border rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}