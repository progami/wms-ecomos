'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package2, Plus, Save, X, ArrowLeft } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { toast } from 'react-hot-toast'

export default function NewInventoryTransactionPage() {
  const router = useRouter()
  const [transactionType, setTransactionType] = useState<'RECEIVE' | 'SHIP' | 'ADJUSTMENT'>('RECEIVE')
  const [items, setItems] = useState([
    { id: 1, skuCode: '', batchLot: '', cartons: 0, pallets: 0, units: 0, warehouseId: '' }
  ])
  const [loading, setLoading] = useState(false)

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now(), skuCode: '', batchLot: '', cartons: 0, pallets: 0, units: 0, warehouseId: '' }
    ])
  }

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.target as HTMLFormElement)
    const referenceNumber = formData.get('referenceNumber') as string
    const date = formData.get('transactionDate') as string
    const notes = formData.get('notes') as string
    
    try {
      // Validate items
      const validItems = items.filter(item => item.skuCode && item.warehouseId)
      if (validItems.length === 0) {
        toast.error('Please add at least one valid item')
        setLoading(false)
        return
      }

      const response = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionType,
          referenceNumber,
          date,
          items: validItems,
          notes,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Transaction created successfully!')
        router.push('/admin/inventory')
      } else {
        toast.error(data.error || 'Failed to create transaction')
      }
    } catch (error) {
      toast.error('Failed to save transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">New Inventory Transaction</h1>
            <p className="text-muted-foreground">
              Create a new inventory movement
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/inventory')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type Selection */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Transaction Type</h3>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setTransactionType('RECEIVE')}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  transactionType === 'RECEIVE' 
                    ? 'border-green-500 bg-green-50 text-green-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Package2 className="h-8 w-8 mx-auto mb-2" />
                <div className="font-medium">Receive</div>
                <div className="text-sm text-gray-600">Incoming goods</div>
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('SHIP')}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  transactionType === 'SHIP' 
                    ? 'border-red-500 bg-red-50 text-red-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Package2 className="h-8 w-8 mx-auto mb-2" />
                <div className="font-medium">Ship</div>
                <div className="text-sm text-gray-600">Outgoing goods</div>
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('ADJUSTMENT')}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  transactionType === 'ADJUSTMENT' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Package2 className="h-8 w-8 mx-auto mb-2" />
                <div className="font-medium">Adjustment</div>
                <div className="text-sm text-gray-600">Stock corrections</div>
              </button>
            </div>
          </div>

          {/* Header Information */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number *
                </label>
                <input
                  type="text"
                  name="referenceNumber"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={transactionType === 'RECEIVE' ? 'PO-2024-001' : transactionType === 'SHIP' ? 'SO-2024-001' : 'ADJ-2024-001'}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Date *
                </label>
                <input
                  type="date"
                  name="transactionDate"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {transactionType === 'RECEIVE' ? 'Supplier' : transactionType === 'SHIP' ? 'Customer' : 'Reason'}
                </label>
                <input
                  type="text"
                  name="party"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={transactionType === 'RECEIVE' ? 'Supplier name' : transactionType === 'SHIP' ? 'Customer name' : 'Adjustment reason'}
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Items</h3>
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
                      Warehouse *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU Code *
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch/Lot *
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cartons *
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pallets
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Units *
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <select
                          value={item.warehouseId}
                          onChange={(e) => updateItem(item.id, 'warehouseId', e.target.value)}
                          className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          required
                        >
                          <option value="">Select warehouse</option>
                          <option value="warehouse-1">FMC Warehouse</option>
                          <option value="warehouse-2">Vglobal Warehouse</option>
                          <option value="warehouse-3">4AS Warehouse</option>
                        </select>
                      </td>
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
                          onChange={(e) => updateItem(item.id, 'cartons', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          min="0"
                          required
                        />
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
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold">
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
              onClick={() => router.push('/admin/inventory')}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Transaction
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}