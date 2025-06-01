'use client'

import { useState } from 'react'
import { Calculator, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function FinanceReconciliationPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2024-01')

  const reconciliationData = [
    {
      warehouse: 'FMC',
      invoiceAmount: 12345.67,
      expectedAmount: 12300.00,
      difference: 45.67,
      status: 'pending',
      items: [
        { type: 'Storage', expected: 5000, invoiced: 5000, match: true },
        { type: 'Handling', expected: 3000, invoiced: 3045.67, match: false },
        { type: 'Transport', expected: 4300, invoiced: 4300, match: true },
      ]
    },
    {
      warehouse: 'Vglobal',
      invoiceAmount: 8765.43,
      expectedAmount: 8765.43,
      difference: 0,
      status: 'matched',
      items: [
        { type: 'Storage', expected: 4000, invoiced: 4000, match: true },
        { type: 'Handling', expected: 2765.43, invoiced: 2765.43, match: true },
        { type: 'Transport', expected: 2000, invoiced: 2000, match: true },
      ]
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoice Reconciliation</h1>
            <p className="text-muted-foreground">
              Compare expected vs actual charges
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="2024-01">Jan 16 - Feb 15, 2024</option>
              <option value="2023-12">Dec 16 - Jan 15, 2024</option>
              <option value="2023-11">Nov 16 - Dec 15, 2023</option>
            </select>
            <button className="action-button">
              <Calculator className="h-4 w-4 mr-2" />
              Run Reconciliation
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="dashboard-card">
            <p className="text-sm text-muted-foreground">Total Invoiced</p>
            <p className="text-2xl font-bold">$21,111.10</p>
          </div>
          <div className="dashboard-card">
            <p className="text-sm text-muted-foreground">Total Expected</p>
            <p className="text-2xl font-bold">$21,065.43</p>
          </div>
          <div className="dashboard-card">
            <p className="text-sm text-muted-foreground">Variance</p>
            <p className="text-2xl font-bold text-amber-600">$45.67</p>
          </div>
          <div className="dashboard-card">
            <p className="text-sm text-muted-foreground">Match Rate</p>
            <p className="text-2xl font-bold text-green-600">98.5%</p>
          </div>
        </div>

        {/* Reconciliation Details */}
        <div className="space-y-4">
          {reconciliationData.map((recon, idx) => (
            <div key={idx} className="border rounded-lg overflow-hidden">
              <div className={`px-6 py-4 ${
                recon.status === 'matched' ? 'bg-green-50' : 'bg-amber-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {recon.status === 'matched' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                    )}
                    <h3 className="text-lg font-semibold">{recon.warehouse}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Difference</p>
                    <p className={`text-lg font-bold ${
                      recon.difference === 0 ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      ${recon.difference.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pb-2">Cost Category</th>
                      <th className="pb-2 text-right">Expected</th>
                      <th className="pb-2 text-right">Invoiced</th>
                      <th className="pb-2 text-right">Difference</th>
                      <th className="pb-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recon.items.map((item, itemIdx) => (
                      <tr key={itemIdx}>
                        <td className="py-2">{item.type}</td>
                        <td className="py-2 text-right">${item.expected.toFixed(2)}</td>
                        <td className="py-2 text-right">${item.invoiced.toFixed(2)}</td>
                        <td className="py-2 text-right">
                          ${(item.invoiced - item.expected).toFixed(2)}
                        </td>
                        <td className="py-2 text-center">
                          {item.match ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t">
                    <tr className="font-semibold">
                      <td className="pt-2">Total</td>
                      <td className="pt-2 text-right">${recon.expectedAmount.toFixed(2)}</td>
                      <td className="pt-2 text-right">${recon.invoiceAmount.toFixed(2)}</td>
                      <td className="pt-2 text-right">${recon.difference.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                
                {recon.difference !== 0 && (
                  <div className="mt-4 flex gap-2">
                    <button className="secondary-button">
                      Add Note
                    </button>
                    <button className="action-button">
                      Create Dispute
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}