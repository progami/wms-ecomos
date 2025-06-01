'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Building2, Package, Settings as SettingsIcon, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface Warehouse {
  id: string
  code: string
  name: string
  address?: string
  contactEmail?: string
  contactPhone?: string
  isActive: boolean
  _count: {
    users: number
    inventoryBalances: number
    invoices: number
  }
}

export default function WarehouseSettingsPage() {
  const router = useRouter()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    fetchWarehouses()
  }, [showInactive])

  const fetchWarehouses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (showInactive) params.append('includeInactive', 'true')
      
      const response = await fetch(`/api/warehouses?${params}`)
      if (!response.ok) throw new Error('Failed to fetch warehouses')
      
      const data = await response.json()
      setWarehouses(data)
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (warehouseId: string) => {
    router.push(`/admin/settings/warehouses/${warehouseId}/edit`)
  }

  const handleDelete = async (warehouse: Warehouse) => {
    const hasData = Object.values(warehouse._count).some(count => count > 0)
    const message = hasData
      ? `This warehouse has related data and will be deactivated instead of deleted. Continue?`
      : `Are you sure you want to delete ${warehouse.name}? This action cannot be undone.`
    
    if (!confirm(message)) return

    try {
      const response = await fetch(`/api/warehouses?id=${warehouse.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete warehouse')
      
      const result = await response.json()
      alert(result.message)
      await fetchWarehouses()
    } catch (error) {
      console.error('Error deleting warehouse:', error)
      alert('Failed to delete warehouse')
    }
  }

  const handleToggleActive = async (warehouse: Warehouse) => {
    try {
      const response = await fetch(`/api/warehouses?id=${warehouse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !warehouse.isActive })
      })

      if (!response.ok) throw new Error('Failed to update warehouse')
      
      await fetchWarehouses()
    } catch (error) {
      console.error('Error updating warehouse:', error)
      alert('Failed to update warehouse')
    }
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

        {/* Filter Options */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {showInactive ? 'All Warehouses' : 'Active Warehouses'}
          </h2>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Show inactive</span>
          </label>
        </div>

        {/* Warehouses List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : warehouses.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
              <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No warehouses found</p>
            </div>
          ) : (
            warehouses.map((warehouse) => (
              <WarehouseCard
                key={warehouse.id}
                warehouse={warehouse}
                onEdit={() => handleEdit(warehouse.id)}
                onDelete={() => handleDelete(warehouse)}
                onToggleActive={() => handleToggleActive(warehouse)}
              />
            ))
          )}
        </div>

        {/* Quick Links */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Related Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/settings/skus"
              className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <Package className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="font-medium">SKU Management</p>
                <p className="text-sm text-gray-600">Configure product SKUs</p>
              </div>
            </Link>
            <Link
              href="/admin/settings/rates"
              className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <SettingsIcon className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="font-medium">Cost Rates</p>
                <p className="text-sm text-gray-600">Set warehouse pricing</p>
              </div>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <Building2 className="h-8 w-8 text-primary mr-3" />
              <div>
                <p className="font-medium">User Access</p>
                <p className="text-sm text-gray-600">Assign warehouse staff</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

interface WarehouseCardProps {
  warehouse: Warehouse
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}

function WarehouseCard({ warehouse, onEdit, onDelete, onToggleActive }: WarehouseCardProps) {
  const { name, code, address, contactEmail, contactPhone, isActive, _count } = warehouse

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
          <button 
            onClick={onEdit}
            className="p-1 hover:bg-gray-100 rounded"
            title="Edit warehouse"
          >
            <Edit className="h-4 w-4 text-gray-600" />
          </button>
          <button 
            onClick={onDelete}
            className="p-1 hover:bg-gray-100 rounded"
            title="Delete warehouse"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        {address && <p className="text-muted-foreground">{address}</p>}
        {contactEmail && <p className="text-muted-foreground">{contactEmail}</p>}
        {contactPhone && <p className="text-muted-foreground">{contactPhone}</p>}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <button
            onClick={onToggleActive}
            className="text-xs text-primary hover:underline"
          >
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{_count.inventoryBalances}</p>
          <p className="text-xs text-gray-600">SKUs in Stock</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{_count.invoices}</p>
          <p className="text-xs text-gray-600">Invoices</p>
        </div>
      </div>
    </div>
  )
}