'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, FileText, Calculator, Save, AlertCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { InvoiceTemplateEngine } from '@/lib/invoice-template-engine'

export default function GenerateInvoicePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [calculatedCharges, setCalculatedCharges] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    warehouseId: '',
    templateId: '',
    billingPeriodStart: '',
    billingPeriodEnd: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    includeUnreconciled: true,
    notes: ''
  })

  useEffect(() => {
    fetchWarehouses()
  }, [])

  useEffect(() => {
    if (formData.warehouseId) {
      fetchTemplates(formData.warehouseId)
    }
  }, [formData.warehouseId])

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses')
      if (response.ok) {
        const data = await response.json()
        setWarehouses(data)
      }
    } catch (error) {
      toast.error('Failed to load warehouses')
    }
  }

  const fetchTemplates = async (warehouseId: string) => {
    try {
      const response = await fetch(`/api/invoice-templates?warehouseId=${warehouseId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.filter((t: any) => t.warehouseId === warehouseId && t.isActive))
        
        // Auto-select default template
        const defaultTemplate = data.find((t: any) => t.isDefault && t.warehouseId === warehouseId)
        if (defaultTemplate) {
          setFormData(prev => ({ ...prev, templateId: defaultTemplate.id }))
        }
      }
    } catch (error) {
      toast.error('Failed to load templates')
    }
  }

  const calculateCharges = async () => {
    if (!formData.warehouseId || !formData.templateId || !formData.billingPeriodStart || !formData.billingPeriodEnd) {
      toast.error('Please fill in all required fields')
      return
    }

    setCalculating(true)
    
    try {
      // Fetch transactions for the period
      const params = new URLSearchParams({
        warehouseId: formData.warehouseId,
        startDate: formData.billingPeriodStart,
        endDate: formData.billingPeriodEnd,
        includeUnreconciled: formData.includeUnreconciled.toString()
      })

      const transResponse = await fetch(`/api/transactions/ledger?${params}`)
      if (!transResponse.ok) throw new Error('Failed to fetch transactions')
      
      const transData = await transResponse.json()
      setTransactions(transData.transactions)

      // Calculate charges using template
      const engine = new InvoiceTemplateEngine()
      await engine.loadTemplate(formData.warehouseId, formData.templateId)
      
      const charges = engine.calculateCharges(transData.transactions)
      const aggregated = engine.aggregateCharges(charges)
      
      setCalculatedCharges(aggregated)
      
      if (aggregated.length === 0) {
        toast.warning('No charges calculated for this period')
      } else {
        toast.success(`Calculated ${aggregated.length} charge types`)
      }
      
    } catch (error) {
      console.error('Calculation error:', error)
      toast.error('Failed to calculate charges')
    } finally {
      setCalculating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (calculatedCharges.length === 0) {
      toast.error('Please calculate charges first')
      return
    }

    setLoading(true)

    try {
      const totalAmount = calculatedCharges.reduce((sum, charge) => sum + charge.totalAmount, 0)
      
      const invoiceData = {
        warehouseId: formData.warehouseId,
        templateId: formData.templateId,
        billingPeriodStart: formData.billingPeriodStart,
        billingPeriodEnd: formData.billingPeriodEnd,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate || null,
        totalAmount,
        notes: formData.notes,
        lineItems: calculatedCharges.map(charge => ({
          costCategory: charge.costCategory,
          costName: charge.costName,
          quantity: charge.quantity,
          unitRate: charge.unitRate,
          amount: charge.totalAmount,
          notes: `${charge.transactionCount} transactions`
        }))
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create invoice')
      }

      const invoice = await response.json()
      toast.success('Invoice generated successfully!')
      router.push(`/finance/invoices/${invoice.id}`)
      
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      toast.error(error.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = calculatedCharges.reduce((sum, charge) => sum + charge.totalAmount, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Generate Invoice from Template"
          subtitle="Use warehouse templates to automatically calculate charges"
          icon={FileText}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          textColor="text-blue-800"
          actions={
            <Link
              href="/finance/invoices"
              className="inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Invoices
            </Link>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Template Selection</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value, templateId: '' })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Invoice Template <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.templateId}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!formData.warehouseId}
                >
                  <option value="">Select template</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.isDefault && '(Default)'}
                    </option>
                  ))}
                </select>
                {formData.warehouseId && templates.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    No active templates found for this warehouse
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Billing Period */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Billing Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Period Start <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.billingPeriodStart}
                  onChange={(e) => setFormData({ ...formData, billingPeriodStart: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Period End <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.billingPeriodEnd}
                  onChange={(e) => setFormData({ ...formData, billingPeriodEnd: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.includeUnreconciled}
                  onChange={(e) => setFormData({ ...formData, includeUnreconciled: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Include unreconciled transactions</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={calculateCharges}
                disabled={calculating || !formData.warehouseId || !formData.templateId}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calculating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate Charges
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Calculated Charges */}
          {calculatedCharges.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Calculated Charges</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Rate
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {calculatedCharges.map((charge, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm">{charge.costCategory}</td>
                        <td className="px-4 py-3 text-sm">{charge.costName}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {charge.quantity} {charge.unitOfMeasure}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          £{charge.unitRate.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          £{charge.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={4} className="px-4 py-3 text-sm font-medium text-right">
                        Total Amount:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right">
                        £{totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Additional notes for this invoice..."
                />
              </div>
            </div>
          )}

          {/* Transaction Summary */}
          {transactions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Transaction Summary</p>
                  <p className="text-yellow-700 mt-1">
                    Found {transactions.length} transactions in the selected period.
                    {!formData.includeUnreconciled && ' Only reconciled transactions will be included.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {calculatedCharges.length > 0 && (
            <div className="flex justify-end gap-3">
              <Link
                href="/finance/invoices"
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Generate Invoice
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  )
}