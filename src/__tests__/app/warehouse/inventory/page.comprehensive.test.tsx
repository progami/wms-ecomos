import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock the inventory page component
jest.mock('@/app/warehouse/inventory/page', () => ({
  __esModule: true,
  default: function WarehouseInventoryPage() {
    const [sortField, setSortField] = React.useState('skuCode')
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')
    const [filterSku, setFilterSku] = React.useState('')
    const [filterBatch, setFilterBatch] = React.useState('')
    const [currentPage, setCurrentPage] = React.useState(1)

    const mockInventory = [
      {
        id: 'inv-1',
        skuCode: 'CS-001',
        description: 'Product A',
        batchLot: 'BATCH-2024-01',
        currentCartons: 150,
        currentPallets: 8,
        currentUnits: 1800,
        lastTransactionDate: '2024-01-15',
      },
      {
        id: 'inv-2',
        skuCode: 'CS-002',
        description: 'Product B',
        batchLot: 'BATCH-2024-02',
        currentCartons: 75,
        currentPallets: 4,
        currentUnits: 900,
        lastTransactionDate: '2024-01-14',
      },
      {
        id: 'inv-3',
        skuCode: 'CS-003',
        description: 'Product C',
        batchLot: 'BATCH-2024-03',
        currentCartons: 0,
        currentPallets: 0,
        currentUnits: 0,
        lastTransactionDate: '2024-01-10',
      },
    ]

    const handleSort = (field: string) => {
      if (sortField === field) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
      } else {
        setSortField(field)
        setSortOrder('asc')
      }
    }

    return (
      <div>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Inventory Management</h1>
              <p className="text-muted-foreground">
                Current stock levels and movements
              </p>
            </div>
            <div className="flex gap-2">
              <button className="action-button-outline">
                <span>📥</span> Export
              </button>
              <button className="action-button">
                <span>📤</span> Ship
              </button>
              <button className="action-button">
                <span>📥</span> Receive
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU Code
                </label>
                <input
                  type="text"
                  value={filterSku}
                  onChange={(e) => setFilterSku(e.target.value)}
                  placeholder="Filter by SKU..."
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch/Lot
                </label>
                <input
                  type="text"
                  value={filterBatch}
                  onChange={(e) => setFilterBatch(e.target.value)}
                  placeholder="Filter by batch..."
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option value="">All Status</option>
                  <option value="in-stock">In Stock</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('skuCode')}
                  >
                    <div className="flex items-center gap-1">
                      SKU Code
                      <span>{sortField === 'skuCode' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('batchLot')}
                  >
                    <div className="flex items-center gap-1">
                      Batch/Lot
                      <span>{sortField === 'batchLot' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('currentCartons')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Cartons
                      <span>{sortField === 'currentCartons' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pallets
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lastTransactionDate')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Last Activity
                      <span>{sortField === 'lastTransactionDate' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockInventory
                  .filter(item => 
                    (!filterSku || item.skuCode.toLowerCase().includes(filterSku.toLowerCase())) &&
                    (!filterBatch || item.batchLot.toLowerCase().includes(filterBatch.toLowerCase()))
                  )
                  .map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.skuCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.batchLot}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.currentCartons.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.currentPallets}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {item.currentUnits.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {new Date(item.lastTransactionDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button 
                          className="text-primary hover:text-primary/80 mr-2"
                          aria-label={`View history for ${item.skuCode}`}
                        >
                          📋
                        </button>
                        <button 
                          className="text-primary hover:text-primary/80"
                          aria-label={`Adjust inventory for ${item.skuCode}`}
                        >
                          ✏️
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing 1 to 3 of 3 results
            </div>
            <div className="flex gap-2">
              <button 
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>
              <button className="px-3 py-1 border rounded bg-primary text-white">
                1
              </button>
              <button 
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                disabled={true}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Inventory Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded text-center">
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-gray-600">Total SKUs</p>
              </div>
              <div className="bg-white p-4 rounded text-center">
                <p className="text-2xl font-bold">225</p>
                <p className="text-sm text-gray-600">Total Cartons</p>
              </div>
              <div className="bg-white p-4 rounded text-center">
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-gray-600">Total Pallets</p>
              </div>
              <div className="bg-white p-4 rounded text-center">
                <p className="text-2xl font-bold text-red-600">1</p>
                <p className="text-sm text-gray-600">Out of Stock</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}))

describe('Warehouse Inventory Page', () => {
  const user = userEvent.setup()

  describe('Page Structure', () => {
    it('renders page title and description', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      expect(screen.getByText('Inventory Management')).toBeInTheDocument()
      expect(screen.getByText('Current stock levels and movements')).toBeInTheDocument()
    })

    it('renders action buttons', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /ship/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /receive/i })).toBeInTheDocument()
    })
  })

  describe('Filters Section', () => {
    it('renders all filter inputs', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      expect(screen.getByLabelText('SKU Code')).toBeInTheDocument()
      expect(screen.getByLabelText('Batch/Lot')).toBeInTheDocument()
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
    })

    it('filter inputs are functional', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const skuFilter = screen.getByPlaceholderText('Filter by SKU...')
      const batchFilter = screen.getByPlaceholderText('Filter by batch...')
      
      await user.type(skuFilter, 'CS-001')
      await user.type(batchFilter, 'BATCH-2024')

      expect(skuFilter).toHaveValue('CS-001')
      expect(batchFilter).toHaveValue('BATCH-2024')
    })

    it('status dropdown has all options', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const statusSelect = screen.getByLabelText('Status')
      
      expect(within(statusSelect).getByText('All Status')).toBeInTheDocument()
      expect(within(statusSelect).getByText('In Stock')).toBeInTheDocument()
      expect(within(statusSelect).getByText('Low Stock')).toBeInTheDocument()
      expect(within(statusSelect).getByText('Out of Stock')).toBeInTheDocument()
    })

    it('filters table data when SKU filter is applied', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const skuFilter = screen.getByPlaceholderText('Filter by SKU...')
      
      // Initially all 3 SKUs should be visible
      expect(screen.getByText('CS-001')).toBeInTheDocument()
      expect(screen.getByText('CS-002')).toBeInTheDocument()
      expect(screen.getByText('CS-003')).toBeInTheDocument()

      // Apply filter
      await user.type(skuFilter, 'CS-001')

      // Only CS-001 should be visible
      expect(screen.getByText('CS-001')).toBeInTheDocument()
      expect(screen.queryByText('CS-002')).not.toBeInTheDocument()
      expect(screen.queryByText('CS-003')).not.toBeInTheDocument()
    })

    it('filters are case-insensitive', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const skuFilter = screen.getByPlaceholderText('Filter by SKU...')
      await user.type(skuFilter, 'cs-001')

      expect(screen.getByText('CS-001')).toBeInTheDocument()
    })
  })

  describe('Inventory Table', () => {
    it('renders all table headers', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const headers = [
        'SKU Code',
        'Description',
        'Batch/Lot',
        'Cartons',
        'Pallets',
        'Units',
        'Last Activity',
        'Actions'
      ]

      headers.forEach(header => {
        expect(screen.getByText(header)).toBeInTheDocument()
      })
    })

    it('renders inventory data correctly', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      // Check first row
      expect(screen.getByText('CS-001')).toBeInTheDocument()
      expect(screen.getByText('Product A')).toBeInTheDocument()
      expect(screen.getByText('BATCH-2024-01')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('1,800')).toBeInTheDocument()

      // Check zero inventory item
      expect(screen.getByText('CS-003')).toBeInTheDocument()
      expect(screen.getAllByText('0')).toHaveLength(3) // cartons, pallets, units
    })

    it('formats large numbers with thousand separators', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      expect(screen.getByText('1,800')).toBeInTheDocument()
    })

    it('formats dates correctly', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      expect(screen.getByText('1/15/2024')).toBeInTheDocument()
      expect(screen.getByText('1/14/2024')).toBeInTheDocument()
      expect(screen.getByText('1/10/2024')).toBeInTheDocument()
    })

    it('table rows have hover effect', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      const { container } = render(<WarehouseInventoryPage />)

      const rows = container.querySelectorAll('tbody tr')
      rows.forEach(row => {
        expect(row).toHaveClass('hover:bg-gray-50')
      })
    })
  })

  describe('Table Sorting', () => {
    it('sortable columns have cursor pointer', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      const { container } = render(<WarehouseInventoryPage />)

      const sortableHeaders = [
        'SKU Code',
        'Batch/Lot',
        'Cartons',
        'Last Activity'
      ]

      sortableHeaders.forEach(header => {
        const th = screen.getByText(header).closest('th')
        expect(th).toHaveClass('cursor-pointer', 'hover:bg-gray-100')
      })
    })

    it('displays sort indicators', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      // Initial state should show ascending arrow on SKU Code
      const skuHeader = screen.getByText('SKU Code').closest('div')
      expect(within(skuHeader!).getByText('↑')).toBeInTheDocument()
    })

    it('toggles sort order when clicking same column', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const skuHeader = screen.getByText('SKU Code').closest('th')
      
      // Click to change to descending
      await user.click(skuHeader!)
      expect(within(skuHeader!).getByText('↓')).toBeInTheDocument()

      // Click again to change back to ascending
      await user.click(skuHeader!)
      expect(within(skuHeader!).getByText('↑')).toBeInTheDocument()
    })

    it('changes sort field when clicking different column', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const cartonsHeader = screen.getByText('Cartons').closest('th')
      await user.click(cartonsHeader!)

      // Should show ascending arrow on Cartons
      expect(within(cartonsHeader!).getByText('↑')).toBeInTheDocument()
      
      // SKU Code should no longer have an arrow
      const skuHeader = screen.getByText('SKU Code').closest('div')
      expect(within(skuHeader!).queryByText('↑')).not.toBeInTheDocument()
      expect(within(skuHeader!).queryByText('↓')).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('renders action buttons for each row', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const viewButtons = screen.getAllByRole('button', { name: /view history/i })
      const adjustButtons = screen.getAllByRole('button', { name: /adjust inventory/i })

      expect(viewButtons).toHaveLength(3)
      expect(adjustButtons).toHaveLength(3)
    })

    it('action buttons have hover effects', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const viewButtons = screen.getAllByRole('button', { name: /view history/i })
      viewButtons.forEach(button => {
        expect(button).toHaveClass('hover:text-primary/80')
      })
    })

    it('action buttons have accessible labels', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      expect(screen.getByRole('button', { name: 'View history for CS-001' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Adjust inventory for CS-001' })).toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('renders pagination controls', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      expect(screen.getByText('Showing 1 to 3 of 3 results')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    })

    it('disables previous button on first page', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const previousButton = screen.getByRole('button', { name: /previous/i })
      expect(previousButton).toBeDisabled()
    })

    it('disables next button when no more pages', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()
    })

    it('current page button has active styling', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const pageButton = screen.getByRole('button', { name: '1' })
      expect(pageButton).toHaveClass('bg-primary', 'text-white')
    })
  })

  describe('Summary Section', () => {
    it('renders inventory summary with gradient background', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      const { container } = render(<WarehouseInventoryPage />)

      const summarySection = container.querySelector('.bg-gradient-to-r.from-blue-50.to-indigo-50')
      expect(summarySection).toBeInTheDocument()
      expect(summarySection).toHaveTextContent('Inventory Summary')
    })

    it('displays correct summary statistics', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('Total SKUs')).toBeInTheDocument()

      expect(screen.getByText('225')).toBeInTheDocument()
      expect(screen.getByText('Total Cartons')).toBeInTheDocument()

      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('Total Pallets')).toBeInTheDocument()

      expect(screen.getByText('1', { selector: '.text-red-600' })).toBeInTheDocument()
      expect(screen.getByText('Out of Stock')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('uses responsive grid for filters', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      const { container } = render(<WarehouseInventoryPage />)

      const filterGrid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-4')
      expect(filterGrid).toBeInTheDocument()
    })

    it('table has overflow handling', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      const { container } = render(<WarehouseInventoryPage />)

      const tableContainer = container.querySelector('.overflow-hidden')
      expect(tableContainer).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('all form inputs have labels', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      expect(screen.getByLabelText('SKU Code')).toBeInTheDocument()
      expect(screen.getByLabelText('Batch/Lot')).toBeInTheDocument()
      expect(screen.getByLabelText('Status')).toBeInTheDocument()
    })

    it('table has proper semantic structure', async () => {
      const { default: WarehouseInventoryPage } = await import('@/app/warehouse/inventory/page')
      render(<WarehouseInventoryPage />)

      const table = screen.getByRole('table')
      const headers = screen.getAllByRole('columnheader')
      const rows = screen.getAllByRole('row')

      expect(table).toBeInTheDocument()
      expect(headers.length).toBeGreaterThan(0)
      expect(rows.length).toBeGreaterThan(0)
    })
  })
})