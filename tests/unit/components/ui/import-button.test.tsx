import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportButton } from '@/components/ui/import-button';
import { toast } from 'react-hot-toast';
import * as importConfig from '@/lib/import-config';

// Mock dependencies
jest.mock('react-hot-toast');
jest.mock('@/lib/import-config');

// Mock fetch
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = jest.fn();

describe('ImportButton Component', () => {
  const mockConfig = {
    displayName: 'Products',
    fieldMappings: [
      { excelColumns: ['SKU'], required: true },
      { excelColumns: ['Name'], required: true },
      { excelColumns: ['Price'], required: false },
    ],
    uniqueFields: ['SKU'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (importConfig.getImportConfig as jest.Mock).mockReturnValue(mockConfig);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ result: { imported: 10, skipped: 2, errors: [] } }),
      blob: async () => new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    });
  });

  describe('Rendering', () => {
    it('renders the import button', () => {
      render(<ImportButton entityName="products" />);
      
      expect(screen.getByRole('button', { name: /Import Products/i })).toBeInTheDocument();
      expect(screen.getByText('Import Products')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<ImportButton entityName="products" className="custom-class" />);
      
      const button = screen.getByRole('button', { name: /Import Products/i });
      expect(button).toHaveClass('custom-class');
    });

    it('renders nothing when config is not found', () => {
      (importConfig.getImportConfig as jest.Mock).mockReturnValue(null);
      
      const { container } = render(<ImportButton entityName="unknown" />);
      expect(container).toBeEmptyDOMElement();
    });

    it('shows upload icon in button', () => {
      render(<ImportButton entityName="products" />);
      
      const button = screen.getByRole('button', { name: /Import Products/i });
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Modal behavior', () => {
    it('opens modal when button is clicked', () => {
      render(<ImportButton entityName="products" />);
      
      const button = screen.getByRole('button', { name: /Import Products/i });
      fireEvent.click(button);
      
      expect(screen.getByText('Import Products')).toBeInTheDocument();
      expect(screen.getByText('Import Instructions:')).toBeInTheDocument();
    });

    it('closes modal when close button is clicked', () => {
      render(<ImportButton entityName="products" />);
      
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const closeButton = screen.getByRole('button', { name: '' }); // X button
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('Import Instructions:')).not.toBeInTheDocument();
    });

    it('closes modal when backdrop is clicked', () => {
      render(<ImportButton entityName="products" />);
      
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const backdrop = document.querySelector('.bg-gray-500');
      fireEvent.click(backdrop!);
      
      expect(screen.queryByText('Import Instructions:')).not.toBeInTheDocument();
    });

    it('closes modal when cancel button is clicked', () => {
      render(<ImportButton entityName="products" />);
      
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('Import Instructions:')).not.toBeInTheDocument();
    });
  });

  describe('Import instructions', () => {
    it('displays required fields', () => {
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      expect(screen.getByText(/Required columns: SKU, Name/)).toBeInTheDocument();
    });

    it('displays unique fields information', () => {
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      expect(screen.getByText(/Duplicate records will be updated based on: SKU/)).toBeInTheDocument();
    });

    it('displays file format requirements', () => {
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      expect(screen.getByText(/File must be in Excel format/)).toBeInTheDocument();
      expect(screen.getByText(/First row should contain column headers/)).toBeInTheDocument();
    });
  });

  describe('Template download', () => {
    it('downloads template when button is clicked', async () => {
      const mockCreateElement = jest.spyOn(document, 'createElement');
      const mockClick = jest.fn();
      mockCreateElement.mockReturnValue({ click: mockClick } as any);
      
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const templateButton = screen.getByRole('button', { name: /Template/i });
      fireEvent.click(templateButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/import/template?entity=products');
        expect(mockClick).toHaveBeenCalled();
      });
      
      mockCreateElement.mockRestore();
    });

    it('shows error toast when template download fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const templateButton = screen.getByRole('button', { name: /Template/i });
      fireEvent.click(templateButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to download template');
      });
    });
  });

  describe('File selection', () => {
    it('accepts Excel files', async () => {
      const user = userEvent.setup();
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      expect(screen.getByText(/Selected: test.xlsx/)).toBeInTheDocument();
    });

    it('shows file size', async () => {
      const user = userEvent.setup();
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['x'.repeat(1024 * 1024)], 'large.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      expect(screen.getByText(/1.00 MB/)).toBeInTheDocument();
    });

    it('rejects non-Excel files', async () => {
      const user = userEvent.setup();
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      expect(toast.error).toHaveBeenCalledWith('Please select a valid Excel file');
      expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
    });

    it('accepts .xls files', async () => {
      const user = userEvent.setup();
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['test'], 'test.xls', {
        type: 'application/vnd.ms-excel'
      });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      expect(screen.getByText(/Selected: test.xls/)).toBeInTheDocument();
    });
  });

  describe('Import process', () => {
    it('imports file successfully', async () => {
      const user = userEvent.setup();
      const onImportComplete = jest.fn();
      
      render(<ImportButton entityName="products" onImportComplete={onImportComplete} />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      const importButton = screen.getByRole('button', { name: 'Import' });
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Import completed: 10 records imported');
        expect(onImportComplete).toHaveBeenCalled();
      });
    });

    it('shows error when no file is selected', () => {
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const importButton = screen.getByRole('button', { name: 'Import' });
      fireEvent.click(importButton);
      
      expect(toast.error).toHaveBeenCalledWith('Please select a file to import');
    });

    it('shows importing state', async () => {
      const user = userEvent.setup();
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      const importButton = screen.getByRole('button', { name: 'Import' });
      fireEvent.click(importButton);
      
      expect(screen.getByText('Importing...')).toBeInTheDocument();
      expect(importButton).toBeDisabled();
    });

    it('handles import errors', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Import failed due to invalid data' }),
      });
      
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      const importButton = screen.getByRole('button', { name: 'Import' });
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Import failed due to invalid data');
      });
    });
  });

  describe('Import results', () => {
    it('displays successful import results', async () => {
      const user = userEvent.setup();
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      const importButton = screen.getByRole('button', { name: 'Import' });
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(screen.getByText('Import Results')).toBeInTheDocument();
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument(); // imported count
        expect(screen.getByText('2')).toBeInTheDocument(); // skipped count
      });
    });

    it('displays partial success with errors', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            imported: 8,
            skipped: 2,
            errors: ['Row 3: Invalid SKU', 'Row 5: Missing name']
          }
        }),
      });
      
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      const importButton = screen.getByRole('button', { name: 'Import' });
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(screen.getByText('Partial Success')).toBeInTheDocument();
        expect(screen.getByText('Row 3: Invalid SKU')).toBeInTheDocument();
        expect(screen.getByText('Row 5: Missing name')).toBeInTheDocument();
      });
    });

    it('truncates long error lists', async () => {
      const user = userEvent.setup();
      const errors = Array(10).fill(null).map((_, i) => `Row ${i + 1}: Error`);
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { imported: 5, skipped: 5, errors }
        }),
      });
      
      render(<ImportButton entityName="products" />);
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      const importButton = screen.getByRole('button', { name: 'Import' });
      fireEvent.click(importButton);
      
      await waitFor(() => {
        expect(screen.getByText('...and 5 more errors')).toBeInTheDocument();
      });
    });
  });

  describe('State management', () => {
    it('resets state when modal is closed and reopened', async () => {
      const user = userEvent.setup();
      render(<ImportButton entityName="products" />);
      
      // Open modal and select file
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const input = screen.getByLabelText(/Select Excel file/i);
      await user.upload(input, file);
      
      expect(screen.getByText(/Selected: test.xlsx/)).toBeInTheDocument();
      
      // Close modal
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      
      // Reopen modal
      fireEvent.click(screen.getByRole('button', { name: /Import Products/i }));
      
      // File should be reset
      expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
    });
  });
});