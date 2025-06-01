'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useRouter } from 'next/navigation'

export default function AdminImportPage() {
  const router = useRouter()
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runImport = async () => {
    setImporting(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setResults(data)
      } else {
        setError(data.error || 'Import failed')
      }
    } catch (err) {
      setError('Failed to run import')
    } finally {
      setImporting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Import Data</h1>
          <p className="text-muted-foreground">
            Import data from Excel files
          </p>
        </div>

        {/* Import Options */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Excel Import */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Import from Excel</h3>
                <p className="text-sm text-gray-600">
                  Import master data from Excel file
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 font-medium mb-2">
                  This will import:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>SKU Master data</li>
                  <li>Warehouse configurations</li>
                  <li>Cost rates</li>
                  <li>Inventory transactions</li>
                </ul>
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Important</p>
                    <p className="text-sm text-amber-700">
                      Make sure the Excel file is in the data folder and named "Warehouse Management.xlsx"
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={runImport}
                disabled={importing}
                className="w-full inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <div className="loading-spinner mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Run Import
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Manual Upload */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Upload Files</h3>
                <p className="text-sm text-gray-600">
                  Upload invoice files or other documents
                </p>
              </div>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-700 mb-2">Drop files here or click to browse</p>
              <p className="text-sm text-gray-500 mb-4">
                Supports Excel, CSV, and PDF formats
              </p>
              <button className="action-button">
                Select Files
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Import Successful</h3>
                <div className="mt-2 space-y-1 text-sm text-green-800">
                  <p>• SKUs: {results.skus || 0}</p>
                  <p>• Warehouse Configs: {results.configs || 0}</p>
                  <p>• Cost Rates: {results.rates || 0}</p>
                  <p>• Transactions: {results.transactions || 0}</p>
                  <p>• Inventory Items: {results.balances || 0}</p>
                </div>
                <button
                  onClick={() => router.push('/admin/inventory')}
                  className="mt-4 text-green-700 hover:text-green-800 font-medium"
                >
                  View Inventory →
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Import Failed</h3>
                <p className="mt-1 text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Import Instructions</h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <p className="font-medium">1. Prepare your Excel file</p>
              <p className="text-gray-600 ml-4">
                Ensure your Excel file contains the following sheets: sku master, warehouse config, cost master, and inventory ledger
              </p>
            </div>
            <div>
              <p className="font-medium">2. Place file in data folder</p>
              <p className="text-gray-600 ml-4">
                The file should be named "Warehouse Management.xlsx" and placed in the project's data folder
              </p>
            </div>
            <div>
              <p className="font-medium">3. Run the import</p>
              <p className="text-gray-600 ml-4">
                Click the "Run Import" button to process the file. This will clear existing data and import fresh data.
              </p>
            </div>
            <div>
              <p className="font-medium">4. Generate calculations</p>
              <p className="text-gray-600 ml-4">
                After import, go to the Calculations page to generate storage ledger and other calculated data
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}