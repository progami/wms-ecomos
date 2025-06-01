'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, Plus, Save, X, AlertTriangle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { toast } from 'react-hot-toast'
import { useSession } from 'next-auth/react'

export default function WarehouseShipPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [inventory, setInventory] = useState<any[]>([])
  const [items, setItems] = useState([
    { id: 1, skuCode: '', batchLot: '', cartons: 0, pallets: 0, units: 0, available: 0 }
  ])

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now(), skuCode: '', batchLot: '', cartons: 0, pallets: 0, units: 0 }
    ])
  }

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        // Update availability when SKU or batch changes
        if ((field === 'skuCode' || field === 'batchLot') && updated.skuCode) {
          updated.available = checkAvailability(updated.skuCode, updated.batchLot)
        }
        
        return updated
      }
      return item
    }))
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory/balances')
      if (response.ok) {
        const data = await response.json()
        setInventory(data)
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    }
  }

  const checkAvailability = (skuCode: string, batchLot: string) => {
    const item = inventory.find(inv => 
      inv.sku.skuCode === skuCode && inv.batchLot === batchLot
    )
    return item?.currentCartons || 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate items
    const validItems = items.filter(item => item.skuCode && item.cartons > 0)
    if (validItems.length === 0) {
      toast.error('Please add at least one item with quantity')
      return
    }
    
    // Check for insufficient inventory
    const insufficientItems = validItems.filter(item => {
      const available = checkAvailability(item.skuCode, item.batchLot)
      return item.cartons > available
    })
    
    if (insufficientItems.length > 0) {
      toast.error('Insufficient inventory for some items')
      return
    }
    
    setLoading(true)
    
    const formData = new FormData(e.target as HTMLFormElement)
    const referenceNumber = formData.get('orderNumber') as string
    const date = formData.get('shipDate') as string
    const customer = formData.get('customer') as string
    const carrier = formData.get('carrier') as string
    const tracking = formData.get('tracking') as string
    const destination = formData.get('destination') as string
    const notes = formData.get('notes') as string
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SHIP',
          referenceNumber,
          date,
          items: validItems,
          notes: `Customer: ${customer}. Carrier: ${carrier}. Tracking: ${tracking}. Destination: ${destination}. ${notes}`,
          warehouseId: session?.user.warehouseId,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(`Shipment saved successfully! ${data.message}`)
        router.push('/warehouse/inventory')
      } else {
        toast.error(data.error || 'Failed to save shipment')
        if (data.details) {
          console.error('Error details:', data.details)
        }
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to save shipment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ship Goods</h1>
            <p className="text-muted-foreground">
              Process outbound shipments
            </p>
          </div>
          <button
            onClick={() => router.push('/warehouse/inventory')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Information */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Shipment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Number
                </label>
                <input
                  type="text"
                  name="orderNumber"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., SO-2024-001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer
                </label>
                <input
                  type="text"
                  name="customer"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Customer name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ship Date
                </label>
                <input
                  type="date"
                  name="shipDate"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carrier
                </label>
                <input
                  type="text"
                  name="carrier"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., FedEx, UPS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking Number
                </label>
                <input
                  type="text"
                  name="tracking"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Tracking number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  name="destination"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="City, Country"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Items to Ship</h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch/Lot
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cartons
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pallets
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Units
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.skuCode}
                          onChange={(e) => updateItem(item.id, 'skuCode', e.target.value)}
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="SKU code"
                          required
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.batchLot}
                          onChange={(e) => updateItem(item.id, 'batchLot', e.target.value)}
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Batch/Lot"
                          required
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.available > 0 ? (
                          <span className={item.cartons > item.available ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {item.available}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.cartons}
                          onChange={(e) => updateItem(item.id, 'cartons', parseInt(e.target.value) || 0)}
                          className={`w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary ${
                            item.cartons > item.available ? 'border-red-500 bg-red-50' : ''
                          }`}
                          min="0"
                          max={item.available}
                          required
                        />
                        {item.cartons > item.available && (
                          <p className="text-xs text-red-600 mt-1">Exceeds available</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.pallets}
                          onChange={(e) => updateItem(item.id, 'pallets', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.units}
                          onChange={(e) => updateItem(item.id, 'units', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          min="0"
                          required
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                          disabled={items.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right font-semibold">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {items.reduce((sum, item) => sum + item.cartons, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {items.reduce((sum, item) => sum + item.pallets, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {items.reduce((sum, item) => sum + item.units, 0).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Shipping Notes</h3>
            <textarea
              name="notes"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Any special instructions or notes..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/warehouse/inventory')}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Process Shipment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}