'use client'

import { useState } from 'react'
import { Upload, Download, FileText, Plus, Search } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function FinanceInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoice Management</h1>
            <p className="text-muted-foreground">
              Process and manage warehouse invoices
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="secondary-button">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </button>
            <button className="action-button">
              <Plus className="h-4 w-4 mr-2" />
              New Invoice
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice number, warehouse, or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <select className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">All Warehouses</option>
            <option value="FMC">FMC</option>
            <option value="Vglobal">Vglobal</option>
            <option value="4as">4as</option>
          </select>
          <select className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="reconciled">Reconciled</option>
            <option value="disputed">Disputed</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Invoice Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billing Period
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  INV-2024-001
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  FMC
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Dec 16 - Jan 15
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  $12,345.67
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="badge-warning">Pending</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Jan 31, 2024
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-primary hover:text-primary/80 mr-3">View</button>
                  <button className="text-primary hover:text-primary/80">Process</button>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  INV-2024-002
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Vglobal
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Dec 16 - Jan 15
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  $8,765.43
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="badge-success">Approved</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Jan 31, 2024
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-primary hover:text-primary/80 mr-3">View</button>
                  <button className="text-green-600 hover:text-green-700">Pay</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Invoice Upload Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Invoice Upload</h3>
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-blue-400 mb-4" />
            <p className="text-gray-700 mb-2">Drop invoice files here or click to browse</p>
            <p className="text-sm text-gray-500 mb-4">Supports PDF, Excel, and CSV formats</p>
            <button className="action-button">
              <Upload className="h-4 w-4 mr-2" />
              Select Files
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}