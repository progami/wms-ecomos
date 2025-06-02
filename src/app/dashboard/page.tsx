import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { 
  Package2, 
  TrendingUp, 
  DollarSign, 
  AlertCircle,
  ArrowRight,
  FileText,
  BarChart3,
  Settings,
  Users,
  Warehouse,
  Calculator
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { QuickStartGuide } from '@/components/ui/quick-start-guide'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header with Description */}
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome back, ${session.user.name}`}
          description="Monitor your warehouse operations at a glance. Track inventory levels, storage costs, active SKUs, and pending invoices. Use the navigation menu to access detailed reports and management tools."
          icon={Package2}
        />

        {/* Quick Start Guide */}
        <QuickStartGuide userRole={session.user.role} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Inventory"
            value="1,234"
            description="Cartons across all warehouses"
            icon={Package2}
            trend="+12% from last month"
            trendUp={true}
          />
          <DashboardCard
            title="Storage Cost"
            value="$5,432"
            description="Current month estimate"
            icon={DollarSign}
            trend="+8% from last month"
            trendUp={true}
          />
          <DashboardCard
            title="Active SKUs"
            value="45"
            description="Products in stock"
            icon={TrendingUp}
            trend="No change"
            trendUp={null}
          />
          <DashboardCard
            title="Pending Invoices"
            value="3"
            description="Awaiting reconciliation"
            icon={AlertCircle}
            trend="2 overdue"
            trendUp={false}
          />
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getQuickActions(session.user.role).map((action: any, index: number) => (
              <Link
                key={index}
                href={action.href}
                className="border rounded-lg p-6 hover:border-primary hover:shadow-md transition-all group bg-white"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform`}>
                        <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                      </div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your recent receiving and shipping activities
              </p>
              <div className="border-t pt-4">
                <p className="text-center text-gray-500 py-8">
                  <Package2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  No recent transactions
                </p>
              </div>
            </div>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Storage Utilization</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Current warehouse capacity and usage
              </p>
              <div className="border-t pt-4">
                <p className="text-center text-gray-500 py-8">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  Utilization data coming soon
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

interface DashboardCardProps {
  title: string
  value: string
  description: string
  icon: React.ElementType
  trend: string
  trendUp: boolean | null
}

function DashboardCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp,
}: DashboardCardProps) {
  return (
    <div className="border rounded-lg p-6 card-hover">
      <div className="flex items-center justify-between space-x-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h2 className="text-2xl font-bold mt-1">{value}</h2>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
          <p
            className={`text-xs mt-2 ${
              trendUp === true
                ? 'text-green-600'
                : trendUp === false
                ? 'text-red-600'
                : 'text-muted-foreground'
            }`}
          >
            {trend}
          </p>
        </div>
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    </div>
  )
}

function getQuickActions(role: string) {
  const allActions = {
    inventory: {
      title: 'Manage Inventory',
      description: 'View and update inventory levels',
      href: '/warehouse/inventory',
      icon: Package2,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    receive: {
      title: 'Receive Shipments',
      description: 'Process incoming inventory',
      href: '/warehouse/receive',
      icon: Package2,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    ship: {
      title: 'Ship Orders',
      description: 'Process outbound shipments',
      href: '/warehouse/ship',
      icon: Package2,
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    invoices: {
      title: 'Process Invoices',
      description: 'Upload and reconcile invoices',
      href: '/finance/invoices',
      icon: FileText,
      bgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    },
    rates: {
      title: 'Cost Rates',
      description: 'Manage warehouse rates',
      href: '/admin/settings/rates',
      icon: DollarSign,
      bgColor: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    reconciliation: {
      title: 'Reconciliation',
      description: 'Compare calculations with invoices',
      href: '/finance/reconciliation',
      icon: Calculator,
      bgColor: 'bg-indigo-100',
      iconColor: 'text-indigo-600'
    },
    reports: {
      title: 'Generate Reports',
      description: 'Create custom reports',
      href: '/reports',
      icon: BarChart3,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    settings: {
      title: 'System Settings',
      description: 'Configure system parameters',
      href: '/admin/settings',
      icon: Settings,
      bgColor: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    users: {
      title: 'Manage Users',
      description: 'User accounts and permissions',
      href: '/admin/users',
      icon: Users,
      bgColor: 'bg-pink-100',
      iconColor: 'text-pink-600'
    }
  }

  const roleActions: Record<string, string[]> = {
    admin: ['inventory', 'invoices', 'rates', 'reports', 'settings', 'users'],
    staff: ['inventory', 'receive', 'ship', 'invoices', 'rates', 'reconciliation', 'reports']
  }

  const actions = roleActions[role] || roleActions.staff
  return actions.map(key => allActions[key as keyof typeof allActions]).filter(Boolean)
}