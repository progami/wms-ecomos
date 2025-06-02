'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package2, Plus, Save, X, AlertCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { toast } from 'react-hot-toast'
import { useSession } from 'next-auth/react'

export default function WarehouseReceivePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([
    { 
      id: 1, 
      skuCode: '', 
      batchLot: '', 
      cartons: 0, 
      pallets: 0, 
      calculatedPallets: 0,
      units: 0,
      storageCartonsPerPallet: 0,
      shippingCartonsPerPallet: 0,
      configLoaded: false,
      palletVariance: false
    }
  ])

  const addItem = () => {
    setItems([
      ...items,
      { 
        id: Date.now(), 
        skuCode: '', 
        batchLot: '', 
        cartons: 0, 
        pallets: 0, 
        calculatedPallets: 0,
        units: 0,
        storageCartonsPerPallet: 0,
        shippingCartonsPerPallet: 0,
        configLoaded: false,
        palletVariance: false
      }
    ])
  }

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = async (id: number, field: string, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
    
    // If SKU code changed, fetch warehouse config
    if (field === 'skuCode' && value) {
      await fetchWarehouseConfig(id, value)
    }
  }
  
  const fetchWarehouseConfig = async (itemId: number, skuCode: string) => {
    try {
      const warehouseId = session?.user.warehouseId
      if (!warehouseId) return
      
      // First get the SKU ID
      const skuResponse = await fetch(`/api/skus?search=${skuCode}`)
      if (!skuResponse.ok) return
      
      const skus = await skuResponse.json()
      const sku = skus.find((s: any) => s.skuCode === skuCode)
      if (!sku) return
      
      // Then get the warehouse config
      const configResponse = await fetch(`/api/warehouse-configs?warehouseId=${warehouseId}&skuId=${sku.id}`)
      if (!configResponse.ok) return
      
      const configs = await configResponse.json()
      if (configs.length > 0) {
        const config = configs[0] // Get the most recent config
        setItems(items.map(item => {
          if (item.id === itemId) {
            const calculatedPallets = item.cartons > 0 && config.storageCartonsPerPallet > 0
              ? Math.ceil(item.cartons / config.storageCartonsPerPallet)
              : 0
            
            return { 
              ...item, 
              storageCartonsPerPallet: config.storageCartonsPerPallet || 0,
              shippingCartonsPerPallet: config.shippingCartonsPerPallet || 0,
              configLoaded: true,
              calculatedPallets,
              // Only auto-update pallets if user hasn't manually entered a value
              pallets: item.pallets > 0 ? item.pallets : calculatedPallets,
              palletVariance: item.pallets > 0 && item.pallets !== calculatedPallets
            }
          }
          return item
        }))
      }
    } catch (error) {
      console.error('Error fetching warehouse config:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const formData = new FormData(e.target as HTMLFormElement)
    const receiptDate = formData.get('receiptDate') as string
    
    // Validate date is not in future
    const receiptDateObj = new Date(receiptDate)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    if (receiptDateObj > today) {
      toast.error('Receipt date cannot be in the future')
      return
    }
    
    // Validate date is not too old
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    if (receiptDateObj < oneYearAgo) {
      toast.error('Receipt date is too far in the past (max 1 year)')
      return
    }
    
    // Validate items
    const validItems = items.filter(item => item.skuCode && item.cartons > 0)
    if (validItems.length === 0) {
      toast.error('Please add at least one item with quantity')
      return
    }
    
    // Validate pallet configurations
    for (const item of validItems) {
      if (!item.storageCartonsPerPallet || item.storageCartonsPerPallet <= 0) {
        toast.error(`Please enter storage cartons per pallet for SKU ${item.skuCode}`)
        return
      }
      if (!item.shippingCartonsPerPallet || item.shippingCartonsPerPallet <= 0) {
        toast.error(`Please enter shipping cartons per pallet for SKU ${item.skuCode}`)
        return
      }
    }
    
    // Check for duplicate SKU/batch combinations
    const seen = new Set()
    for (const item of validItems) {
      const key = `${item.skuCode}-${item.batchLot}`
      if (seen.has(key)) {
        toast.error(`Duplicate SKU/Batch combination: ${item.skuCode} - ${item.batchLot}`)
        return
      }
      seen.add(key)
    }
    
    // Validate all numeric values are integers
    for (const item of validItems) {
      if (!Number.isInteger(item.cartons) || item.cartons <= 0 || item.cartons > 99999) {
        toast.error(`Invalid cartons value for SKU ${item.skuCode}. Must be between 1 and 99,999`)
        return
      }
      if (item.pallets && (!Number.isInteger(item.pallets) || item.pallets < 0 || item.pallets > 9999)) {
        toast.error(`Invalid pallets value for SKU ${item.skuCode}. Must be between 0 and 9,999`)
        return
      }
      if (item.units && (!Number.isInteger(item.units) || item.units < 0)) {
        toast.error(`Invalid units value for SKU ${item.skuCode}. Must be non-negative`)
        return
      }
    }
    
    setLoading(true)
    
    const referenceNumber = formData.get('referenceNumber') as string
    const supplier = formData.get('supplier') as string
    const notes = formData.get('notes') as string
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'RECEIVE',
          referenceNumber,
          date: receiptDate,
          items: validItems,
          notes: supplier ? `Supplier: ${supplier}. ${notes}` : notes,
          warehouseId: session?.user.warehouseId, // Include warehouse ID if not staff
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(`Receipt saved successfully! ${data.message}`)
        router.push('/warehouse/inventory')
      } else {
        toast.error(data.error || 'Failed to save receipt')
        if (data.details) {
          console.error('Error details:', data.details)
        }
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to save receipt. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Receive Goods</h1>
            <p className="text-muted-foreground">
              Record incoming inventory
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
                  Reference Number
                </label>
                <input
                  type="text"
                  name="referenceNumber"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., PO-2024-001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  name="supplier"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receipt Date
                </label>
                <input
                  type="date"
                  name="receiptDate"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Items Received</h3>
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
                      Cartons
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Storage Cartons/Pallet
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shipping Cartons/Pallet
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
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.cartons}
                          onChange={(e) => {
                            const newCartons = parseInt(e.target.value) || 0
                            updateItem(item.id, 'cartons', newCartons)
                            // Calculate pallets if config is loaded
                            if (item.configLoaded && item.storageCartonsPerPallet > 0) {
                              const calculatedPallets = Math.ceil(newCartons / item.storageCartonsPerPallet)
                              updateItem(item.id, 'calculatedPallets', calculatedPallets)
                              // Only auto-update actual pallets if user hasn't manually entered
                              if (!item.palletVariance) {
                                updateItem(item.id, 'pallets', calculatedPallets)
                              } else {
                                // Recalculate variance
                                updateItem(item.id, 'palletVariance', item.pallets !== calculatedPallets)
                              }
                            }
                          }}
                          className="w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          min="0"
                          required
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.storageCartonsPerPallet}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value) || 0
                            updateItem(item.id, 'storageCartonsPerPallet', newValue)
                            // Recalculate pallets
                            if (newValue > 0 && item.cartons > 0) {
                              const calculatedPallets = Math.ceil(item.cartons / newValue)
                              updateItem(item.id, 'calculatedPallets', calculatedPallets)
                              // Check if we should update actual pallets
                              if (!item.palletVariance) {
                                updateItem(item.id, 'pallets', calculatedPallets)
                              } else {
                                updateItem(item.id, 'palletVariance', item.pallets !== calculatedPallets)
                              }
                            }
                          }}
                          className={`w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary ${
                            item.configLoaded ? 'bg-yellow-50' : ''
                          }`}
                          min="1"
                          placeholder="Loading..."
                          title={item.configLoaded ? 'Loaded from warehouse config (editable)' : 'Enter value'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.shippingCartonsPerPallet}
                          onChange={(e) => updateItem(item.id, 'shippingCartonsPerPallet', parseInt(e.target.value) || 0)}
                          className={`w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary ${
                            item.configLoaded ? 'bg-yellow-50' : ''
                          }`}
                          min="1"
                          placeholder="Loading..."
                          title={item.configLoaded ? 'Loaded from warehouse config (editable)' : 'Enter value'}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <input
                            type="number"
                            value={item.pallets}
                            onChange={(e) => {
                              const newPallets = parseInt(e.target.value) || 0
                              const calculatedPallets = item.cartons > 0 && item.storageCartonsPerPallet > 0
                                ? Math.ceil(item.cartons / item.storageCartonsPerPallet)
                                : 0
                              updateItem(item.id, 'pallets', newPallets)
                              updateItem(item.id, 'calculatedPallets', calculatedPallets)
                              updateItem(item.id, 'palletVariance', newPallets !== calculatedPallets)
                            }}
                            className={`w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary ${
                              item.palletVariance ? 'border-yellow-500 bg-yellow-50' : ''
                            }`}
                            min="0"
                            title="Actual pallets (editable)"
                          />
                          {item.configLoaded && item.calculatedPallets > 0 && (
                            <div className="text-xs text-gray-500 text-right">
                              Calc: {item.calculatedPallets}
                              {item.palletVariance && (
                                <span className="text-yellow-600 ml-1" title="Variance between actual and calculated">
                                  (Δ {Math.abs(item.pallets - item.calculatedPallets)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
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
                    <td colSpan={2}></td>
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
            <h3 className="text-lg font-semibold mb-4">Additional Notes</h3>
            <textarea
              name="notes"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Any additional notes or comments..."
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Receipt
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}