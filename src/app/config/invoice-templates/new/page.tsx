'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { FileText, Plus, Trash2, Save, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  WAREHOUSE_TEMPLATE_DEFAULTS, 
  InvoiceTemplateRule, 
  TransactionType, 
  CostCategory, 
  CalculationType 
} from '@/types/invoice-templates'

const TRANSACTION_TYPES: TransactionType[] = ['RECEIVE', 'SHIP', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER']
const COST_CATEGORIES: CostCategory[] = ['Container', 'Carton', 'Pallet', 'Storage', 'Unit', 'Shipment', 'Accessorial']
const CALCULATION_TYPES: CalculationType[] = ['FIXED_RATE', 'PERCENTAGE', 'TIERED', 'CUSTOM_FORMULA', 'RATE_TABLE']

export default function NewInvoiceTemplatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedWarehouseId = searchParams.get('warehouseId')
  
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    warehouseId: preselectedWarehouseId || '',
    description: '',
    isActive: true,
    isDefault: false
  })
  const [rules, setRules] = useState<Partial<InvoiceTemplateRule>[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/login')
      return
    }
    if (!['admin'].includes(session.user.role)) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    fetchWarehouses()
  }, [])

  useEffect(() => {
    // Load default rules when warehouse is selected
    if (formData.warehouseId && warehouses.length > 0) {
      const warehouse = warehouses.find(w => w.id === formData.warehouseId)
      if (warehouse && WAREHOUSE_TEMPLATE_DEFAULTS[warehouse.code]) {
        // Only load defaults if no rules exist yet
        if (rules.length === 0) {
          setRules(WAREHOUSE_TEMPLATE_DEFAULTS[warehouse.code])
        }
      }
    }
  }, [formData.warehouseId, warehouses])

  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/warehouses')
      if (response.ok) {
        const data = await response.json()
        setWarehouses(data)
      }
    } catch (error) {
      console.error('Failed to load warehouses:', error)
    }
  }

  const handleAddRule = () => {
    setRules([...rules, {
      transactionType: 'RECEIVE',
      costCategory: 'Container',
      costName: '',
      calculationType: 'FIXED_RATE',
      rateValue: 0,
      unitOfMeasure: '',
      includeInInvoice: true,
      applyToAllSkus: true,
      specificSkuIds: [],
      priority: rules.length + 1
    }])
  }

  const handleUpdateRule = (index: number, field: string, value: any) => {
    const updatedRules = [...rules]
    updatedRules[index] = { ...updatedRules[index], [field]: value }
    setRules(updatedRules)
  }

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.warehouseId) {
      toast.error('Please fill in all required fields')
      return
    }

    if (rules.length === 0) {
      toast.error('Please add at least one billing rule')
      return
    }

    // Validate rules
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      if (!rule.costName || !rule.unitOfMeasure) {
        toast.error(`Rule ${i + 1}: Cost name and unit of measure are required`)
        return
      }
      if (rule.calculationType === 'FIXED_RATE' && (!rule.rateValue || rule.rateValue <= 0)) {
        toast.error(`Rule ${i + 1}: Rate value must be greater than 0`)
        return
      }
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/invoice-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          rules
        })
      })

      if (response.ok) {
        toast.success('Invoice template created successfully')
        router.push('/config/invoice-templates')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create template')
      }
    } catch (error) {
      toast.error('Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Create Invoice Template"
          subtitle="Define billing rules for warehouse transactions"
          icon={FileText}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          textColor="text-blue-800"
          actions={
            <Link
              href="/config/invoice-templates"
              className="inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Link>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Template Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Standard FMC Billing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a warehouse</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Describe when this template should be used..."
                />
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Active</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Set as default for this warehouse</span>
                </label>
              </div>
            </div>
          </div>

          {/* Billing Rules */}
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Billing Rules</h3>
              <button
                type="button"
                onClick={handleAddRule}
                className="inline-flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Rule
              </button>
            </div>

            {rules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No billing rules defined. Click "Add Rule" to start.
              </div>
            ) : (
              <div className="space-y-4">
                {rules.map((rule, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium">Rule {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Transaction Type</label>
                        <select
                          value={rule.transactionType}
                          onChange={(e) => handleUpdateRule(index, 'transactionType', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                          {TRANSACTION_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Cost Category</label>
                        <select
                          value={rule.costCategory}
                          onChange={(e) => handleUpdateRule(index, 'costCategory', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                          {COST_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Cost Name *</label>
                        <input
                          type="text"
                          value={rule.costName || ''}
                          onChange={(e) => handleUpdateRule(index, 'costName', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="e.g., Container Unloading"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Calculation Type</label>
                        <select
                          value={rule.calculationType}
                          onChange={(e) => handleUpdateRule(index, 'calculationType', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        >
                          {CALCULATION_TYPES.map(type => (
                            <option key={type} value={type}>
                              {type.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      {rule.calculationType === 'FIXED_RATE' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Rate Value *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={rule.rateValue || ''}
                            onChange={(e) => handleUpdateRule(index, 'rateValue', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">Unit of Measure *</label>
                        <input
                          type="text"
                          value={rule.unitOfMeasure || ''}
                          onChange={(e) => handleUpdateRule(index, 'unitOfMeasure', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="e.g., container, carton, pallet"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Priority</label>
                        <input
                          type="number"
                          value={rule.priority || 0}
                          onChange={(e) => handleUpdateRule(index, 'priority', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          min="0"
                        />
                      </div>

                      <div className="flex items-center gap-4 md:col-span-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rule.includeInInvoice !== false}
                            onChange={(e) => handleUpdateRule(index, 'includeInInvoice', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">Include in invoice</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={rule.applyToAllSkus !== false}
                            onChange={(e) => handleUpdateRule(index, 'applyToAllSkus', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">Apply to all SKUs</span>
                        </label>
                      </div>
                    </div>

                    {rule.notes !== undefined && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <input
                          type="text"
                          value={rule.notes || ''}
                          onChange={(e) => handleUpdateRule(index, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="Additional notes about this rule..."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Link
              href="/config/invoice-templates"
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
                  Create Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}