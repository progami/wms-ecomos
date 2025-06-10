import { DashboardLayout } from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { 
  Package, 
  Package2, 
  BookOpen, 
  Upload, 
  AlertTriangle, 
  TrendingUp,
  ArrowRight
} from 'lucide-react'

const operationsModules = [
  {
    title: 'Shipment Planning',
    description: 'Plan and optimize shipments',
    href: '/operations/shipment-planning',
    icon: TrendingUp,
    color: 'bg-purple-100 text-purple-700'
  },
  {
    title: 'Inventory Ledger',
    description: 'View all inventory transactions',
    href: '/operations/inventory',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-700'
  },
  {
    title: 'Receive Goods',
    description: 'Record incoming inventory',
    href: '/operations/receive',
    icon: Package,
    color: 'bg-green-100 text-green-700'
  },
  {
    title: 'Ship Goods',
    description: 'Process outbound shipments',
    href: '/operations/ship',
    icon: Package2,
    color: 'bg-red-100 text-red-700'
  },
  {
    title: 'Import Attributes',
    description: 'Bulk import transaction attributes',
    href: '/operations/import-attributes',
    icon: Upload,
    color: 'bg-indigo-100 text-indigo-700'
  },
  {
    title: 'Pallet Variance',
    description: 'Track and resolve pallet discrepancies',
    href: '/operations/pallet-variance',
    icon: AlertTriangle,
    color: 'bg-amber-100 text-amber-700'
  }
]

export default function OperationsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Operations</h1>
          <p className="text-muted-foreground">
            Manage warehouse operations and inventory movements
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {operationsModules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group relative rounded-lg border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className={`inline-flex p-2 rounded-lg ${module.color}`}>
                    <module.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-lg">{module.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        <div className="border rounded-lg p-6 bg-blue-50">
          <h3 className="font-semibold mb-2">Quick Tips</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            <li>• Use <strong>Receive Goods</strong> to record incoming shipments</li>
            <li>• Use <strong>Ship Goods</strong> to process customer orders</li>
            <li>• Check <strong>Inventory Ledger</strong> for transaction history</li>
            <li>• Review <strong>Pallet Variance</strong> to ensure data accuracy</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  )
}