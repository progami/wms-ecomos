'use client'

import { useState } from 'react'
import { Calculator, Play, Calendar, Package2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function AdminCalculationsPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  const runCalculation = async (type: string, additionalParams?: any) => {
    setLoading(type)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...additionalParams }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
      } else {
        setError(data.error || 'Calculation failed')
      }
    } catch (err) {
      setError('Failed to run calculation')
    } finally {
      setLoading(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Calculations</h1>
          <p className="text-muted-foreground">
            Run system calculations for inventory and storage
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Inventory Balance Calculation */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Inventory Balance</h3>
                <p className="text-sm text-gray-600">
                  Update current inventory balances from transactions
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  This calculation will:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                  <li>Sum all inventory transactions by SKU/batch</li>
                  <li>Calculate current carton counts</li>
                  <li>Update pallet requirements</li>
                  <li>Convert to unit quantities</li>
                </ul>
              </div>
              
              <button
                onClick={() => runCalculation('inventory-balance')}
                disabled={loading === 'inventory-balance'}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'inventory-balance' ? (
                  <>
                    <div className="loading-spinner mr-2" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Inventory Balance Update
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Storage Ledger Calculation */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Storage Ledger</h3>
                <p className="text-sm text-gray-600">
                  Generate weekly storage charges for billing period
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  This calculation will:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                  <li>Take Monday snapshots of inventory</li>
                  <li>Calculate pallets used per week</li>
                  <li>Apply weekly storage rates</li>
                  <li>Generate billing period charges</li>
                </ul>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    id="year"
                    defaultValue={currentYear}
                    min={2020}
                    max={2030}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <select
                    id="month"
                    defaultValue={currentMonth}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={() => {
                  const year = parseInt((document.getElementById('year') as HTMLInputElement).value)
                  const month = parseInt((document.getElementById('month') as HTMLSelectElement).value)
                  runCalculation('storage-ledger', { year, month })
                }}
                disabled={loading === 'storage-ledger'}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'storage-ledger' ? (
                  <>
                    <div className="loading-spinner mr-2" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Generate Storage Ledger
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Calculator className="h-6 w-6 text-indigo-600 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">About Calculations</h3>
              <div className="mt-2 space-y-2 text-sm text-gray-700">
                <p>
                  The system automatically calculates derived data based on your input transactions:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Inventory Balance:</strong> Real-time stock levels calculated from all transactions</li>
                  <li><strong>Storage Ledger:</strong> Weekly storage charges based on Monday inventory snapshots</li>
                  <li><strong>Calculated Costs:</strong> Expected charges for all warehouse activities (coming soon)</li>
                </ul>
                <p className="mt-3">
                  Run these calculations after importing new transaction data or at the end of each billing period.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}