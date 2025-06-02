'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Package2, RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface SyncResult {
  message: string
  synced?: number
  updated?: number
  errors?: Array<{ asin: string; error: string }>
}

export default function AmazonIntegrationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [syncing, setSyncing] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<{ [key: string]: Date }>({})
  const [syncResults, setSyncResults] = useState<{ [key: string]: SyncResult }>({})

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

  const handleSync = async (syncType: string) => {
    setSyncing(syncType)
    try {
      const response = await fetch('/api/amazon/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType })
      })

      const result = await response.json()

      if (response.ok) {
        setSyncResults(prev => ({ ...prev, [syncType]: result }))
        setLastSync(prev => ({ ...prev, [syncType]: new Date() }))
        toast.success(result.message)
      } else {
        toast.error(result.message || 'Sync failed')
      }
    } catch (error) {
      toast.error('Failed to sync Amazon data')
      console.error('Sync error:', error)
    } finally {
      setSyncing(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Amazon Integration"
          subtitle="Sync data with Amazon Seller Central"
          description="Import inventory levels, product details, and orders from Amazon FBA. This integration helps keep your warehouse system in sync with Amazon's fulfillment centers."
          icon={Package2}
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
          borderColor="border-orange-200"
          textColor="text-orange-800"
        />

        {/* Sync Options */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Inventory Sync */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Inventory Sync</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Import current FBA inventory levels and update stock quantities
                </p>
              </div>
              <Package2 className="h-8 w-8 text-gray-400" />
            </div>

            {lastSync.inventory && (
              <div className="text-sm text-gray-500 mb-4">
                Last synced: {lastSync.inventory.toLocaleString()}
              </div>
            )}

            {syncResults.inventory && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {syncResults.inventory.message}
                </p>
                {syncResults.inventory.errors && syncResults.inventory.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-red-600 cursor-pointer">
                      {syncResults.inventory.errors.length} errors occurred
                    </summary>
                    <ul className="mt-2 text-xs text-gray-600 space-y-1">
                      {syncResults.inventory.errors.map((error, idx) => (
                        <li key={idx}>
                          {error.asin}: {error.error}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <button
              onClick={() => handleSync('inventory')}
              disabled={syncing !== null}
              className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncing === 'inventory' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Inventory
                </>
              )}
            </button>
          </div>

          {/* Product Details Sync */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Product Details</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Update product information from Amazon catalog (titles, dimensions, weights)
                </p>
              </div>
              <Package2 className="h-8 w-8 text-gray-400" />
            </div>

            {lastSync.products && (
              <div className="text-sm text-gray-500 mb-4">
                Last synced: {lastSync.products.toLocaleString()}
              </div>
            )}

            {syncResults.products && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {syncResults.products.message}
                </p>
                {syncResults.products.errors && syncResults.products.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-red-600 cursor-pointer">
                      {syncResults.products.errors.length} errors occurred
                    </summary>
                    <ul className="mt-2 text-xs text-gray-600 space-y-1">
                      {syncResults.products.errors.map((error, idx) => (
                        <li key={idx}>
                          {error.asin}: {error.error}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <button
              onClick={() => handleSync('products')}
              disabled={syncing !== null}
              className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {syncing === 'products' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Products
                </>
              )}
            </button>
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">How Amazon Integration Works</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Inventory Sync:</strong> Imports current FBA inventory levels and creates adjustment transactions to match Amazon's quantities</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Product Details:</strong> Updates product information like titles, dimensions, and weights from Amazon's catalog</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Automatic SKU Creation:</strong> Creates new SKUs for products found in Amazon that don't exist in your system</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Amazon Warehouse:</strong> All Amazon inventory is tracked under a virtual "Amazon FBA UK" warehouse</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Configuration Status */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">API Configuration Status</h3>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Application ID:</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {process.env.AMAZON_SP_APP_ID ? '✓ Configured' : '✗ Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Refresh Token:</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {process.env.AMAZON_REFRESH_TOKEN ? '✓ Configured' : '✗ Not configured'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Marketplace:</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                UK (A1F83G8C2ARO7P)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Region:</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                Europe (eu-west-1)
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}