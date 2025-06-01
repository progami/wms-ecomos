'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Edit2, Save, X, Plus } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { toast } from 'react-hot-toast'

interface CostRate {
  id: string
  name: string
  type: 'STORAGE' | 'HANDLING' | 'SHIPPING' | 'OTHER'
  unit: string
  rate: number
  effectiveDate: string
  warehouseId?: string
  warehouse?: { name: string }
}

export default function AdminRatesPage() {
  const [rates, setRates] = useState<CostRate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedRate, setEditedRate] = useState<Partial<CostRate>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRate, setNewRate] = useState<Partial<CostRate>>({
    name: '',
    type: 'STORAGE',
    unit: 'per pallet/week',
    rate: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchRates()
  }, [])

  const fetchRates = async () => {
    try {
      const response = await fetch('/api/settings/rates')
      if (response.ok) {
        const data = await response.json()
        setRates(data)
      }
    } catch (error) {
      toast.error('Failed to load rates')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (rate: CostRate) => {
    setEditingId(rate.id)
    setEditedRate(rate)
  }

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/settings/rates/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedRate),
      })

      if (response.ok) {
        toast.success('Rate updated successfully')
        fetchRates()
        setEditingId(null)
      }
    } catch (error) {
      toast.error('Failed to update rate')
    }
  }

  const handleAdd = async () => {
    try {
      const response = await fetch('/api/settings/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRate),
      })

      if (response.ok) {
        toast.success('Rate added successfully')
        fetchRates()
        setShowAddForm(false)
        setNewRate({
          name: '',
          type: 'STORAGE',
          unit: 'per pallet/week',
          rate: 0,
          effectiveDate: new Date().toISOString().split('T')[0],
        })
      }
    } catch (error) {
      toast.error('Failed to add rate')
    }
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cost Rates</h1>
            <p className="text-muted-foreground">
              Configure pricing and rate structures for 3PL services
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rate
          </button>
        </div>

        {/* Add Rate Form */}
        {showAddForm && (
          <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold mb-4">Add New Rate</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={newRate.name}
                  onChange={(e) => setNewRate({ ...newRate, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Weekly Storage"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={newRate.type}
                  onChange={(e) => setNewRate({ ...newRate, type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="STORAGE">Storage</option>
                  <option value="HANDLING">Handling</option>
                  <option value="SHIPPING">Shipping</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit *</label>
                <input
                  type="text"
                  value={newRate.unit}
                  onChange={(e) => setNewRate({ ...newRate, unit: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., per pallet/week"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rate ($) *</label>
                <input
                  type="number"
                  value={newRate.rate}
                  onChange={(e) => setNewRate({ ...newRate, rate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Effective Date *</label>
                <input
                  type="date"
                  value={newRate.effectiveDate}
                  onChange={(e) => setNewRate({ ...newRate, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Warehouse</label>
                <select
                  value={newRate.warehouseId || ''}
                  onChange={(e) => setNewRate({ ...newRate, warehouseId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Warehouses</option>
                  <option value="warehouse-1">FMC Warehouse</option>
                  <option value="warehouse-2">Vglobal Warehouse</option>
                  <option value="warehouse-3">4AS Warehouse</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                Add Rate
              </button>
            </div>
          </div>
        )}

        {/* Rates by Type */}
        <div className="space-y-6">
          {['STORAGE', 'HANDLING', 'SHIPPING', 'OTHER'].map((type) => {
            const typeRates = rates.filter(r => r.type === type)
            if (typeRates.length === 0) return null

            return (
              <div key={type} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3">
                  <h3 className="text-lg font-semibold">
                    {type.charAt(0) + type.slice(1).toLowerCase()} Rates
                  </h3>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Warehouse
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Effective Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {typeRates.map((rate) => (
                      <tr key={rate.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {editingId === rate.id ? (
                            <input
                              type="text"
                              value={editedRate.name}
                              onChange={(e) => setEditedRate({ ...editedRate, name: e.target.value })}
                              className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            rate.name
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {editingId === rate.id ? (
                            <input
                              type="text"
                              value={editedRate.unit}
                              onChange={(e) => setEditedRate({ ...editedRate, unit: e.target.value })}
                              className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          ) : (
                            rate.unit
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingId === rate.id ? (
                            <input
                              type="number"
                              value={editedRate.rate}
                              onChange={(e) => setEditedRate({ ...editedRate, rate: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                              step="0.01"
                            />
                          ) : (
                            `$${rate.rate.toFixed(2)}`
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {rate.warehouse?.name || 'All Warehouses'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(rate.effectiveDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {editingId === rate.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={handleSave}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(rate)}
                              className="text-primary hover:text-primary/80"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>

        {/* Standard Rates Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <DollarSign className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rate Configuration Guide</h3>
              <div className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p>Configure rates for different services:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Storage Rates:</strong> Weekly charges per pallet stored</li>
                  <li><strong>Handling Rates:</strong> Fees for receiving, shipping, and labor</li>
                  <li><strong>Shipping Rates:</strong> Transportation and delivery costs</li>
                  <li><strong>Other Rates:</strong> Additional services like labeling, repackaging</li>
                </ul>
                <p className="mt-3">
                  Rates can be set globally or per warehouse. Effective dates allow you to schedule rate changes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}