import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReportsClientPage from '@/app/warehouse/reports/client-page'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@/components/reports/report-generator', () => ({
  ReportGenerator: ({ reportType, reportName }: { reportType: string; reportName: string }) => (
    <button 
      data-testid={`report-generator-${reportType}`}
      className="inline-flex items-center px-3 py-1 text-sm"
    >
      {reportName}
    </button>
  )
}))

describe('Reports Client Page', () => {
  const user = userEvent.setup()
  
  const defaultProps = {
    warehouse: { id: 'warehouse-1', name: 'FMC' },
    inventoryStats: {
      _sum: {
        currentCartons: 12345,
        currentPallets: 156,
      },
    },
    monthlyTransactions: {
      _count: 89,
    },
  }

  describe('Page Structure', () => {
    it('renders page title and subtitle', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expect(screen.getByText('Reports')).toBeInTheDocument()
      expect(screen.getByText('FMC Reports')).toBeInTheDocument()
    })

    it('renders all main sections', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expect(screen.getByText('Available Reports')).toBeInTheDocument()
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })

    it('renders correct subtitle when no warehouse', () => {
      render(<ReportsClientPage {...{ ...defaultProps, warehouse: null }} />)

      expect(screen.getByText('Warehouse Operations Reports')).toBeInTheDocument()
    })
  })

  describe('Summary Cards', () => {
    it('displays monthly transactions card with correct data', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expect(screen.getByText('Monthly Transactions')).toBeInTheDocument()
      expect(screen.getByText('89')).toBeInTheDocument()
      expect(screen.getByText('Since start of month')).toBeInTheDocument()
    })

    it('displays current inventory card with formatted number', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expect(screen.getByText('Current Inventory')).toBeInTheDocument()
      expect(screen.getByText('12,345')).toBeInTheDocument()
      expect(screen.getByText('Total cartons')).toBeInTheDocument()
    })

    it('displays space utilization card', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expect(screen.getByText('Space Utilization')).toBeInTheDocument()
      expect(screen.getByText('156')).toBeInTheDocument()
      expect(screen.getByText('Pallets in use')).toBeInTheDocument()
    })

    it('handles null values in summary cards', () => {
      const propsWithNulls = {
        ...defaultProps,
        inventoryStats: {
          _sum: {
            currentCartons: null,
            currentPallets: null,
          },
        },
      }
      
      render(<ReportsClientPage {...propsWithNulls} />)

      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('summary cards have gradient backgrounds', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      const blueCard = container.querySelector('.bg-gradient-to-br.from-blue-50.to-blue-100')
      const greenCard = container.querySelector('.bg-gradient-to-br.from-green-50.to-green-100')
      const purpleCard = container.querySelector('.bg-gradient-to-br.from-purple-50.to-purple-100')

      expect(blueCard).toBeInTheDocument()
      expect(greenCard).toBeInTheDocument()
      expect(purpleCard).toBeInTheDocument()
    })
  })

  describe('Available Reports Section', () => {
    const expectedReports = [
      { name: 'Monthly Inventory Summary', category: 'Inventory', reportType: 'monthly-inventory' },
      { name: 'Inventory Ledger', category: 'Operations', reportType: 'inventory-ledger' },
      { name: 'Storage Utilization', category: 'Storage', reportType: 'storage-charges' },
      { name: 'Weekly Activity Report', category: 'Operations', reportType: 'inventory-ledger' },
      { name: 'Stock Aging Report', category: 'Inventory', reportType: 'monthly-inventory' },
    ]

    it('renders all report cards', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expectedReports.forEach(report => {
        expect(screen.getByText(report.name)).toBeInTheDocument()
      })
    })

    it('displays report descriptions', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expect(screen.getByText('Current inventory levels by SKU and batch')).toBeInTheDocument()
      expect(screen.getByText('All inbound and outbound movements')).toBeInTheDocument()
      expect(screen.getByText('Pallet usage and warehouse capacity')).toBeInTheDocument()
      expect(screen.getByText('Summary of weekly operations')).toBeInTheDocument()
      expect(screen.getByText('Inventory age analysis by batch')).toBeInTheDocument()
    })

    it('shows report categories', () => {
      render(<ReportsClientPage {...defaultProps} />)

      const inventoryBadges = screen.getAllByText('Inventory')
      const operationsBadges = screen.getAllByText('Operations')
      const storageBadges = screen.getAllByText('Storage')

      expect(inventoryBadges).toHaveLength(2)
      expect(operationsBadges).toHaveLength(2)
      expect(storageBadges).toHaveLength(1)
    })

    it('displays last generated information', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expect(screen.getByText('Last generated: Today')).toBeInTheDocument()
      expect(screen.getByText('Last generated: Yesterday')).toBeInTheDocument()
      expect(screen.getByText('Last generated: 2 days ago')).toBeInTheDocument()
      expect(screen.getByText('Last generated: Monday')).toBeInTheDocument()
      expect(screen.getByText('Last generated: Last week')).toBeInTheDocument()
    })

    it('renders report generator buttons for each report', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expect(screen.getByTestId('report-generator-monthly-inventory')).toBeInTheDocument()
      expect(screen.getAllByTestId('report-generator-transaction-history')).toHaveLength(2)
      expect(screen.getByTestId('report-generator-storage-charges')).toBeInTheDocument()
    })

    it('report cards have hover effects', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      const reportCards = container.querySelectorAll('.hover\\:shadow-lg.hover\\:border-primary')
      expect(reportCards.length).toBe(5)
    })

    it('report cards have category badges with correct styling', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      const categoryBadges = container.querySelectorAll('.text-xs.text-gray-500.bg-gray-100.px-2.py-1.rounded')
      expect(categoryBadges.length).toBe(5)
    })
  })

  describe('Report Icons', () => {
    it('displays correct icons for each report type', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      // Check that icons are rendered with correct classes
      const icons = container.querySelectorAll('.h-8.w-8.text-gray-400.group-hover\\:text-primary')
      expect(icons.length).toBe(5)
    })
  })

  describe('Quick Actions Section', () => {
    it('renders all quick action buttons', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expect(screen.getByRole('button', { name: /schedule reports/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /custom report/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /export all data/i })).toBeInTheDocument()
    })

    it('quick action buttons have correct styling', () => {
      render(<ReportsClientPage {...defaultProps} />)

      const scheduleButton = screen.getByRole('button', { name: /schedule reports/i })
      const customButton = screen.getByRole('button', { name: /custom report/i })
      const exportButton = screen.getByRole('button', { name: /export all data/i })

      [scheduleButton, customButton, exportButton].forEach(button => {
        expect(button).toHaveClass('bg-white', 'border', 'rounded-md', 'shadow-sm', 'hover:bg-gray-50')
      })
    })

    it('quick action buttons have icons', () => {
      render(<ReportsClientPage {...defaultProps} />)

      const scheduleButton = screen.getByRole('button', { name: /schedule reports/i })
      const customButton = screen.getByRole('button', { name: /custom report/i })
      const exportButton = screen.getByRole('button', { name: /export all data/i })

      [scheduleButton, customButton, exportButton].forEach(button => {
        const icon = button.querySelector('.h-4.w-4.mr-2')
        expect(icon).toBeInTheDocument()
      })
    })

    it('quick actions section has gradient background', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      const quickActionsSection = container.querySelector('.bg-gradient-to-r.from-gray-50.to-gray-100')
      expect(quickActionsSection).toBeInTheDocument()
      expect(quickActionsSection).toHaveTextContent('Quick Actions')
    })
  })

  describe('Button Interactions', () => {
    it('quick action buttons are clickable', async () => {
      render(<ReportsClientPage {...defaultProps} />)

      const scheduleButton = screen.getByRole('button', { name: /schedule reports/i })
      const customButton = screen.getByRole('button', { name: /custom report/i })
      const exportButton = screen.getByRole('button', { name: /export all data/i })

      // Verify buttons are not disabled
      expect(scheduleButton).not.toBeDisabled()
      expect(customButton).not.toBeDisabled()
      expect(exportButton).not.toBeDisabled()

      // Test clicking
      await user.click(scheduleButton)
      await user.click(customButton)
      await user.click(exportButton)
    })

    it('report cards respond to hover', async () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      const firstReportCard = container.querySelector('.group')
      
      if (firstReportCard) {
        await user.hover(firstReportCard)
        
        // Check if hover classes are applied
        expect(firstReportCard).toHaveClass('cursor-pointer')
      }
    })
  })

  describe('Responsive Design', () => {
    it('uses responsive grid for summary cards', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      const summaryGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-3')
      expect(summaryGrid).toBeInTheDocument()
    })

    it('uses responsive grid for report cards', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      const reportsGrid = container.querySelector('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-3')
      expect(reportsGrid).toBeInTheDocument()
    })

    it('quick actions buttons wrap on small screens', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      const buttonsContainer = container.querySelector('.flex.flex-wrap.gap-3')
      expect(buttonsContainer).toBeInTheDocument()
    })
  })

  describe('Data Formatting', () => {
    it('formats large numbers with thousand separators', () => {
      render(<ReportsClientPage {...defaultProps} />)

      expect(screen.getByText('12,345')).toBeInTheDocument()
    })

    it('handles zero values correctly', () => {
      const propsWithZeros = {
        ...defaultProps,
        inventoryStats: {
          _sum: {
            currentCartons: 0,
            currentPallets: 0,
          },
        },
        monthlyTransactions: {
          _count: 0,
        },
      }

      render(<ReportsClientPage {...propsWithZeros} />)

      const zeros = screen.getAllByText('0')
      expect(zeros.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Layout Structure', () => {
    it('has proper spacing between sections', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      const mainContainer = container.querySelector('.space-y-6')
      expect(mainContainer).toBeInTheDocument()
    })

    it('report cards have proper padding and borders', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      const reportCard = container.querySelector('.bg-white.border.rounded-lg.p-6')
      expect(reportCard).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('all buttons have accessible names', () => {
      render(<ReportsClientPage {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('uses semantic heading hierarchy', () => {
      render(<ReportsClientPage {...defaultProps} />)

      const h1 = screen.getByRole('heading', { level: 1, name: 'Reports' })
      const h2 = screen.getByRole('heading', { level: 2, name: 'Available Reports' })
      const h3s = screen.getAllByRole('heading', { level: 3 })

      expect(h1).toBeInTheDocument()
      expect(h2).toBeInTheDocument()
      expect(h3s.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('handles empty warehouse name gracefully', () => {
      const propsWithEmptyWarehouse = {
        ...defaultProps,
        warehouse: { id: '', name: '' },
      }

      render(<ReportsClientPage {...propsWithEmptyWarehouse} />)

      // Should still render without errors
      expect(screen.getByText('Reports')).toBeInTheDocument()
    })
  })

  describe('Icon Components', () => {
    it('renders icon components in summary cards', () => {
      const { container } = render(<ReportsClientPage {...defaultProps} />)

      // Check for icon elements with correct sizing
      const icons = container.querySelectorAll('.h-10.w-10')
      expect(icons.length).toBe(3) // One for each summary card
    })
  })
})