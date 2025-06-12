import { DynamicExporter } from '@/lib/dynamic-export';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    inventory: {
      findMany: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    warehouse: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('xlsx');

describe('DynamicExporter', () => {
  let exporter: DynamicExporter;

  beforeEach(() => {
    exporter = new DynamicExporter();
    jest.clearAllMocks();
  });

  describe('exportToExcel', () => {
    it('should export inventory data with default options', async () => {
      const mockInventory = [
        {
          id: '1',
          warehouse: { name: 'Warehouse A' },
          product: { 
            skuCode: 'SKU001', 
            description: 'Product 1',
            attributes: []
          },
          batchLot: 'BATCH001',
          cartons: 100,
          pallets: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      (prisma.inventory.findMany as jest.Mock).mockResolvedValue(mockInventory);

      const mockWorkbook = { 
        SheetNames: [], 
        Sheets: {},
        Props: {},
        Custprops: {},
        Workbook: {}
      };
      const mockBuffer = Buffer.from('test');
      
      (XLSX.utils.json_to_sheet as jest.Mock).mockReturnValue({});
      (XLSX.utils.book_new as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.book_append_sheet as jest.Mock).mockImplementation(() => {});
      (XLSX.write as jest.Mock).mockReturnValue(mockBuffer);

      const result = await exporter.exportToExcel('inventory');

      expect(prisma.inventory.findMany).toHaveBeenCalledWith({
        include: {
          warehouse: true,
          product: {
            include: {
              attributes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalled();
      expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
        mockWorkbook,
        expect.any(Object),
        'Inventory'
      );
      expect(result).toEqual(mockBuffer);
    });

    it('should export transactions with filters', async () => {
      const mockTransactions = [
        {
          id: 'T1',
          type: 'RECEIVE',
          warehouse: { name: 'Warehouse A' },
          product: { skuCode: 'SKU001', description: 'Product 1' },
          batchLot: 'BATCH001',
          cartonsIn: 50,
          cartonsOut: 0,
          palletsIn: 2,
          palletsOut: 0,
          createdAt: new Date('2024-01-01'),
        },
      ];

      (prisma.transaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);

      const filters = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        warehouseId: 'warehouse-1',
      };

      await exporter.exportToExcel('transactions', { filters });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              createdAt: {
                gte: filters.dateFrom,
                lte: filters.dateTo,
              },
            },
            { warehouseId: filters.warehouseId },
          ],
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle custom columns configuration', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      (prisma.inventory.findMany as jest.Mock).mockResolvedValue(mockData);

      const columns = [
        { field: 'id', header: 'ID' },
        { field: 'name', header: 'Name' },
      ];

      await exporter.exportToExcel('inventory', { columns });

      const sheetCall = (XLSX.utils.json_to_sheet as jest.Mock).mock.calls[0];
      expect(sheetCall[1]).toEqual({
        header: ['ID', 'Name'],
      });
    });

    it('should throw error for unsupported entity type', async () => {
      await expect(
        exporter.exportToExcel('unsupported' as any)
      ).rejects.toThrow('Unsupported entity type: unsupported');
    });

    it('should handle empty data gracefully', async () => {
      (prisma.inventory.findMany as jest.Mock).mockResolvedValue([]);

      const result = await exporter.exportToExcel('inventory');

      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(
        [],
        expect.any(Object)
      );
      expect(result).toBeDefined();
    });
  });

  describe('exportToCSV', () => {
    it('should export data to CSV format', async () => {
      const mockInventory = [
        {
          warehouse: { name: 'Warehouse A' },
          product: { skuCode: 'SKU001', description: 'Product 1' },
          batchLot: 'BATCH001',
          cartons: 100,
        },
      ];

      (prisma.inventory.findMany as jest.Mock).mockResolvedValue(mockInventory);

      const mockCSV = 'Warehouse,SKU,Description,Batch/Lot,Cartons\\nWarehouse A,SKU001,Product 1,BATCH001,100';
      (XLSX.utils.sheet_to_csv as jest.Mock).mockReturnValue(mockCSV);

      const result = await exporter.exportToCSV('inventory');

      expect(result).toBe(mockCSV);
      expect(XLSX.utils.sheet_to_csv).toHaveBeenCalled();
    });
  });

  describe('getExportFileName', () => {
    it('should generate correct filename with timestamp', () => {
      const mockDate = new Date('2024-06-12T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const filename = exporter.getExportFileName('inventory', 'xlsx');
      
      expect(filename).toBe('inventory_export_2024-06-12_10-30-00.xlsx');

      jest.restoreAllMocks();
    });

    it('should handle custom prefix', () => {
      const filename = exporter.getExportFileName('custom_report', 'csv');
      
      expect(filename).toMatch(/^custom_report_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
    });
  });
});