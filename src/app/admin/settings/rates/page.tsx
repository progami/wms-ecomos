'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DollarSign, Plus, Edit2, Calendar, AlertCircle, Filter } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface CostRate {
  id: string
  warehouseId: string
  warehouse: { name: string; code: string }
  costCategory: string
  costName: string
  costValue: number
  unitOfMeasure: string
  effectiveDate: string
  endDate?: string
  notes?: string
}

interface Warehouse {
  id: string
  name: string
  code: string
}

export default function AdminRatesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [rates, setRates] = useState<CostRate[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showActiveOnly, setShowActiveOnly] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'admin') {
      router.push('/auth/login')
      return
    }
    fetchData()
  }, [session, status, router])

  const fetchData = async () => {
    try {
      // Fetch rates
      const ratesResponse = await fetch('/api/settings/rates')
      if (ratesResponse.ok) {
        const data = await ratesResponse.json()
        setRates(data)
      }

      // Fetch warehouses
      const warehouseResponse = await fetch('/api/warehouses')
      if (warehouseResponse.ok) {
        const data = await warehouseResponse.json()
        setWarehouses(data)
      }
    } catch (error) {
      toast.error('Failed to load rates')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Storage: 'bg-blue-100 text-blue-800',
      Container: 'bg-purple-100 text-purple-800',
      Carton: 'bg-green-100 text-green-800',
      Pallet: 'bg-yellow-100 text-yellow-800',
      Unit: 'bg-pink-100 text-pink-800',
      Shipment: 'bg-indigo-100 text-indigo-800',
      Accessorial: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Filter rates
  const filteredRates = rates.filter(rate => {
    if (selectedWarehouse !== 'all' && rate.warehouseId !== selectedWarehouse) return false
    if (selectedCategory !== 'all' && rate.costCategory !== selectedCategory) return false
    if (showActiveOnly) {
      const now = new Date()
      const effectiveDate = new Date(rate.effectiveDate)
      const endDate = rate.endDate ? new Date(rate.endDate) : null
      const isActive = effectiveDate <= now && (!endDate || endDate >= now)
      if (!isActive) return false
    }
    return true
  })

  // Group rates by category
  const groupedRates = filteredRates.reduce((acc, rate) => {
    if (!acc[rate.costCategory]) {
      acc[rate.costCategory] = []
    }
    acc[rate.costCategory].push(rate)
    return acc
  }, {} as { [key: string]: CostRate[] })

  // Sort rates within each category by warehouse name and effective date
  Object.keys(groupedRates).forEach(category => {
    groupedRates[category].sort((a, b) => {
      const warehouseCompare = a.warehouse.name.localeCompare(b.warehouse.name)
      if (warehouseCompare !== 0) return warehouseCompare
      return new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    })
  })

  // Get unique categories in logical order
  const categoryOrder = ['Storage', 'Container', 'Carton', 'Pallet', 'Unit', 'Shipment', 'Accessorial']
  const categories = [...new Set(rates.map(r => r.costCategory))].sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a)
    const bIndex = categoryOrder.indexOf(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  // Count active storage rates per warehouse
  const storageRateCount = rates
    .filter(r => r.costCategory === 'Storage' && (!r.endDate || new Date(r.endDate) >= new Date()))
    .reduce((acc, rate) => {
      acc[rate.warehouseId] = (acc[rate.warehouseId] || 0) + 1
      return acc
    }, {} as { [key: string]: number })

  // Check for warehouses with multiple active storage rates
  const warehousesWithMultipleStorageRates = Object.entries(storageRateCount)
    .filter(([_, count]) => count > 1)
    .map(([warehouseId]) => warehouses.find(w => w.id === warehouseId)?.name)
    .filter(Boolean)

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Cost Rates Master"
          subtitle="3PL pricing and rate structures"
          description="Manage cost rates for all warehouses. Rates are organized by category (Storage, Container, Carton, etc.) as defined in the Excel system. Each warehouse must have exactly one active storage rate."
          icon={DollarSign}
          iconColor="text-green-600"
          bgColor="bg-green-50"
          borderColor="border-green-200"
          textColor="text-green-800"
          actions={
            <Link
              href="/admin/settings/rates/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rate
            </Link>
          }
        />

        {/* Warnings */}
        {warehousesWithMultipleStorageRates.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Multiple Storage Rates Detected</h3>
                <p className="text-sm text-red-800 mt-1">
                  The following warehouses have multiple active storage rates: {warehousesWithMultipleStorageRates.join(', ')}.
                  Each warehouse should have only one active storage rate at a time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-700">Filters</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse
              </label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Warehouses</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">Active rates only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Rates Display */}
        {Object.keys(groupedRates).length === 0 ? (
          <div className="bg-white border rounded-lg p-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rates Found</h3>
            <p className="text-gray-600 mb-4">
              {showActiveOnly ? 'No active rates match your filters.' : 'No rates match your filters.'}
            </p>
            <Link
              href="/admin/settings/rates/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Rate
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {categoryOrder
              .filter(category => groupedRates[category])
              .map((category) => {
                const categoryRates = groupedRates[category]
                return (
                <div key={category} className="bg-white border rounded-lg overflow-hidden">
                  <div className={`px-6 py-3 border-b ${getCategoryColor(category).replace('text-', 'bg-').replace('-800', '-50')}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-3">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCategoryColor(category)}`}>
                          {category}
                        </span>
                        <span className="text-gray-600">
                          {category === 'Storage' ? 'Weekly pallet storage charges' :
                           category === 'Container' ? 'Container handling charges' :
                           category === 'Carton' ? 'Per carton handling' :
                           category === 'Pallet' ? 'Pallet movement charges' :
                           category === 'Unit' ? 'Individual unit handling' :
                           category === 'Shipment' ? 'Per shipment/order charges' :
                           'Additional services'}
                        </span>
                      </h3>
                      <span className="text-sm text-gray-500">
                        {categoryRates.length} rate{categoryRates.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Warehouse
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
                            Effective Period
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categoryRates.map((rate) => {
                          const now = new Date()
                          const effectiveDate = new Date(rate.effectiveDate)
                          const endDate = rate.endDate ? new Date(rate.endDate) : null
                          const isActive = effectiveDate <= now && (!endDate || endDate >= now)
                          const isFuture = effectiveDate > now
                          
                          return (
                            <tr key={rate.id} className={!isActive ? 'bg-gray-50' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {rate.warehouse.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {rate.warehouse.code}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {rate.costName}
                                </div>
                                {rate.notes && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {rate.notes}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <span className="text-lg font-semibold text-gray-900">
                                  {formatCurrency(rate.costValue)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {rate.unitOfMeasure}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(rate.effectiveDate).toLocaleDateString()}
                                  {rate.endDate && (
                                    <>
                                      <span className="mx-1">→</span>
                                      {new Date(rate.endDate).toLocaleDateString()}
                                    </>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {isActive ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span>
                                ) : isFuture ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    Future
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Expired
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <Link
                                  href={`/admin/settings/rates/${rate.id}/edit`}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Link>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Information Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Cost Categories Reference</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-blue-900">Storage</h4>
                <p className="text-sm text-blue-800">Weekly pallet storage charges. Only one active rate per warehouse.</p>
                <p className="text-xs text-blue-700 mt-1">Required unit: pallet/week</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Container</h4>
                <p className="text-sm text-blue-800">Container handling and devanning charges.</p>
                <p className="text-xs text-blue-700 mt-1">Units: container, 20ft, 40ft, hc</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Carton</h4>
                <p className="text-sm text-blue-800">Per carton handling charges.</p>
                <p className="text-xs text-blue-700 mt-1">Units: carton, case</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Pallet</h4>
                <p className="text-sm text-blue-800">Pallet in/out movement charges.</p>
                <p className="text-xs text-blue-700 mt-1">Units: pallet, pallet/in, pallet/out</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-blue-900">Unit</h4>
                <p className="text-sm text-blue-800">Individual unit handling charges.</p>
                <p className="text-xs text-blue-700 mt-1">Units: unit, piece, item</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Shipment</h4>
                <p className="text-sm text-blue-800">Per shipment/order processing charges.</p>
                <p className="text-xs text-blue-700 mt-1">Units: shipment, order, delivery</p>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Accessorial</h4>
                <p className="text-sm text-blue-800">Additional services and special handling.</p>
                <p className="text-xs text-blue-700 mt-1">Units: hour, service, fee, charge</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}