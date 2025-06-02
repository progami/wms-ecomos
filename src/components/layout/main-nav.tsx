'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Package2,
  Home,
  Package,
  FileText,
  DollarSign,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  BarChart3,
  Warehouse,
  Calculator,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navigation = {
  system_admin: [
    { name: 'Dashboard', href: '/admin/dashboard', icon: Home },
    // Admin Functions
    { name: 'Inventory', href: '/admin/inventory', icon: Package },
    { name: 'Calculations', href: '/admin/calculations', icon: Calculator },
    // Finance Functions
    { name: 'Finance', href: '/finance/dashboard', icon: DollarSign },
    { name: 'Invoices', href: '/finance/invoices', icon: FileText },
    { name: 'Cost Rates', href: '/admin/settings/rates', icon: DollarSign },
    { name: 'Reconciliation', href: '/finance/reconciliation', icon: Calculator },
    // Warehouse Functions
    { name: 'Warehouse Ops', href: '/warehouse/dashboard', icon: Warehouse },
    // Reports & Settings
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { name: 'SKUs', href: '/admin/settings/skus', icon: Package },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  finance_admin: [
    { name: 'Dashboard', href: '/finance/dashboard', icon: Home },
    { name: 'Invoices', href: '/finance/invoices', icon: FileText },
    { name: 'Reconciliation', href: '/finance/reconciliation', icon: DollarSign },
    { name: 'Reports', href: '/finance/reports', icon: BarChart3 },
    { name: 'Cost Rates', href: '/admin/settings/rates', icon: Settings },
  ],
  warehouse_staff: [
    { name: 'Dashboard', href: '/warehouse/dashboard', icon: Home },
    { name: 'Inventory', href: '/warehouse/inventory', icon: Package },
    { name: 'Receive', href: '/warehouse/receive', icon: Package2 },
    { name: 'Ship', href: '/warehouse/ship', icon: Package2 },
    { name: 'Reports', href: '/warehouse/reports', icon: FileText },
    { name: 'Settings', href: '/warehouse/settings', icon: Settings },
  ],
  manager: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Reports', href: '/reports', icon: FileText },
  ],
  viewer: [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Reports', href: '/reports', icon: FileText },
  ],
}

export function MainNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!session) return null

  const userNavigation = navigation[session.user.role] || navigation.viewer

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/" className="flex items-center gap-2">
              <Package2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">WMS</span>
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {userNavigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          pathname.startsWith(item.href)
                            ? 'bg-gray-100 text-primary dark:bg-gray-800'
                            : 'text-gray-700 hover:text-primary hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                        )}
                      >
                        <item.icon
                          className={cn(
                            pathname.startsWith(item.href)
                              ? 'text-primary'
                              : 'text-gray-400 group-hover:text-primary',
                            'h-6 w-6 shrink-0'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Signed in as</p>
                    <p className="text-sm font-medium">{session.user.name}</p>
                    <p className="text-xs text-gray-500">{session.user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/login' })}
                  className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-primary dark:text-gray-400 dark:hover:bg-gray-800 w-full"
                >
                  <LogOut className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-primary" />
                  Sign out
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white dark:bg-gray-900 px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-400 lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900 dark:text-white">
          Dashboard
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-900/80"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X className="h-6 w-6 text-white" aria-hidden="true" />
                </button>
              </div>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-900 px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                  <Link href="/" className="flex items-center gap-2">
                    <Package2 className="h-8 w-8 text-primary" />
                    <span className="text-xl font-bold">WMS</span>
                  </Link>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {userNavigation.map((item) => (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              className={cn(
                                pathname.startsWith(item.href)
                                  ? 'bg-gray-100 text-primary dark:bg-gray-800'
                                  : 'text-gray-700 hover:text-primary hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800',
                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                              )}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <item.icon
                                className={cn(
                                  pathname.startsWith(item.href)
                                    ? 'text-primary'
                                    : 'text-gray-400 group-hover:text-primary',
                                  'h-6 w-6 shrink-0'
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}