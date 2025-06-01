import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Settings, User, Bell, Shield, Package2, Printer } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { prisma } from '@/lib/prisma'

export default async function WarehouseSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Get the user's details
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { warehouse: true },
  })

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your preferences and configurations
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Settings */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Profile Information</h3>
                <p className="text-sm text-gray-600">Update your personal details</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue={user.fullName}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={user.email}
                  className="w-full px-3 py-2 border rounded-md bg-gray-50"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse
                </label>
                <input
                  type="text"
                  defaultValue={user.warehouse?.name || 'Not assigned'}
                  className="w-full px-3 py-2 border rounded-md bg-gray-50"
                  disabled
                />
              </div>
              <button className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                Update Profile
              </button>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bell className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Notifications</h3>
                <p className="text-sm text-gray-600">Configure how you receive alerts</p>
              </div>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div>
                  <p className="font-medium">Low Stock Alerts</p>
                  <p className="text-sm text-gray-600">Get notified when inventory is low</p>
                </div>
                <input type="checkbox" className="h-5 w-5 text-primary" defaultChecked />
              </label>
              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div>
                  <p className="font-medium">Daily Summary</p>
                  <p className="text-sm text-gray-600">Receive daily activity reports</p>
                </div>
                <input type="checkbox" className="h-5 w-5 text-primary" defaultChecked />
              </label>
              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <div>
                  <p className="font-medium">Transaction Updates</p>
                  <p className="text-sm text-gray-600">Real-time inventory movements</p>
                </div>
                <input type="checkbox" className="h-5 w-5 text-primary" />
              </label>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Security</h3>
                <p className="text-sm text-gray-600">Manage your account security</p>
              </div>
            </div>
            <div className="space-y-4">
              <button className="w-full px-4 py-2 border rounded-md hover:bg-gray-50 text-left">
                Change Password
              </button>
              <button className="w-full px-4 py-2 border rounded-md hover:bg-gray-50 text-left">
                Enable Two-Factor Authentication
              </button>
              <button className="w-full px-4 py-2 border rounded-md hover:bg-gray-50 text-left">
                View Login History
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Preferences</h3>
                <p className="text-sm text-gray-600">Customize your experience</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default View
                </label>
                <select className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Dashboard</option>
                  <option>Inventory</option>
                  <option>Recent Transactions</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Format
                </label>
                <select className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>MM/DD/YYYY</option>
                  <option>DD/MM/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Items per Page
                </label>
                <select className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Scanner Settings */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Package2 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Scanner Configuration</h3>
              <p className="text-sm text-gray-600">Configure barcode scanner settings</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <button className="px-4 py-3 bg-white border rounded-md hover:shadow-md transition-shadow">
              <Printer className="h-5 w-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium">Configure Scanner</p>
            </button>
            <button className="px-4 py-3 bg-white border rounded-md hover:shadow-md transition-shadow">
              <Package2 className="h-5 w-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium">Test Scanner</p>
            </button>
            <button className="px-4 py-3 bg-white border rounded-md hover:shadow-md transition-shadow">
              <Settings className="h-5 w-5 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium">Scan Settings</p>
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}