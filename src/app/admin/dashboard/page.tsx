'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  ArrowRight,
  Upload,
  Download,
  Database,
  Bell
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { toast } from 'react-hot-toast'

interface DashboardStats {
  totalInventory: number
  inventoryChange: string
  inventoryTrend: 'up' | 'down' | 'neutral'
  storageCost: string
  costChange: string
  costTrend: 'up' | 'down' | 'neutral'
  activeSkus: number
  pendingInvoices: number
  overdueInvoices: number
}

interface SystemInfo {
  totalUsers: number
  totalTransactions: number
  dbSize: number
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    // Always try to fetch stats when component mounts
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      console.log('Fetching dashboard stats...')
      const response = await fetch('/api/admin/dashboard')
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Dashboard data received:', data)
        setStats(data.stats)
        setSystemInfo(data.systemInfo)
      } else {
        const errorText = await response.text()
        console.error('Dashboard API error - Status:', response.status)
        console.error('Dashboard API error - Text:', errorText)
        
        try {
          const errorData = JSON.parse(errorText)
          console.error('Dashboard API error - Parsed:', errorData)
          toast.error(errorData.details || errorData.error || 'Failed to load dashboard stats')
        } catch {
          toast.error(`API Error (${response.status}): ${errorText}`)
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load dashboard stats')
    } finally {
      setLoadingStats(false)
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  // Check if user has admin access
  if (!session || session.user.role !== 'admin') {
    router.push('/dashboard')
    return null
  }

  const handleImportData = async () => {
    setLoading('import')
    try {
      router.push('/admin/import')
    } finally {
      setLoading(null)
    }
  }

  const handleExportData = async () => {
    setLoading('export')
    try {
      const response = await fetch('/api/export?type=all', {
        method: 'GET',
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `warehouse-backup-${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Data exported successfully!')
      } else {
        toast.error('Failed to export data')
      }
    } catch (error) {
      toast.error('Export failed')
    } finally {
      setLoading(null)
    }
  }


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || 'Admin'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loadingStats ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-40"></div>
                </div>
              ))}
            </>
          ) : stats ? (
            <>
              <DashboardCard
                title="Total Inventory"
                value={stats.totalInventory.toLocaleString()}
                description="Cartons across all warehouses"
                icon={Package2}
                trend={`${stats.inventoryTrend === 'up' ? '+' : ''}${stats.inventoryChange}% from last month`}
                trendUp={stats.inventoryTrend === 'up' ? true : stats.inventoryTrend === 'down' ? false : null}
              />
              <DashboardCard
                title="Storage Cost"
                value={`£${parseFloat(stats.storageCost).toLocaleString()}`}
                description="Current month estimate"
                icon={DollarSign}
                trend={`${stats.costTrend === 'up' ? '+' : ''}${stats.costChange}% from last month`}
                trendUp={stats.costTrend === 'up' ? true : stats.costTrend === 'down' ? false : null}
              />
              <DashboardCard
                title="Active SKUs"
                value={stats.activeSkus.toString()}
                description="Products in stock"
                icon={TrendingUp}
                trend="Products with inventory"
                trendUp={null}
              />
              <DashboardCard
                title="Pending Invoices"
                value={stats.pendingInvoices.toString()}
                description="Awaiting reconciliation"
                icon={AlertCircle}
                trend={stats.overdueInvoices > 0 ? `${stats.overdueInvoices} overdue` : 'All current'}
                trendUp={stats.overdueInvoices === 0}
              />
            </>
          ) : (
            <>
              <DashboardCard
                title="Total Inventory"
                value="--"
                description="Cartons across all warehouses"
                icon={Package2}
                trend="No data"
                trendUp={null}
              />
              <DashboardCard
                title="Storage Cost"
                value="--"
                description="Current month estimate"
                icon={DollarSign}
                trend="No data"
                trendUp={null}
              />
              <DashboardCard
                title="Active SKUs"
                value="--"
                description="Products in stock"
                icon={TrendingUp}
                trend="No data"
                trendUp={null}
              />
              <DashboardCard
                title="Pending Invoices"
                value="--"
                description="Awaiting reconciliation"
                icon={AlertCircle}
                trend="No data"
                trendUp={null}
              />
            </>
          )}
        </div>

        {/* System Actions */}
        <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold mb-4">System Actions</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <SystemAction
              title="Import Data"
              description="Bulk import from Excel"
              icon={Upload}
              onClick={handleImportData}
              loading={loading === 'import'}
            />
            <SystemAction
              title="Export All Data"
              description="Download complete backup"
              icon={Download}
              onClick={handleExportData}
              loading={loading === 'export'}
            />
          </div>
        </div>

        {/* Quick Navigation */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Navigation</h2>
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
              title="Reports & Analytics"
              description="View detailed reports and analytics"
              icon={BarChart3}
              href="/admin/reports"
              color="bg-indigo-500"
            />
            <QuickActionCard
              title="Warehouse Settings"
              description="Configure warehouses and SKUs"
              icon={Warehouse}
              href="/admin/settings/warehouses"
              color="bg-orange-500"
            />
            <QuickActionCard
              title="User Management"
              description="Manage users and permissions"
              icon={Users}
              href="/admin/users"
              color="bg-purple-500"
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

        {/* System Status and Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">System Status</h3>
            <div className="space-y-2">
              <StatusItem label="Database" status="Connected" indicator="success" />
              <StatusItem label="Background Jobs" status="Not configured" indicator="warning" />
              <StatusItem label="Last Backup" status="Never" indicator="warning" />
              <StatusItem label="Email Service" status="Active" indicator="success" />
              <StatusItem label="Version" status="0.1.0" />
            </div>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">System Information</h3>
            <div className="space-y-2">
              <InfoItem label="Environment" value={process.env.NODE_ENV === 'production' ? 'Production' : 'Development'} />
              <InfoItem label="Database" value="PostgreSQL" />
              <InfoItem label="Active Users" value={systemInfo?.totalUsers.toString() || '--'} />
              <InfoItem label="Total Transactions" value={systemInfo?.totalTransactions.toLocaleString() || '--'} />
              <InfoItem label="Storage Used" value={systemInfo ? `${systemInfo.dbSize} MB` : '--'} />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
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

interface SystemActionProps {
  title: string
  description: string
  icon: React.ElementType
  onClick: () => void
  loading?: boolean
  danger?: boolean
}

function SystemAction({ title, description, icon: Icon, onClick, loading, danger }: SystemActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`p-4 border rounded-lg transition-all text-left relative overflow-hidden ${
        danger 
          ? 'hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
          : 'hover:shadow-md'
      } ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'
        }`}>
          <Icon className={`h-5 w-5 ${
            danger ? 'text-red-600' : 'text-gray-600'
          }`} />
        </div>
        <div className="flex-1">
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
    </button>
  )
}

interface StatusItemProps {
  label: string
  status: string
  indicator?: 'success' | 'warning' | 'error'
}

function StatusItem({ label, status, indicator }: StatusItemProps) {
  const getIndicatorColor = () => {
    switch (indicator) {
      case 'success': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return null
    }
  }

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {indicator && (
          <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`} />
        )}
        <span className="text-sm font-medium">{status}</span>
      </div>
    </div>
  )
}

interface InfoItemProps {
  label: string
  value: string
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}