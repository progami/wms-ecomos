import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DollarSign, Plus, Calendar, Edit } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { prisma } from '@/lib/prisma'

export default async function FinanceRatesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Both admin and staff can access rates
  if (!['admin', 'staff'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  // Get all cost rates grouped by warehouse
  const warehouses = await prisma.warehouse.findMany({
    include: {
      costRates: {
        orderBy: [
          { costCategory: 'asc' },
          { costName: 'asc' }
        ],
        where: {
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        }
      }
    }
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Cost Rates Management"
          description="Configure and manage storage rates, handling fees, and other charges for each warehouse. These rates are used to calculate monthly storage costs and reconcile with warehouse invoices."
          icon={DollarSign}
          actions={
            <button className="action-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Rate
            </button>
          }
        />

        {/* Rates by Warehouse */}
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="border rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">{warehouse.name}</h2>
              <p className="text-sm text-gray-600">{warehouse.costRates.length} active rates</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost Name
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Effective Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {warehouse.costRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`badge-${
                          rate.costCategory === 'Storage' ? 'primary' :
                          rate.costCategory === 'Carton' ? 'success' :
                          rate.costCategory === 'Pallet' ? 'warning' :
                          'info'
                        }`}>
                          {rate.costCategory}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {rate.costName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        ${rate.costValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rate.unitOfMeasure}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(rate.effectiveDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {rate.endDate && new Date(rate.endDate) < new Date() ? (
                          <span className="text-xs text-gray-500">Expired</span>
                        ) : (
                          <span className="text-xs text-green-600">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary hover:text-primary/80">
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {warehouse.costRates.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No rates configured for this warehouse
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Rate History */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-indigo-600" />
              <div>
                <h3 className="text-lg font-semibold">Rate History</h3>
                <p className="text-sm text-gray-600">View historical rate changes</p>
              </div>
            </div>
            <button className="secondary-button">
              View History
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-600">Last Rate Update</p>
              <p className="text-lg font-semibold">Jan 1, 2024</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Active Rates</p>
              <p className="text-lg font-semibold">31</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-600">Pending Changes</p>
              <p className="text-lg font-semibold">0</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}