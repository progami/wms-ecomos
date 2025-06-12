import { POST } from '@/app/api/import/inventory/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    inventory: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock('xlsx');

describe('POST /api/import/inventory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
  });

  it('should successfully import inventory from Excel file', async () => {
    const mockFile = new File(['test'], 'inventory.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      },
    };

    const mockData = [
      {
        'Warehouse': 'WH001',
        'SKU Code': 'SKU001',
        'Batch/Lot': 'BATCH001',
        'Cartons': 100,
        'Type': 'RECEIVE',
        'Reference': 'REF001',
      },
    ];

    (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue({ id: 'warehouse-1' });
    (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'product-1' });
    (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.inventory.create as jest.Mock).mockResolvedValue({ id: 'inv-1' });
    (prisma.transaction.create as jest.Mock).mockResolvedValue({ id: 'trans-1' });

    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('mappings', JSON.stringify({
      warehouseCode: 'Warehouse',
      skuCode: 'SKU Code',
      batchLot: 'Batch/Lot',
      cartons: 'Cartons',
      transactionType: 'Type',
      reference: 'Reference',
    }));

    const request = new NextRequest('http://localhost:3000/api/import/inventory', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toEqual({
      success: true,
      imported: 1,
      failed: 0,
      errors: [],
    });

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'RECEIVE',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        batchLot: 'BATCH001',
        cartonsIn: 100,
        reference: 'REF001',
        createdBy: 'user-1',
      }),
    });
  });

  it('should validate file type', async () => {
    const mockFile = new File(['test'], 'inventory.txt', {
      type: 'text/plain',
    });

    const formData = new FormData();
    formData.append('file', mockFile);

    const request = new NextRequest('http://localhost:3000/api/import/inventory', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toContain('Invalid file type');
  });

  it('should handle missing required fields', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      },
    };

    const mockData = [
      {
        'Warehouse': 'WH001',
        // Missing SKU Code
        'Cartons': 100,
      },
    ];

    (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    const mockFile = new File(['test'], 'inventory.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('mappings', JSON.stringify({
      warehouseCode: 'Warehouse',
      skuCode: 'SKU Code',
      cartons: 'Cartons',
    }));

    const request = new NextRequest('http://localhost:3000/api/import/inventory', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.errors[0].message).toContain('required');
  });

  it('should handle invalid warehouse codes', async () => {
    const mockData = [
      {
        'Warehouse': 'INVALID',
        'SKU Code': 'SKU001',
        'Cartons': 100,
      },
    ];

    (XLSX.read as jest.Mock).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    });
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);
    (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue(null);

    const mockFile = new File(['test'], 'inventory.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('mappings', JSON.stringify({
      warehouseCode: 'Warehouse',
      skuCode: 'SKU Code',
      cartons: 'Cartons',
    }));

    const request = new NextRequest('http://localhost:3000/api/import/inventory', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(result.errors[0].message).toContain('Warehouse code not found');
  });

  it('should handle bulk imports with batching', async () => {
    const mockData = Array(100).fill(null).map((_, index) => ({
      'Warehouse': 'WH001',
      'SKU Code': `SKU${index.toString().padStart(3, '0')}`,
      'Batch/Lot': 'BATCH001',
      'Cartons': 10,
      'Type': 'RECEIVE',
    }));

    (XLSX.read as jest.Mock).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    });
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

    (prisma.warehouse.findFirst as jest.Mock).mockResolvedValue({ id: 'warehouse-1' });
    (prisma.product.findFirst as jest.Mock).mockResolvedValue({ id: 'product-1' });
    (prisma.inventory.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.inventory.create as jest.Mock).mockResolvedValue({ id: 'inv-1' });
    (prisma.transaction.createMany as jest.Mock).mockResolvedValue({ count: 100 });

    const mockFile = new File(['test'], 'inventory.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('mappings', JSON.stringify({
      warehouseCode: 'Warehouse',
      skuCode: 'SKU Code',
      batchLot: 'Batch/Lot',
      cartons: 'Cartons',
      transactionType: 'Type',
    }));

    const request = new NextRequest('http://localhost:3000/api/import/inventory', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.imported).toBe(100);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should require authentication', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/import/inventory', {
      method: 'POST',
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should handle database errors gracefully', async () => {
    const mockData = [
      {
        'Warehouse': 'WH001',
        'SKU Code': 'SKU001',
        'Cartons': 100,
      },
    ];

    (XLSX.read as jest.Mock).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    });
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);
    (prisma.warehouse.findFirst as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    const mockFile = new File(['test'], 'inventory.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('mappings', JSON.stringify({
      warehouseCode: 'Warehouse',
      skuCode: 'SKU Code',
      cartons: 'Cartons',
    }));

    const request = new NextRequest('http://localhost:3000/api/import/inventory', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.error).toContain('Import failed');
  });
});