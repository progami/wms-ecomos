import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Package2, Plus, Edit } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { prisma } from '@/lib/prisma'

export default async function AdminSkusPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'system_admin') {
    redirect('/auth/login')
  }

  const skus = await prisma.sku.findMany({
    orderBy: { skuCode: 'asc' },
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SKU Management</h1>
            <p className="text-muted-foreground">
              Manage product definitions and specifications
            </p>
          </div>
          <button className="action-button">
            <Plus className="h-4 w-4 mr-2" />
            Add SKU
          </button>
        </div>

        {/* SKU Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ASIN
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units/Carton
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carton Weight
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dimensions
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
              {skus.map((sku) => (
                <tr key={sku.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sku.skuCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {sku.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sku.asin || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {sku.unitsPerCarton}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {sku.cartonWeightKg ? `${sku.cartonWeightKg} kg` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sku.cartonDimensionsCm || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {sku.isActive ? (
                      <span className="badge-success">Active</span>
                    ) : (
                      <span className="badge-warning">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-primary hover:text-primary/80">
                      <Edit className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SKU Summary */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">SKU Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg text-center">
              <Package2 className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
              <p className="text-2xl font-bold">{skus.length}</p>
              <p className="text-sm text-gray-600">Total SKUs</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">
                {skus.filter(s => s.isActive).length}
              </p>
              <p className="text-sm text-gray-600">Active SKUs</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-amber-600">
                {skus.filter(s => !s.isActive).length}
              </p>
              <p className="text-sm text-gray-600">Inactive SKUs</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">
                {skus.filter(s => s.asin).length}
              </p>
              <p className="text-sm text-gray-600">With ASIN</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}