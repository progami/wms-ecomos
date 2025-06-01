import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Filter, Download, Upload } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default async function AdminInventoryPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'system_admin') {
    redirect('/auth/login')
  }

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
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
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
          <SummaryCard title="Total SKUs" value="8" />
          <SummaryCard title="Total Cartons" value="1,234" />
          <SummaryCard title="Total Pallets" value="89" />
          <SummaryCard title="Low Stock Items" value="2" highlight />
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
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  FMC
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  CS 007
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Batch 9
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  140
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  10
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  8,400
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  2 hours ago
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href="/admin/inventory/CS007" className="text-primary hover:underline">
                    View
                  </Link>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  FMC
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  CS 008
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Batch 9
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  46
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  2
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  2,760
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  3 hours ago
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link href="/admin/inventory/CS008" className="text-primary hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">1</span> to{' '}
            <span className="font-medium">10</span> of{' '}
            <span className="font-medium">34</span> results
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border rounded-md text-sm hover:bg-gray-50">
              Previous
            </button>
            <button className="px-3 py-1 border rounded-md text-sm hover:bg-gray-50">
              Next
            </button>
          </div>
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