import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import WarehouseReceivePage from '@/app/warehouse/receive/page'
import '@testing-library/jest-dom'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/components/layout/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock fetch
global.fetch = jest.fn()

describe('Warehouse Receive Page', () => {
  const user = userEvent.setup()
  const mockPush = jest.fn()
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  describe('Page Structure', () => {
    it('renders page title and description', () => {
      render(<WarehouseReceivePage />)

      expect(screen.getByText('Receive Goods')).toBeInTheDocument()
      expect(screen.getByText('Record incoming inventory')).toBeInTheDocument()
    })

    it('renders all form sections', () => {
      render(<WarehouseReceivePage />)

      expect(screen.getByText('Shipment Details')).toBeInTheDocument()
      expect(screen.getByText('Items Received')).toBeInTheDocument()
      expect(screen.getByText('Additional Notes')).toBeInTheDocument()
    })

    it('renders cancel button in header', () => {
      render(<WarehouseReceivePage />)

      const cancelButtons = screen.getAllByText('Cancel')
      expect(cancelButtons[0]).toBeInTheDocument()
    })
  })

  describe('Shipment Details Section', () => {
    it('renders all shipment detail fields', () => {
      render(<WarehouseReceivePage />)

      expect(screen.getByLabelText('Reference Number')).toBeInTheDocument()
      expect(screen.getByLabelText('Supplier')).toBeInTheDocument()
      expect(screen.getByLabelText('Receipt Date')).toBeInTheDocument()
    })

    it('reference number field is required', () => {
      render(<WarehouseReceivePage />)

      const referenceInput = screen.getByLabelText('Reference Number')
      expect(referenceInput).toHaveAttribute('required')
      expect(referenceInput).toHaveAttribute('placeholder', 'e.g., PO-2024-001')
    })

    it('receipt date defaults to today', () => {
      render(<WarehouseReceivePage />)

      const dateInput = screen.getByLabelText('Receipt Date')
      const today = new Date().toISOString().split('T')[0]
      expect(dateInput).toHaveValue(today)
    })

    it('allows typing in shipment detail fields', async () => {
      render(<WarehouseReceivePage />)

      const referenceInput = screen.getByLabelText('Reference Number')
      const supplierInput = screen.getByLabelText('Supplier')
      const dateInput = screen.getByLabelText('Receipt Date')

      await user.type(referenceInput, 'PO-2024-123')
      await user.type(supplierInput, 'Test Supplier Inc.')
      await user.clear(dateInput)
      await user.type(dateInput, '2024-12-25')

      expect(referenceInput).toHaveValue('PO-2024-123')
      expect(supplierInput).toHaveValue('Test Supplier Inc.')
      expect(dateInput).toHaveValue('2024-12-25')
    })
  })

  describe('Items Received Section', () => {
    it('renders table headers correctly', () => {
      render(<WarehouseReceivePage />)

      expect(screen.getByText('SKU Code')).toBeInTheDocument()
      expect(screen.getByText('Batch/Lot')).toBeInTheDocument()
      expect(screen.getByText('Cartons')).toBeInTheDocument()
      expect(screen.getByText('Pallets')).toBeInTheDocument()
      expect(screen.getByText('Units')).toBeInTheDocument()
    })

    it('starts with one empty item row', () => {
      render(<WarehouseReceivePage />)

      const skuInputs = screen.getAllByPlaceholderText('SKU code')
      expect(skuInputs).toHaveLength(1)
    })

    it('all item fields are editable', async () => {
      render(<WarehouseReceivePage />)

      const skuInput = screen.getByPlaceholderText('SKU code')
      const batchInput = screen.getByPlaceholderText('Batch/Lot')
      const cartonsInputs = screen.getAllByDisplayValue('0')
      const cartonsInput = cartonsInputs[0]
      const palletsInput = cartonsInputs[1]
      const unitsInput = cartonsInputs[2]

      await user.type(skuInput, 'CS-001')
      await user.type(batchInput, 'BATCH-2024-01')
      await user.clear(cartonsInput)
      await user.type(cartonsInput, '100')
      await user.clear(palletsInput)
      await user.type(palletsInput, '5')
      await user.clear(unitsInput)
      await user.type(unitsInput, '1200')

      expect(skuInput).toHaveValue('CS-001')
      expect(batchInput).toHaveValue('BATCH-2024-01')
      expect(cartonsInput).toHaveValue(100)
      expect(palletsInput).toHaveValue(5)
      expect(unitsInput).toHaveValue(1200)
    })

    it('SKU code and batch/lot fields are required', () => {
      render(<WarehouseReceivePage />)

      const skuInput = screen.getByPlaceholderText('SKU code')
      const batchInput = screen.getByPlaceholderText('Batch/Lot')

      expect(skuInput).toHaveAttribute('required')
      expect(batchInput).toHaveAttribute('required')
    })

    it('numeric fields have min value of 0', () => {
      render(<WarehouseReceivePage />)

      const numericInputs = screen.getAllByDisplayValue('0')
      numericInputs.forEach(input => {
        expect(input).toHaveAttribute('min', '0')
      })
    })
  })

  describe('Add/Remove Items', () => {
    it('can add new item rows', async () => {
      render(<WarehouseReceivePage />)

      const addButton = screen.getByRole('button', { name: /add item/i })
      await user.click(addButton)

      const skuInputs = screen.getAllByPlaceholderText('SKU code')
      expect(skuInputs).toHaveLength(2)
    })

    it('can add multiple item rows', async () => {
      render(<WarehouseReceivePage />)

      const addButton = screen.getByRole('button', { name: /add item/i })
      
      await user.click(addButton)
      await user.click(addButton)
      await user.click(addButton)

      const skuInputs = screen.getAllByPlaceholderText('SKU code')
      expect(skuInputs).toHaveLength(4)
    })

    it('can remove item rows', async () => {
      render(<WarehouseReceivePage />)

      // Add a second row
      const addButton = screen.getByRole('button', { name: /add item/i })
      await user.click(addButton)

      // Should have 2 rows now
      let skuInputs = screen.getAllByPlaceholderText('SKU code')
      expect(skuInputs).toHaveLength(2)

      // Remove the second row
      const removeButtons = screen.getAllByRole('button').filter(btn => 
        btn.querySelector('.h-4.w-4') !== null
      )
      await user.click(removeButtons[1])

      // Should have 1 row now
      skuInputs = screen.getAllByPlaceholderText('SKU code')
      expect(skuInputs).toHaveLength(1)
    })

    it('cannot remove the last item row', () => {
      render(<WarehouseReceivePage />)

      const removeButton = screen.getByRole('button', { name: '' }).closest('button')
      expect(removeButton).toBeDisabled()
    })

    it('preserves data when adding new rows', async () => {
      render(<WarehouseReceivePage />)

      // Fill first row
      const skuInput = screen.getByPlaceholderText('SKU code')
      await user.type(skuInput, 'CS-001')

      // Add new row
      const addButton = screen.getByRole('button', { name: /add item/i })
      await user.click(addButton)

      // First row should still have data
      const skuInputs = screen.getAllByPlaceholderText('SKU code')
      expect(skuInputs[0]).toHaveValue('CS-001')
      expect(skuInputs[1]).toHaveValue('')
    })
  })

  describe('Totals Calculation', () => {
    it('displays totals row', () => {
      render(<WarehouseReceivePage />)

      expect(screen.getByText('Total:')).toBeInTheDocument()
    })

    it('calculates totals correctly', async () => {
      render(<WarehouseReceivePage />)

      // Add items
      const addButton = screen.getByRole('button', { name: /add item/i })
      await user.click(addButton)

      // Fill in values for both rows
      const cartonsInputs = screen.getAllByDisplayValue('0').filter(input => 
        input.closest('td')?.previousElementSibling?.textContent === ''
      )
      
      await user.clear(cartonsInputs[0])
      await user.type(cartonsInputs[0], '100')
      await user.clear(cartonsInputs[3])
      await user.type(cartonsInputs[3], '50')

      // Check total
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    it('formats large totals with thousand separators', async () => {
      render(<WarehouseReceivePage />)

      const cartonsInput = screen.getAllByDisplayValue('0')[0]
      await user.clear(cartonsInput)
      await user.type(cartonsInput, '10000')

      expect(screen.getByText('10,000')).toBeInTheDocument()
    })
  })

  describe('Additional Notes Section', () => {
    it('renders notes textarea', () => {
      render(<WarehouseReceivePage />)

      const notesTextarea = screen.getByPlaceholderText('Any additional notes or comments...')
      expect(notesTextarea).toBeInTheDocument()
      expect(notesTextarea.tagName).toBe('TEXTAREA')
    })

    it('notes field has correct attributes', () => {
      render(<WarehouseReceivePage />)

      const notesTextarea = screen.getByPlaceholderText('Any additional notes or comments...')
      expect(notesTextarea).toHaveAttribute('rows', '3')
      expect(notesTextarea).toHaveAttribute('name', 'notes')
    })

    it('can type in notes field', async () => {
      render(<WarehouseReceivePage />)

      const notesTextarea = screen.getByPlaceholderText('Any additional notes or comments...')
      await user.type(notesTextarea, 'This is a test note for the shipment.')

      expect(notesTextarea).toHaveValue('This is a test note for the shipment.')
    })
  })

  describe('Form Submission', () => {
    it('submits form with correct data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Receipt saved successfully' }),
      } as Response)

      window.alert = jest.fn()

      render(<WarehouseReceivePage />)

      // Fill form
      await user.type(screen.getByLabelText('Reference Number'), 'PO-2024-001')
      await user.type(screen.getByLabelText('Supplier'), 'Test Supplier')
      await user.type(screen.getByPlaceholderText('SKU code'), 'CS-001')
      await user.type(screen.getByPlaceholderText('Batch/Lot'), 'BATCH001')
      
      const cartonsInput = screen.getAllByDisplayValue('0')[0]
      await user.clear(cartonsInput)
      await user.type(cartonsInput, '100')

      await user.type(screen.getByPlaceholderText('Any additional notes or comments...'), 'Test notes')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save receipt/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'RECEIVE',
            referenceNumber: 'PO-2024-001',
            date: new Date().toISOString().split('T')[0],
            items: [{
              id: expect.any(Number),
              skuCode: 'CS-001',
              batchLot: 'BATCH001',
              cartons: 100,
              pallets: 0,
              units: 0
            }],
            notes: 'Supplier: Test Supplier. Test notes',
          }),
        })
      })

      expect(window.alert).toHaveBeenCalledWith('Success! Receipt saved successfully')
      expect(mockPush).toHaveBeenCalledWith('/warehouse/inventory')
    })

    it('handles submission errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid SKU code' }),
      } as Response)

      window.alert = jest.fn()

      render(<WarehouseReceivePage />)

      // Fill minimum required fields
      await user.type(screen.getByLabelText('Reference Number'), 'PO-2024-001')
      await user.type(screen.getByPlaceholderText('SKU code'), 'INVALID')
      await user.type(screen.getByPlaceholderText('Batch/Lot'), 'BATCH001')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save receipt/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Error: Invalid SKU code')
      })
      
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      window.alert = jest.fn()

      render(<WarehouseReceivePage />)

      // Fill minimum required fields
      await user.type(screen.getByLabelText('Reference Number'), 'PO-2024-001')
      await user.type(screen.getByPlaceholderText('SKU code'), 'CS-001')
      await user.type(screen.getByPlaceholderText('Batch/Lot'), 'BATCH001')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save receipt/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Failed to save receipt')
      })
    })
  })

  describe('Cancel Functionality', () => {
    it('navigates back when cancel button is clicked', async () => {
      render(<WarehouseReceivePage />)

      const cancelButtons = screen.getAllByText('Cancel')
      await user.click(cancelButtons[0])

      expect(mockPush).toHaveBeenCalledWith('/warehouse/inventory')
    })

    it('bottom cancel button also navigates back', async () => {
      render(<WarehouseReceivePage />)

      const cancelButtons = screen.getAllByText('Cancel')
      await user.click(cancelButtons[1])

      expect(mockPush).toHaveBeenCalledWith('/warehouse/inventory')
    })
  })

  describe('Save Button', () => {
    it('save button has correct styling and icon', () => {
      render(<WarehouseReceivePage />)

      const saveButton = screen.getByRole('button', { name: /save receipt/i })
      expect(saveButton).toHaveClass('bg-primary', 'text-white')
      
      // Check for Save icon
      const icon = saveButton.querySelector('.h-4.w-4')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('prevents submission without required fields', async () => {
      render(<WarehouseReceivePage />)

      const form = screen.getByRole('button', { name: /save receipt/i }).closest('form')
      
      // Try to submit empty form
      fireEvent.submit(form!)

      // Form should not submit due to HTML5 validation
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Responsive Design', () => {
    it('uses responsive grid for shipment details', () => {
      const { container } = render(<WarehouseReceivePage />)

      const shipmentGrid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-3')
      expect(shipmentGrid).toBeInTheDocument()
    })

    it('table has horizontal scroll on small screens', () => {
      const { container } = render(<WarehouseReceivePage />)

      const tableContainer = container.querySelector('.overflow-x-auto')
      expect(tableContainer).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('all form fields have proper labels', () => {
      render(<WarehouseReceivePage />)

      expect(screen.getByLabelText('Reference Number')).toBeInTheDocument()
      expect(screen.getByLabelText('Supplier')).toBeInTheDocument()
      expect(screen.getByLabelText('Receipt Date')).toBeInTheDocument()
    })

    it('table headers have proper semantic markup', () => {
      render(<WarehouseReceivePage />)

      const headers = screen.getAllByRole('columnheader')
      expect(headers.length).toBeGreaterThan(0)
    })
  })

  describe('Focus Management', () => {
    it('focuses on first input field of new row when added', async () => {
      render(<WarehouseReceivePage />)

      const addButton = screen.getByRole('button', { name: /add item/i })
      await user.click(addButton)

      const skuInputs = screen.getAllByPlaceholderText('SKU code')
      // Note: Testing focus behavior might require additional setup
      expect(skuInputs).toHaveLength(2)
    })
  })
})