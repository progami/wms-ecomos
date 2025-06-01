import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Edit, Trash2, Building2, Package, Settings as SettingsIcon } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default async function WarehouseSettingsPage() {
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
            <WarehouseCard
              name="FMC Warehouse"
              code="FMC"
              address="123 Main St, City, State 12345"
              email="fmc@warehouse.com"
              phone="555-0100"
              skuCount={8}
              configCount={8}
            />
            <WarehouseCard
              name="Vglobal Warehouse"
              code="VGLOBAL"
              address="456 Industrial Blvd, City, State 12345"
              email="vglobal@warehouse.com"
              phone="555-0200"
              skuCount={6}
              configCount={6}
            />
            <WarehouseCard
              name="4AS Warehouse"
              code="4AS"
              address="789 Logistics Ave, City, State 12345"
              email="4as@warehouse.com"
              phone="555-0300"
              skuCount={4}
              configCount={4}
            />
          </div>
        </div>

        {/* SKU Configuration */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">SKU Configurations</h2>
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
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    FMC
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    CS 007
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    14
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    16
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    160
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Jan 1, 2024
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-primary hover:underline">Edit</button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    FMC
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    CS 008
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    36
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    16
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    160
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Jan 1, 2024
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-primary hover:underline">Edit</button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    FMC
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    CS 009
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    14
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    16
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    160
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Jan 1, 2024
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-primary hover:underline">Edit</button>
                  </td>
                </tr>
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
  name: string
  code: string
  address: string
  email: string
  phone: string
  skuCount: number
  configCount: number
}

function WarehouseCard({ 
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