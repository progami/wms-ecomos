import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Package2, TrendingUp, DollarSign, AlertCircle } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name}
          </p>
        </div>

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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <p className="text-muted-foreground">
            Transaction history will appear here
          </p>
        </div>
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Storage Utilization</h3>
          <p className="text-muted-foreground">
            Warehouse capacity chart will appear here
          </p>
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