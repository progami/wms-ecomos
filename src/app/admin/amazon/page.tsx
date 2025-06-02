'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Package2, RefreshCw, Loader2, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface InventoryComparison {
  sku: string
  description: string
  warehouseQty: number
  amazonQty: number
  difference: number
  lastUpdated?: string
}

export default function AmazonIntegrationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [inventory, setInventory] = useState<InventoryComparison[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!session || session.user.role !== 'admin') {
    router.push('/auth/login')
    return null
  }

  const fetchInventoryComparison = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/amazon/inventory-comparison')
      if (response.ok) {
        const data = await response.json()
        setInventory(data)
        setLastRefresh(new Date())
      } else {
        toast.error('Failed to fetch inventory comparison')
      }
    } catch (error) {
      toast.error('Error fetching inventory data')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventoryComparison()
  }, [])

  const filteredInventory = inventory.filter(item =>
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalWarehouse = inventory.reduce((sum, item) => sum + item.warehouseQty, 0)
  const totalAmazon = inventory.reduce((sum, item) => sum + item.amazonQty, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Amazon Inventory Comparison"
          subtitle="Compare warehouse and Amazon FBA inventory"
          description="View side-by-side comparison of your warehouse stock and Amazon FBA inventory levels for all SKUs."
          icon={Package2}
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
          borderColor="border-orange-200"
          textColor="text-orange-800"
        />

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by SKU or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <button
            onClick={fetchInventoryComparison}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </>
            )}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-600">Total Warehouse Stock</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {totalWarehouse.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-600">Total Amazon FBA Stock</h3>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {totalAmazon.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-600">Last Updated</h3>
            <p className="text-lg font-medium text-gray-900 mt-1">
              {lastRefresh ? lastRefresh.toLocaleString() : 'Never'}
            </p>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amazon FBA Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No inventory data found
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.sku} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.warehouseQty.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-medium text-right">
                        {item.amazonQty.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {item.difference > 0 && '+'}{item.difference.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This page displays a read-only comparison of inventory levels. 
            Warehouse quantities are managed through the warehouse system, while Amazon FBA quantities 
            are fetched from Amazon's API. The difference column shows warehouse quantity minus Amazon quantity.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}