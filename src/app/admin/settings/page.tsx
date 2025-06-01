import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  Building2, 
  Package, 
  DollarSign, 
  Users, 
  Settings as SettingsIcon,
  Database,
  Bell,
  Shield,
  ArrowRight
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'system_admin') {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and master data
          </p>
        </div>

        {/* Settings Categories */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Master Data */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Master Data</h2>
            <div className="space-y-3">
              <SettingCard
                title="Warehouses"
                description="Manage warehouse locations and configurations"
                icon={Building2}
                href="/admin/settings/warehouses"
              />
              <SettingCard
                title="SKU Master"
                description="Product definitions and specifications"
                icon={Package}
                href="/admin/settings/skus"
              />
              <SettingCard
                title="Cost Rates"
                description="3PL pricing and rate structures"
                icon={DollarSign}
                href="/admin/settings/rates"
              />
              <SettingCard
                title="User Management"
                description="User accounts and permissions"
                icon={Users}
                href="/admin/users"
              />
            </div>
          </div>

          {/* System Configuration */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">System Configuration</h2>
            <div className="space-y-3">
              <SettingCard
                title="General Settings"
                description="Company info, timezone, and defaults"
                icon={SettingsIcon}
                href="/admin/settings/general"
              />
              <SettingCard
                title="Notifications"
                description="Email alerts and notification preferences"
                icon={Bell}
                href="/admin/settings/notifications"
              />
              <SettingCard
                title="Security"
                description="Password policies and access controls"
                icon={Shield}
                href="/admin/settings/security"
              />
              <SettingCard
                title="Database"
                description="Backup, restore, and maintenance"
                icon={Database}
                href="/admin/settings/database"
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <QuickAction
              title="Import Data"
              description="Bulk import from Excel"
              onClick={() => {}}
            />
            <QuickAction
              title="Export All Data"
              description="Download complete backup"
              onClick={() => {}}
            />
            <QuickAction
              title="Clear Demo Data"
              description="Remove all test data"
              onClick={() => {}}
            />
          </div>
        </div>

        {/* System Info */}
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">System Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem label="Version" value="0.1.0" />
            <InfoItem label="Database" value="PostgreSQL 15.4" />
            <InfoItem label="Environment" value="Development" />
            <InfoItem label="Last Backup" value="Never" />
            <InfoItem label="Active Users" value="3" />
            <InfoItem label="Total Transactions" value="208" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

interface SettingCardProps {
  title: string
  description: string
  icon: React.ElementType
  href: string
}

function SettingCard({ title, description, icon: Icon, href }: SettingCardProps) {
  return (
    <Link href={href} className="block">
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Link>
  )
}

interface QuickActionProps {
  title: string
  description: string
  onClick: () => void
}

function QuickAction({ title, description, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 border rounded-lg hover:shadow-md transition-shadow text-left"
    >
      <h4 className="font-medium">{title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </button>
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