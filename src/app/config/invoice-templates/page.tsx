'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { FileText, Plus, Edit2, Copy, Trash2, Check, X, Package2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { InvoiceTemplate } from '@/types/invoice-templates'

export default function InvoiceTemplatesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [warehouses, setWarehouses] = useState<any[]>([])

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
    fetchTemplates()
    fetchWarehouses()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/invoice-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

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

  const handleToggleActive = async (templateId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/invoice-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        toast.success(`Template ${!isActive ? 'activated' : 'deactivated'}`)
        fetchTemplates()
      } else {
        toast.error('Failed to update template')
      }
    } catch (error) {
      toast.error('Failed to update template')
    }
  }

  const handleSetDefault = async (templateId: string, warehouseId: string) => {
    try {
      const response = await fetch(`/api/invoice-templates/${templateId}/set-default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseId })
      })

      if (response.ok) {
        toast.success('Default template updated')
        fetchTemplates()
      } else {
        toast.error('Failed to set default template')
      }
    } catch (error) {
      toast.error('Failed to set default template')
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/invoice-templates/${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Template deleted')
        fetchTemplates()
      } else {
        toast.error('Failed to delete template')
      }
    } catch (error) {
      toast.error('Failed to delete template')
    }
  }

  const handleDuplicate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/invoice-templates/${templateId}/duplicate`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Template duplicated')
        fetchTemplates()
      } else {
        toast.error('Failed to duplicate template')
      }
    } catch (error) {
      toast.error('Failed to duplicate template')
    }
  }

  // Group templates by warehouse
  const templatesByWarehouse = warehouses.map(warehouse => ({
    warehouse,
    templates: templates.filter(t => t.warehouseId === warehouse.id)
  }))

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Invoice Templates"
          subtitle="Configure warehouse-specific billing rules"
          description="Define how different transaction types are billed for each warehouse. Templates determine which charges apply to invoices."
          icon={FileText}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          textColor="text-blue-800"
          actions={
            <Link
              href="/config/invoice-templates/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Link>
          }
        />

        {templatesByWarehouse.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No warehouses configured"
            description="Add warehouses before creating invoice templates."
          />
        ) : (
          <div className="space-y-8">
            {templatesByWarehouse.map(({ warehouse, templates }) => (
              <div key={warehouse.id} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{warehouse.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {templates.length} template{templates.length !== 1 ? 's' : ''} configured
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Code: {warehouse.code}</span>
                    </div>
                  </div>
                </div>

                {templates.length === 0 ? (
                  <div className="p-12 text-center">
                    <Package2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 mb-4">No templates for this warehouse</p>
                    <Link
                      href={`/config/invoice-templates/new?warehouseId=${warehouse.id}`}
                      className="inline-flex items-center px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create Template
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y">
                    {templates.map(template => (
                      <div key={template.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-medium">{template.name}</h4>
                              {template.isDefault && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Default
                                </span>
                              )}
                              {!template.isActive && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            )}
                            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                              <span>{template.rules.length} billing rules</span>
                              <span>•</span>
                              <span>Created by {template.createdBy.fullName}</span>
                              <span>•</span>
                              <span>
                                Last updated {new Date(template.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {!template.isDefault && template.isActive && (
                              <button
                                onClick={() => handleSetDefault(template.id, warehouse.id)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Set as default"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleActive(template.id, template.isActive)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                              title={template.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {template.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </button>
                            <Link
                              href={`/config/invoice-templates/${template.id}/edit`}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit template"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDuplicate(template.id)}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                              title="Duplicate template"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            {!template.isDefault && (
                              <button
                                onClick={() => handleDelete(template.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete template"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Preview of rules */}
                        <div className="mt-4 border-t pt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Billing Rules Preview:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {template.rules.slice(0, 8).map((rule, idx) => (
                              <div key={idx} className="text-xs bg-gray-50 rounded px-2 py-1">
                                <span className="font-medium">{rule.transactionType}</span>
                                {' → '}
                                <span className="text-gray-600">{rule.costName}</span>
                              </div>
                            ))}
                            {template.rules.length > 8 && (
                              <div className="text-xs text-gray-500 px-2 py-1">
                                +{template.rules.length - 8} more...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}