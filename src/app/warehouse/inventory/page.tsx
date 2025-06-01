'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Search, Filter, Download, Upload, Package2, Calendar, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { toast } from 'react-hot-toast'

interface InventoryBalance {
  id: string
  warehouse: { id: string; name: string }
  sku: { id: string; skuCode: string; description: string }
  batchLot: string
  currentCartons: number
  currentPallets: number
  currentUnits: number
  lastTransactionDate: string | null
}

export default function WarehouseInventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [inventoryData, setInventoryData] = useState<InventoryBalance[]>([])
  const [filteredData, setFilteredData] = useState<InventoryBalance[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    minCartons: '',
    maxCartons: '',
    warehouse: '',
    showLowStock: false,
    showZeroStock: false
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/login')
      return
    }
    if (!['warehouse_staff', 'system_admin', 'manager'].includes(session.user.role)) {
      router.push('/dashboard')
      return
    }
    fetchInventory()
  }, [session, status])

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory/balances')
      if (response.ok) {
        const data = await response.json()
        setInventoryData(data)
        setFilteredData(data)
      }
    } catch (error) {
      toast.error('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = inventoryData

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.sku.skuCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.batchLot.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.warehouse.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply advanced filters
    if (filters.minCartons) {
      filtered = filtered.filter(item => item.currentCartons >= parseInt(filters.minCartons))
    }
    if (filters.maxCartons) {
      filtered = filtered.filter(item => item.currentCartons <= parseInt(filters.maxCartons))
    }
    if (filters.warehouse) {
      filtered = filtered.filter(item => item.warehouse.id === filters.warehouse)
    }
    if (filters.showLowStock) {
      filtered = filtered.filter(item => item.currentCartons < 10 && item.currentCartons > 0)
    }
    if (filters.showZeroStock) {
      filtered = filtered.filter(item => item.currentCartons === 0)
    }

    setFilteredData(filtered)
  }, [searchQuery, filters, inventoryData])

  const handleExport = () => {
    toast.info('Export functionality coming soon!')
  }

  const handleImport = () => {
    router.push('/warehouse/import')
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  const totalCartons = filteredData.reduce((sum, item) => sum + item.currentCartons, 0)
  const totalPallets = filteredData.reduce((sum, item) => sum + item.currentPallets, 0)
  const uniqueSkus = new Set(filteredData.map(item => item.sku.id)).size
  const lowStockItems = filteredData.filter(item => item.currentCartons < 10 && item.currentCartons > 0).length

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory Overview</h1>
            <p className="text-muted-foreground">
              Real-time inventory levels and stock management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleImport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </button>
            <button 
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Total SKUs"
            value={uniqueSkus.toString()}
            icon={Package2}
            subtitle={`${filteredData.length} items`}
          />
          <SummaryCard
            title="Total Cartons"
            value={totalCartons.toLocaleString()}
            icon={Package2}
            trend="up"
            trendValue="+5%"
          />
          <SummaryCard
            title="Total Pallets"
            value={totalPallets.toString()}
            icon={Package2}
            subtitle="Active storage"
          />
          <SummaryCard
            title="Low Stock Items"
            value={lowStockItems.toString()}
            icon={AlertCircle}
            highlight={lowStockItems > 0}
            subtitle="< 10 cartons"
          />
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by SKU, description, batch, or warehouse..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition-colors ${
                showFilters 
                  ? 'border-primary bg-primary text-white' 
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters {Object.values(filters).some(v => v) && '•'}
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Cartons</label>
                  <input
                    type="number"
                    value={filters.minCartons}
                    onChange={(e) => setFilters({...filters, minCartons: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Cartons</label>
                  <input
                    type="number"
                    value={filters.maxCartons}
                    onChange={(e) => setFilters({...filters, maxCartons: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="999999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Warehouse</label>
                  <select
                    value={filters.warehouse}
                    onChange={(e) => setFilters({...filters, warehouse: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">All Warehouses</option>
                    <option value="warehouse-1">FMC Warehouse</option>
                    <option value="warehouse-2">Vglobal Warehouse</option>
                    <option value="warehouse-3">4AS Warehouse</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.showLowStock}
                      onChange={(e) => setFilters({...filters, showLowStock: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Low Stock Only</span>
                  </label>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.showZeroStock}
                      onChange={(e) => setFilters({...filters, showZeroStock: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Zero Stock Only</span>
                  </label>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setFilters({
                    minCartons: '',
                    maxCartons: '',
                    warehouse: '',
                    showLowStock: false,
                    showZeroStock: false
                  })}
                  className="text-sm text-primary hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
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
                  SKU Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
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
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((balance) => {
                const isLowStock = balance.currentCartons < 10 && balance.currentCartons > 0
                const isZeroStock = balance.currentCartons === 0
                
                return (
                  <tr key={balance.id} className={`hover:bg-gray-50 transition-colors ${
                    isZeroStock ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : ''
                  }`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {balance.warehouse.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {balance.sku.skuCode}
                        {isZeroStock && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Out of Stock
                          </span>
                        )}
                        {isLowStock && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            Low Stock
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {balance.sku.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {balance.batchLot}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      <span className={isZeroStock ? 'text-red-600 font-semibold' : isLowStock ? 'text-orange-600 font-semibold' : ''}>
                        {balance.currentCartons.toLocaleString()}
                      </span>
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
                        : 'No activity'}
                    </td>
                  </tr>
                )
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    {searchQuery || Object.values(filters).some(v => v) 
                      ? 'No inventory items match your filters' 
                      : 'No inventory found'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-700">
          <div>
            Showing <span className="font-medium">{filteredData.length}</span> of <span className="font-medium">{inventoryData.length}</span> inventory items
          </div>
          {filteredData.length > 0 && (
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 rounded"></div>
                Out of Stock
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-100 rounded"></div>
                Low Stock (&lt;10)
              </span>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

interface SummaryCardProps {
  title: string
  value: string
  icon: React.ElementType
  subtitle?: string
  highlight?: boolean
  trend?: 'up' | 'down'
  trendValue?: string
}

function SummaryCard({ title, value, icon: Icon, subtitle, highlight, trend, trendValue }: SummaryCardProps) {
  return (
    <div className={`border rounded-lg p-4 transition-all ${
      highlight ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : ''
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            {trend && trendValue && (
              <span className={`text-xs flex items-center gap-1 ${
                trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trendValue}
              </span>
            )}
          </div>
          <p className={`text-2xl font-bold mt-1 ${
            highlight ? 'text-orange-600' : ''
          }`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <Icon className={`h-8 w-8 ${
          highlight ? 'text-orange-400' : 'text-gray-400'
        }`} />
      </div>
    </div>
  )
}