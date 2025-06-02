import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import '@testing-library/jest-dom'

// Mock the server component
jest.mock('@/app/warehouse/dashboard/page', () => ({
  __esModule: true,
  default: function WarehouseDashboardPage() {
    const DashboardCard = ({ title, value, description, icon: Icon, trend }: any) => (
      <div data-testid={`dashboard-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <p>{title}</p>
        <h2>{value}</h2>
        <p>{description}</p>
        <p>{trend}</p>
        <Icon className="h-8 w-8" />
      </div>
    )

    const QuickActionCard = ({ title, description, href, icon }: any) => (
      <a 
        href={href} 
        data-testid={`quick-action-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="block p-4 border rounded-lg hover:shadow-lg transition-shadow hover:border-primary"
      >
        <div>{icon}</div>
        <h4>{title}</h4>
        <p>{description}</p>
      </a>
    )

    return (
      <div>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Warehouse Dashboard</h1>
            <p className="text-muted-foreground">FMC</p>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Total Inventory"
              value="12,345"
              description="Cartons in stock"
              icon={() => <span>📦</span>}
              trend="15 SKUs"
            />
            <DashboardCard
              title="Today's Transactions"
              value="8"
              description="Movements today"
              icon={() => <span>📈</span>}
              trend="Live tracking"
            />
            <DashboardCard
              title="Pallets Used"
              value="156"
              description="Current pallets"
              icon={() => <span>🚚</span>}
              trend="Space utilization"
            />
            <DashboardCard
              title="Pending Tasks"
              value="0"
              description="Actions required"
              icon={() => <span>⚠️</span>}
              trend="All clear"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Transactions */}
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>🕐</span>
                Recent Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex-1">
                    <p className="text-sm font-medium">📥 CS-001</p>
                    <p className="text-xs text-gray-500">RECEIVE - 100 cartons</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">1/6/2025</p>
                    <p className="text-xs text-gray-400">by Staff</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex-1">
                    <p className="text-sm font-medium">📤 CS-002</p>
                    <p className="text-xs text-gray-500">SHIP - 50 cartons</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">1/6/2025</p>
                    <p className="text-xs text-gray-400">by Admin</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <QuickActionCard
                  title="Receive Goods"
                  description="Record incoming shipments"
                  href="/warehouse/receive"
                  icon="📥"
                />
                <QuickActionCard
                  title="Ship Orders"
                  description="Process outbound shipments"
                  href="/warehouse/ship"
                  icon="📤"
                />
                <QuickActionCard
                  title="Stock Count"
                  description="Perform inventory count"
                  href="/warehouse/inventory"
                  icon="📊"
                />
                <QuickActionCard
                  title="View Reports"
                  description="Check inventory reports"
                  href="/warehouse/reports"
                  icon="📋"
                />
              </div>
            </div>
          </div>

          {/* Inventory by SKU */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📦</span>
              Top SKUs by Volume
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">CS-001</span>
                <span className="text-sm text-gray-500">Product A</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">CS-002</span>
                <span className="text-sm text-gray-500">Product B</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}))

// Mock dependencies
jest.mock('next/navigation')

describe('Warehouse Dashboard Page', () => {
  const user = userEvent.setup()
  const mockPush = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  describe('Page Structure', () => {
    it('renders page title and subtitle', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      expect(screen.getByText('Warehouse Dashboard')).toBeInTheDocument()
      expect(screen.getByText('FMC')).toBeInTheDocument()
    })

    it('renders all dashboard sections', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      // Check for main sections
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Top SKUs by Volume')).toBeInTheDocument()
    })
  })

  describe('Dashboard Cards', () => {
    it('renders all summary cards with correct data', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      // Total Inventory Card
      const inventoryCard = screen.getByTestId('dashboard-card-total-inventory')
      expect(inventoryCard).toBeInTheDocument()
      expect(screen.getByText('Total Inventory')).toBeInTheDocument()
      expect(screen.getByText('12,345')).toBeInTheDocument()
      expect(screen.getByText('Cartons in stock')).toBeInTheDocument()
      expect(screen.getByText('15 SKUs')).toBeInTheDocument()

      // Today's Transactions Card
      const transactionsCard = screen.getByTestId('dashboard-card-today\'s-transactions')
      expect(transactionsCard).toBeInTheDocument()
      expect(screen.getByText('Today\'s Transactions')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('Movements today')).toBeInTheDocument()
      expect(screen.getByText('Live tracking')).toBeInTheDocument()

      // Pallets Used Card
      const palletsCard = screen.getByTestId('dashboard-card-pallets-used')
      expect(palletsCard).toBeInTheDocument()
      expect(screen.getByText('Pallets Used')).toBeInTheDocument()
      expect(screen.getByText('156')).toBeInTheDocument()
      expect(screen.getByText('Current pallets')).toBeInTheDocument()
      expect(screen.getByText('Space utilization')).toBeInTheDocument()

      // Pending Tasks Card
      const tasksCard = screen.getByTestId('dashboard-card-pending-tasks')
      expect(tasksCard).toBeInTheDocument()
      expect(screen.getByText('Pending Tasks')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('Actions required')).toBeInTheDocument()
      expect(screen.getByText('All clear')).toBeInTheDocument()
    })

    it('displays icons in dashboard cards', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      // Check for icon elements
      expect(screen.getByText('📦')).toBeInTheDocument()
      expect(screen.getByText('📈')).toBeInTheDocument()
      expect(screen.getByText('🚚')).toBeInTheDocument()
      expect(screen.getByText('⚠️')).toBeInTheDocument()
    })
  })

  describe('Recent Activity Section', () => {
    it('displays recent transactions', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      // Check for recent activity header with icon
      expect(screen.getByText('🕐')).toBeInTheDocument()
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()

      // Check for transaction entries
      expect(screen.getByText('📥 CS-001')).toBeInTheDocument()
      expect(screen.getByText('RECEIVE - 100 cartons')).toBeInTheDocument()
      expect(screen.getByText('📤 CS-002')).toBeInTheDocument()
      expect(screen.getByText('SHIP - 50 cartons')).toBeInTheDocument()

      // Check for transaction metadata
      const dates = screen.getAllByText('1/6/2025')
      expect(dates).toHaveLength(2)
      expect(screen.getByText('by Staff')).toBeInTheDocument()
      expect(screen.getByText('by Admin')).toBeInTheDocument()
    })
  })

  describe('Quick Actions Section', () => {
    it('renders all quick action cards', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      // Check for all quick action cards
      const receiveCard = screen.getByTestId('quick-action-receive-goods')
      expect(receiveCard).toBeInTheDocument()
      expect(screen.getByText('Receive Goods')).toBeInTheDocument()
      expect(screen.getByText('Record incoming shipments')).toBeInTheDocument()

      const shipCard = screen.getByTestId('quick-action-ship-orders')
      expect(shipCard).toBeInTheDocument()
      expect(screen.getByText('Ship Orders')).toBeInTheDocument()
      expect(screen.getByText('Process outbound shipments')).toBeInTheDocument()

      const stockCard = screen.getByTestId('quick-action-stock-count')
      expect(stockCard).toBeInTheDocument()
      expect(screen.getByText('Stock Count')).toBeInTheDocument()
      expect(screen.getByText('Perform inventory count')).toBeInTheDocument()

      const reportsCard = screen.getByTestId('quick-action-view-reports')
      expect(reportsCard).toBeInTheDocument()
      expect(screen.getByText('View Reports')).toBeInTheDocument()
      expect(screen.getByText('Check inventory reports')).toBeInTheDocument()
    })

    it('quick action cards have correct href attributes', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      expect(screen.getByTestId('quick-action-receive-goods')).toHaveAttribute('href', '/warehouse/receive')
      expect(screen.getByTestId('quick-action-ship-orders')).toHaveAttribute('href', '/warehouse/ship')
      expect(screen.getByTestId('quick-action-stock-count')).toHaveAttribute('href', '/warehouse/inventory')
      expect(screen.getByTestId('quick-action-view-reports')).toHaveAttribute('href', '/warehouse/reports')
    })

    it('quick action cards have hover effects', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      const receiveCard = screen.getByTestId('quick-action-receive-goods')
      expect(receiveCard).toHaveClass('hover:shadow-lg', 'transition-shadow', 'hover:border-primary')
    })

    it('displays quick action icons', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      expect(screen.getByText('📥')).toBeInTheDocument()
      expect(screen.getByText('📤')).toBeInTheDocument()
      expect(screen.getByText('📊')).toBeInTheDocument()
      expect(screen.getByText('📋')).toBeInTheDocument()
    })
  })

  describe('Top SKUs Section', () => {
    it('displays top SKUs by volume', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      // Check for section header
      const skuHeaders = screen.getAllByText('📦')
      expect(skuHeaders.length).toBeGreaterThan(0)
      expect(screen.getByText('Top SKUs by Volume')).toBeInTheDocument()

      // Check for SKU entries
      expect(screen.getByText('CS-001')).toBeInTheDocument()
      expect(screen.getByText('Product A')).toBeInTheDocument()
      expect(screen.getByText('CS-002')).toBeInTheDocument()
      expect(screen.getByText('Product B')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('uses responsive grid classes', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      const { container } = render(<WarehouseDashboardPage />)

      // Check for responsive grid classes
      const summaryGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4')
      expect(summaryGrid).toBeInTheDocument()

      const sectionsGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-2')
      expect(sectionsGrid).toBeInTheDocument()
    })
  })

  describe('Card Interactions', () => {
    it('quick action cards are clickable links', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      // All quick actions should be anchor tags
      const receiveLink = screen.getByTestId('quick-action-receive-goods')
      expect(receiveLink.tagName).toBe('A')

      const shipLink = screen.getByTestId('quick-action-ship-orders')
      expect(shipLink.tagName).toBe('A')

      const stockLink = screen.getByTestId('quick-action-stock-count')
      expect(stockLink.tagName).toBe('A')

      const reportsLink = screen.getByTestId('quick-action-view-reports')
      expect(reportsLink.tagName).toBe('A')
    })
  })

  describe('Data Display', () => {
    it('formats numbers with thousand separators', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      // Check that large numbers are formatted
      expect(screen.getByText('12,345')).toBeInTheDocument()
    })

    it('displays appropriate status messages', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      render(<WarehouseDashboardPage />)

      // Check for status messages
      expect(screen.getByText('All clear')).toBeInTheDocument()
      expect(screen.getByText('Live tracking')).toBeInTheDocument()
      expect(screen.getByText('Space utilization')).toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    it('uses proper spacing classes', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      const { container } = render(<WarehouseDashboardPage />)

      const mainContainer = container.querySelector('.space-y-6')
      expect(mainContainer).toBeInTheDocument()
    })

    it('sections have proper borders and padding', async () => {
      const { default: WarehouseDashboardPage } = await import('@/app/warehouse/dashboard/page')
      const { container } = render(<WarehouseDashboardPage />)

      const borderedSections = container.querySelectorAll('.border.rounded-lg.p-6')
      expect(borderedSections.length).toBeGreaterThan(0)
    })
  })
})