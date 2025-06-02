import React from 'react'
import { render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import WarehouseInventoryPage from '@/app/warehouse/inventory/page'
import { prisma } from '@/lib/prisma'
import { mockData, mockSessions } from '@/__tests__/test-utils'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('next/navigation')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    inventoryBalance: {
      findMany: jest.fn(),
    },
    warehouse: {
      findUnique: jest.fn(),
    },
  },
}))

// Mock components
jest.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}))

describe('Warehouse Inventory Page', () => {
  const mockGetServerSession = getServerSession as jest.Mock
  const mockRedirect = redirect as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication and Authorization', () => {
    it('should redirect to login if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      await WarehouseInventoryPage()

      expect(mockRedirect).toHaveBeenCalledWith('/auth/login')
      expect(prisma.inventoryBalance.findMany).not.toHaveBeenCalled()
    })

    it('should allow warehouse_staff to access their warehouse inventory', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.warehouseStaff)
      ;(prisma.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockData.warehouse({ id: 'warehouse-1', name: 'FMC' })
      )
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([])

      const { container } = render(await WarehouseInventoryPage())

      expect(mockRedirect).not.toHaveBeenCalled()
      expect(container.querySelector('[data-testid="dashboard-layout"]')).toBeInTheDocument()
    })

    it('should redirect warehouse_staff without assigned warehouse', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'staff-1',
          role: 'warehouse_staff',
          warehouseId: null,
        },
      })

      await WarehouseInventoryPage()

      expect(mockRedirect).toHaveBeenCalledWith('/auth/login')
    })

    it('should allow system_admin to access all warehouses', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.admin)
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([])

      const { container } = render(await WarehouseInventoryPage())

      expect(mockRedirect).not.toHaveBeenCalled()
      expect(container.querySelector('[data-testid="dashboard-layout"]')).toBeInTheDocument()
    })
  })

  describe('Data Filtering by Role', () => {
    it('should filter inventory by warehouse for warehouse_staff', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.warehouseStaff)
      ;(prisma.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockData.warehouse({ id: 'warehouse-1' })
      )
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([])

      await WarehouseInventoryPage()

      expect(prisma.inventoryBalance.findMany).toHaveBeenCalledWith({
        where: { warehouseId: 'warehouse-1' },
        include: {
          sku: true,
          warehouse: true,
        },
        orderBy: { sku: { skuCode: 'asc' } },
      })
    })

    it('should show all inventory for system_admin', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.admin)
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([])

      await WarehouseInventoryPage()

      expect(prisma.inventoryBalance.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          sku: true,
          warehouse: true,
        },
        orderBy: { sku: { skuCode: 'asc' } },
      })
    })
  })

  describe('Page Content', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSessions.warehouseStaff)
      ;(prisma.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockData.warehouse({ name: 'FMC' })
      )
    })

    it('should display warehouse-specific title for staff', async () => {
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([])

      render(await WarehouseInventoryPage())

      expect(screen.getByText('Inventory - FMC')).toBeInTheDocument()
      expect(screen.getByText('Current inventory levels for FMC')).toBeInTheDocument()
    })

    it('should display generic title for admin', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.admin)
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([])

      render(await WarehouseInventoryPage())

      expect(screen.getByText('All Warehouse Inventory')).toBeInTheDocument()
      expect(screen.getByText('Current inventory levels across all warehouses')).toBeInTheDocument()
    })

    it('should display inventory table headers', async () => {
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([])

      render(await WarehouseInventoryPage())

      const headers = ['SKU Code', 'Description', 'Batch/Lot', 'Cartons', 'Pallets', 'Units', 'Last Updated']
      headers.forEach(header => {
        expect(screen.getByText(header)).toBeInTheDocument()
      })
    })

    it('should display warehouse column for admin', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.admin)
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([])

      render(await WarehouseInventoryPage())

      expect(screen.getByText('Warehouse')).toBeInTheDocument()
    })
  })

  describe('Inventory Data Display', () => {
    it('should display inventory balances', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.warehouseStaff)
      ;(prisma.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockData.warehouse({ name: 'FMC' })
      )

      const mockInventory = [
        mockData.inventoryBalance({
          sku: { skuCode: 'CS-001', description: 'Product 1' },
          batchLot: 'BATCH001',
          currentCartons: 100,
          currentPallets: 5,
          currentUnits: 1200,
          lastTransactionDate: new Date('2024-01-15'),
          warehouse: { name: 'FMC' },
        }),
        mockData.inventoryBalance({
          sku: { skuCode: 'CS-002', description: 'Product 2' },
          batchLot: 'BATCH002',
          currentCartons: 50,
          currentPallets: 3,
          currentUnits: 600,
          lastTransactionDate: new Date('2024-01-14'),
          warehouse: { name: 'FMC' },
        }),
      ]

      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue(mockInventory)

      render(await WarehouseInventoryPage())

      // First item
      expect(screen.getByText('CS-001')).toBeInTheDocument()
      expect(screen.getByText('Product 1')).toBeInTheDocument()
      expect(screen.getByText('BATCH001')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('1,200')).toBeInTheDocument()
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()

      // Second item
      expect(screen.getByText('CS-002')).toBeInTheDocument()
      expect(screen.getByText('Product 2')).toBeInTheDocument()
    })

    it('should display warehouse name for admin view', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.admin)

      const mockInventory = [
        mockData.inventoryBalance({
          warehouse: { name: 'FMC' },
          sku: { skuCode: 'CS-001', description: 'Product 1' },
        }),
        mockData.inventoryBalance({
          warehouse: { name: 'HSQ' },
          sku: { skuCode: 'CS-002', description: 'Product 2' },
        }),
      ]

      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue(mockInventory)

      render(await WarehouseInventoryPage())

      expect(screen.getByText('FMC')).toBeInTheDocument()
      expect(screen.getByText('HSQ')).toBeInTheDocument()
    })
  })

  describe('Inventory Summary', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSessions.warehouseStaff)
      ;(prisma.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockData.warehouse({ name: 'FMC' })
      )
    })

    it('should calculate and display summary statistics', async () => {
      const mockInventory = [
        mockData.inventoryBalance({
          currentCartons: 100,
          currentPallets: 5,
          currentUnits: 1200,
        }),
        mockData.inventoryBalance({
          currentCartons: 50,
          currentPallets: 3,
          currentUnits: 600,
        }),
        mockData.inventoryBalance({
          currentCartons: 75,
          currentPallets: 4,
          currentUnits: 900,
        }),
      ]

      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue(mockInventory)

      render(await WarehouseInventoryPage())

      expect(screen.getByText('Inventory Summary')).toBeInTheDocument()
      expect(screen.getByText('225')).toBeInTheDocument() // Total cartons
      expect(screen.getByText('12')).toBeInTheDocument() // Total pallets
      expect(screen.getByText('2,700')).toBeInTheDocument() // Total units
      expect(screen.getByText('3')).toBeInTheDocument() // Unique SKUs
    })

    it('should handle empty inventory', async () => {
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([])

      render(await WarehouseInventoryPage())

      // All summary values should be 0
      const zeroElements = screen.getAllByText('0')
      expect(zeroElements.length).toBe(4)
    })
  })

  describe('Filters and Actions', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSessions.warehouseStaff)
      ;(prisma.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockData.warehouse({ name: 'FMC' })
      )
      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue([])
    })

    it('should display action buttons', async () => {
      render(await WarehouseInventoryPage())

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
    })

    it('should display search input', async () => {
      render(await WarehouseInventoryPage())

      const searchInput = screen.getByPlaceholderText(/search/i)
      expect(searchInput).toBeInTheDocument()
    })
  })

  describe('Table Formatting', () => {
    it('should format numbers with commas', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.warehouseStaff)
      ;(prisma.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockData.warehouse({ name: 'FMC' })
      )

      const mockInventory = [
        mockData.inventoryBalance({
          currentUnits: 12345,
          sku: { skuCode: 'CS-001', description: 'Product 1' },
        }),
      ]

      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue(mockInventory)

      render(await WarehouseInventoryPage())

      expect(screen.getByText('12,345')).toBeInTheDocument()
    })

    it('should format dates correctly', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.warehouseStaff)
      ;(prisma.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockData.warehouse({ name: 'FMC' })
      )

      const mockInventory = [
        mockData.inventoryBalance({
          lastTransactionDate: new Date('2024-12-25'),
          sku: { skuCode: 'CS-001', description: 'Product 1' },
        }),
      ]

      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue(mockInventory)

      render(await WarehouseInventoryPage())

      expect(screen.getByText('Dec 25, 2024')).toBeInTheDocument()
    })

    it('should show "-" for null last transaction date', async () => {
      mockGetServerSession.mockResolvedValue(mockSessions.warehouseStaff)
      ;(prisma.warehouse.findUnique as jest.Mock).mockResolvedValue(
        mockData.warehouse({ name: 'FMC' })
      )

      const mockInventory = [
        mockData.inventoryBalance({
          lastTransactionDate: null,
          sku: { skuCode: 'CS-001', description: 'Product 1' },
        }),
      ]

      ;(prisma.inventoryBalance.findMany as jest.Mock).mockResolvedValue(mockInventory)

      render(await WarehouseInventoryPage())

      expect(screen.getByText('-')).toBeInTheDocument()
    })
  })
})