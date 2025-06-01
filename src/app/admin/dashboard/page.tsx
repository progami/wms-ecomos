import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  Package2, 
  TrendingUp, 
  DollarSign, 
  AlertCircle,
  Package,
  FileText,
  Users,
  Warehouse,
  BarChart3,
  Settings,
  ArrowRight
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'system_admin') {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name}
          </p>
        </div>

        {/* Stats Cards */}
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
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <QuickActionCard
              title="Inventory Management"
              description="View and manage inventory across all warehouses"
              icon={Package}
              href="/admin/inventory"
              color="bg-blue-500"
            />
            <QuickActionCard
              title="Invoice Management"
              description="Process and reconcile 3PL invoices"
              icon={FileText}
              href="/admin/invoices"
              color="bg-green-500"
            />
            <QuickActionCard
              title="User Management"
              description="Manage users and permissions"
              icon={Users}
              href="/admin/users"
              color="bg-purple-500"
            />
            <QuickActionCard
              title="Warehouse Settings"
              description="Configure warehouses and SKUs"
              icon={Warehouse}
              href="/admin/settings/warehouses"
              color="bg-orange-500"
            />
            <QuickActionCard
              title="Reports & Analytics"
              description="View detailed reports and analytics"
              icon={BarChart3}
              href="/admin/reports"
              color="bg-indigo-500"
            />
            <QuickActionCard
              title="System Settings"
              description="Configure system settings and rates"
              icon={Settings}
              href="/admin/settings"
              color="bg-gray-500"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No recent transactions. Start by adding inventory movements.
              </p>
              <Link 
                href="/admin/inventory" 
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                Go to Inventory <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">System Status</h3>
            <div className="space-y-2">
              <StatusItem label="Database" status="Connected" />
              <StatusItem label="Background Jobs" status="Not configured" />
              <StatusItem label="Last Sync" status="Never" />
              <StatusItem label="Version" status="0.1.0" />
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

interface QuickActionCardProps {
  title: string
  description: string
  icon: React.ElementType
  href: string
  color: string
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  color,
}: QuickActionCardProps) {
  return (
    <Link href={href} className="block">
      <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-start space-x-4">
          <div className={`${color} p-3 rounded-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Link>
  )
}

interface StatusItemProps {
  label: string
  status: string
}

function StatusItem({ label, status }: StatusItemProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{status}</span>
    </div>
  )
}