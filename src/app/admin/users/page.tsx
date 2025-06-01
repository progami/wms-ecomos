import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, MoreVertical, Mail, Shield } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'system_admin') {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              Manage users and their permissions
            </p>
          </div>
          <Link
            href="/admin/users/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Link>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <UserCard
            name="System Administrator"
            email="admin@warehouse.com"
            role="system_admin"
            warehouse="All Warehouses"
            lastLogin="2 hours ago"
            isActive={true}
          />
          <UserCard
            name="Warehouse Staff"
            email="staff@warehouse.com"
            role="warehouse_staff"
            warehouse="FMC Warehouse"
            lastLogin="1 day ago"
            isActive={true}
          />
          <UserCard
            name="Finance Admin"
            email="finance@warehouse.com"
            role="finance_admin"
            warehouse="All Warehouses"
            lastLogin="3 hours ago"
            isActive={true}
          />
          <UserCard
            name="John Doe"
            email="john.doe@warehouse.com"
            role="manager"
            warehouse="Vglobal Warehouse"
            lastLogin="1 week ago"
            isActive={true}
          />
          <UserCard
            name="Jane Smith"
            email="jane.smith@warehouse.com"
            role="warehouse_staff"
            warehouse="FMC Warehouse"
            lastLogin="Never"
            isActive={false}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

interface UserCardProps {
  name: string
  email: string
  role: string
  warehouse: string
  lastLogin: string
  isActive: boolean
}

function UserCard({ name, email, role, warehouse, lastLogin, isActive }: UserCardProps) {
  const getRoleBadge = (role: string) => {
    const roleStyles: Record<string, string> = {
      system_admin: 'bg-purple-100 text-purple-800',
      finance_admin: 'bg-green-100 text-green-800',
      warehouse_staff: 'bg-blue-100 text-blue-800',
      manager: 'bg-orange-100 text-orange-800',
      viewer: 'bg-gray-100 text-gray-800',
    }
    
    const roleLabels: Record<string, string> = {
      system_admin: 'System Admin',
      finance_admin: 'Finance Admin',
      warehouse_staff: 'Warehouse Staff',
      manager: 'Manager',
      viewer: 'Viewer',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleStyles[role] || 'bg-gray-100 text-gray-800'}`}>
        {roleLabels[role] || role}
      </span>
    )
  }

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-lg font-medium text-gray-600">
                {name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">{name}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {email}
              </p>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Role</span>
              {getRoleBadge(role)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Warehouse</span>
              <span className="text-sm font-medium">{warehouse}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Last Login</span>
              <span className="text-sm">{lastLogin}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        
        <button className="ml-4 text-gray-400 hover:text-gray-600">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}