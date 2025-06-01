import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Edit, Trash2, Building2, Package, Settings as SettingsIcon } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export default async function WarehouseSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'system_admin') {
    redirect('/auth/login')
  }

  // Fetch warehouses with counts
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          warehouseSkuConfigs: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  // Count unique SKUs per warehouse
  const warehouseSkuCounts = await prisma.warehouseSkuConfig.groupBy({
    by: ['warehouseId'],
    _count: {
      skuId: true
    }
  })

  const skuCountMap = warehouseSkuCounts.reduce((acc, item) => {
    acc[item.warehouseId] = item._count.skuId
    return acc
  }, {} as Record<string, number>)

  // Fetch recent SKU configurations
  const skuConfigs = await prisma.warehouseSkuConfig.findMany({
    where: {
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    },
    include: {
      warehouse: true,
      sku: true,
    },
    orderBy: [
      { warehouse: { code: 'asc' } },
      { sku: { skuCode: 'asc' } }
    ],
    take: 10
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Warehouse Settings</h1>
            <p className="text-muted-foreground">
              Manage warehouses and SKU configurations
            </p>
          </div>
          <Link
            href="/admin/settings/warehouses/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Warehouse
          </Link>
        </div>

        {/* Warehouses List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Warehouses</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((warehouse) => (
              <WarehouseCard
                key={warehouse.id}
                id={warehouse.id}
                name={warehouse.name}
                code={warehouse.code}
                address={warehouse.address || ''}
                email={warehouse.contactEmail || ''}
                phone={warehouse.contactPhone || ''}
                skuCount={skuCountMap[warehouse.id] || 0}
                configCount={warehouse._count.warehouseSkuConfigs}
              />
            ))}
          </div>
        </div>

        {/* SKU Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent SKU Configurations</h2>
            <Link
              href="/admin/settings/sku-configs"
              className="text-sm text-primary hover:underline"
            >
              View all configurations →
            </Link>
          </div>
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Storage Cartons/Pallet
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shipping Cartons/Pallet
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max Height (cm)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective Date
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {skuConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {config.warehouse.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {config.sku.skuCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {config.storageCartonsPerPallet}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {config.shippingCartonsPerPallet}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {config.maxHeightCm || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(config.effectiveDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-primary hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add SKU Configuration
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

interface WarehouseCardProps {
  id: string
  name: string
  code: string
  address: string
  email: string
  phone: string
  skuCount: number
  configCount: number
}

function WarehouseCard({ 
  id,
  name, 
  code, 
  address, 
  email, 
  phone, 
  skuCount, 
  configCount 
}: WarehouseCardProps) {
  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <Building2 className="h-8 w-8 text-primary mr-3" />
          <div>
            <h3 className="text-lg font-semibold">{name}</h3>
            <p className="text-sm text-muted-foreground">Code: {code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-1 hover:bg-gray-100 rounded">
            <Edit className="h-4 w-4 text-gray-600" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">{address}</p>
        <p className="text-muted-foreground">{email}</p>
        <p className="text-muted-foreground">{phone}</p>
      </div>
      
      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{skuCount} SKUs</span>
        </div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{configCount} Configs</span>
        </div>
      </div>
    </div>
  )
}