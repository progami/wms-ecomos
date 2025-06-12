import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PATCH } from '@/app/api/invoices/route';
import { getServerSession } from 'next-auth';
import { getWarehouseFilter } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/auth-utils');
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    invoice: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('Invoice API Routes', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
    },
  };

  const mockWarehouse = {
    id: 'warehouse-1',
    code: 'WH001',
    name: 'Warehouse A',
  };

  const mockInvoice = {
    id: 'invoice-1',
    invoiceNumber: 'INV-2024-001',
    warehouseId: 'warehouse-1',
    warehouse: mockWarehouse,
    billingPeriodStart: new Date('2024-01-01'),
    billingPeriodEnd: new Date('2024-01-31'),
    invoiceDate: new Date('2024-02-01'),
    dueDate: new Date('2024-02-15'),
    totalAmount: 1500.00,
    status: 'pending',
    lineItems: [
      {
        id: 'item-1',
        costCategory: 'Storage',
        costName: 'Weekly Pallet Storage',
        quantity: 100,
        unitRate: 5.50,
        amount: 550.00,
      },
      {
        id: 'item-2',
        costCategory: 'Carton',
        costName: 'Inbound Carton Handling',
        quantity: 200,
        unitRate: 0.50,
        amount: 100.00,
      },
    ],
    reconciliations: [],
    createdBy: {
      id: 'user-123',
      fullName: 'Test User',
      email: 'test@example.com',
    },
    createdAt: new Date('2024-02-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (getWarehouseFilter as jest.Mock).mockReturnValue({ warehouseId: 'warehouse-1' });
  });

  describe('GET /api/invoices', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/invoices');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if no warehouse access', async () => {
      (getWarehouseFilter as jest.Mock).mockReturnValue(null);

      const request = new NextRequest('http://localhost/api/invoices');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('No warehouse access');
    });

    it('should return invoices with default pagination', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);

      const request = new NextRequest('http://localhost/api/invoices');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoices).toHaveLength(1);
      expect(data.invoices[0]).toEqual(mockInvoice);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        totalCount: 1,
        totalPages: 1,
      });

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: { warehouseId: 'warehouse-1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should handle search parameter', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);

      const request = new NextRequest('http://localhost/api/invoices?search=INV-2024');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: {
          warehouseId: 'warehouse-1',
          OR: [
            { invoiceNumber: { contains: 'INV-2024', mode: 'insensitive' } },
            { warehouse: { name: { contains: 'INV-2024', mode: 'insensitive' } } },
            { totalAmount: { equals: NaN } }, // parseFloat('INV-2024') returns NaN
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should handle status filter with single value', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);

      const request = new NextRequest('http://localhost/api/invoices?status=pending');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: {
          warehouseId: 'warehouse-1',
          status: 'pending',
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should handle status filter with multiple values', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(2);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);

      const request = new NextRequest('http://localhost/api/invoices?status=pending,paid');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: {
          warehouseId: 'warehouse-1',
          status: { in: ['pending', 'paid'] },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should handle date range filters', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);

      const request = new NextRequest(
        'http://localhost/api/invoices?startDate=2024-01-01&endDate=2024-02-29'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: {
          warehouseId: 'warehouse-1',
          invoiceDate: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-02-29'),
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should handle pagination parameters', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(25);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/invoices?page=3&limit=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: { warehouseId: 'warehouse-1' },
        skip: 10, // (3-1) * 5
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
      expect(data.pagination).toEqual({
        page: 3,
        limit: 5,
        totalCount: 25,
        totalPages: 5,
      });
    });

    it('should include all necessary relations', async () => {
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);

      const request = new NextRequest('http://localhost/api/invoices');
      await GET(request);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouse: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          lineItems: true,
          reconciliations: {
            include: {
              resolvedBy: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });
    });
  });

  describe('POST /api/invoices', () => {
    const validInvoiceData = {
      invoiceNumber: 'INV-2024-002',
      warehouseId: 'warehouse-1',
      billingPeriodStart: '2024-02-01T00:00:00Z',
      billingPeriodEnd: '2024-02-29T23:59:59Z',
      invoiceDate: '2024-03-01T00:00:00Z',
      dueDate: '2024-03-15T00:00:00Z',
      totalAmount: 2500.00,
      lineItems: [
        {
          costCategory: 'Storage',
          costName: 'Weekly Pallet Storage',
          quantity: 200,
          unitRate: 5.50,
          amount: 1100.00,
        },
        {
          costCategory: 'Container',
          costName: 'Container Unloading',
          quantity: 2,
          unitRate: 150.00,
          amount: 300.00,
        },
      ],
    };

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = {
        json: async () => validInvoiceData,
      } as NextRequest;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if no warehouse access', async () => {
      (getWarehouseFilter as jest.Mock).mockReturnValue(null);

      const request = {
        json: async () => validInvoiceData,
      } as NextRequest;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied to this warehouse');
    });

    it('should create invoice successfully', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.invoice.create as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        id: 'invoice-2',
        invoiceNumber: 'INV-2024-002',
      });

      const request = {
        json: async () => validInvoiceData,
      } as NextRequest;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.invoiceNumber).toBe('INV-2024-002');
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: {
          invoiceNumber: 'INV-2024-002',
          warehouseId: 'warehouse-1',
          billingPeriodStart: new Date('2024-02-01T00:00:00Z'),
          billingPeriodEnd: new Date('2024-02-29T23:59:59Z'),
          invoiceDate: new Date('2024-03-01T00:00:00Z'),
          dueDate: new Date('2024-03-15T00:00:00Z'),
          totalAmount: 2500.00,
          createdById: 'user-123',
          lineItems: {
            create: validInvoiceData.lineItems,
          },
        },
        include: expect.any(Object),
      });
    });

    it('should handle idempotent requests', async () => {
      const existingInvoice = {
        ...mockInvoice,
        invoiceNumber: 'INV-2024-002',
        warehouseId: 'warehouse-1',
        totalAmount: 2500.00,
        lineItems: validInvoiceData.lineItems,
      };

      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(existingInvoice);

      const request = {
        json: async () => validInvoiceData,
      } as NextRequest;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invoice).toEqual(existingInvoice);
      expect(data.idempotent).toBe(true);
      expect(data.message).toBe('Invoice already exists with this number');
      expect(response.headers.get('X-Idempotent-Response')).toBe('true');
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('should return 409 for duplicate invoice number with different details', async () => {
      const existingInvoice = {
        ...mockInvoice,
        invoiceNumber: 'INV-2024-002',
        totalAmount: 1000.00, // Different amount
      };

      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(existingInvoice);

      const request = {
        json: async () => validInvoiceData,
      } as NextRequest;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Invoice number already exists with different details');
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        invoiceNumber: '', // Empty string
        warehouseId: 'not-a-uuid',
        totalAmount: -100, // Negative amount
      };

      const request = {
        json: async () => invalidData,
      } as NextRequest;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid data');
      expect(data.details).toBeDefined();
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('should handle optional due date', async () => {
      const dataWithoutDueDate = {
        ...validInvoiceData,
        dueDate: undefined,
      };

      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.invoice.create as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        dueDate: null,
      });

      const request = {
        json: async () => dataWithoutDueDate,
      } as NextRequest;
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dueDate: null,
        }),
        include: expect.any(Object),
      });
    });

    it('should validate cost categories', async () => {
      const invalidCategoryData = {
        ...validInvoiceData,
        lineItems: [
          {
            costCategory: 'InvalidCategory',
            costName: 'Test',
            quantity: 1,
            amount: 100,
          },
        ],
      };

      const request = {
        json: async () => invalidCategoryData,
      } as NextRequest;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid data');
    });
  });

  describe('PATCH /api/invoices', () => {
    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = {
        nextUrl: { searchParams: new URLSearchParams({ id: 'invoice-1' }) },
        json: async () => ({ status: 'paid' }),
      } as unknown as NextRequest;
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if invoice ID is missing', async () => {
      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
        json: async () => ({ status: 'paid' }),
      } as unknown as NextRequest;
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invoice ID is required');
    });

    it('should update invoice status successfully', async () => {
      const updatedInvoice = {
        ...mockInvoice,
        status: 'paid',
        updatedAt: new Date(),
      };

      (prisma.invoice.update as jest.Mock).mockResolvedValue(updatedInvoice);

      const request = {
        nextUrl: { searchParams: new URLSearchParams({ id: 'invoice-1' }) },
        json: async () => ({ status: 'paid' }),
      } as unknown as NextRequest;
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('paid');
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: {
          status: 'paid',
          dueDate: undefined,
          updatedAt: expect.any(Date),
        },
        include: {
          warehouse: true,
          lineItems: true,
          reconciliations: true,
        },
      });
    });

    it('should update due date successfully', async () => {
      const newDueDate = '2024-03-31T00:00:00Z';
      const updatedInvoice = {
        ...mockInvoice,
        dueDate: new Date(newDueDate),
      };

      (prisma.invoice.update as jest.Mock).mockResolvedValue(updatedInvoice);

      const request = {
        nextUrl: { searchParams: new URLSearchParams({ id: 'invoice-1' }) },
        json: async () => ({ dueDate: newDueDate }),
      } as unknown as NextRequest;
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: {
          status: undefined,
          dueDate: new Date(newDueDate),
          updatedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should validate status values', async () => {
      const request = {
        nextUrl: { searchParams: new URLSearchParams({ id: 'invoice-1' }) },
        json: async () => ({ status: 'invalid-status' }),
      } as unknown as NextRequest;
      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid data');
    });

    it('should update both status and due date', async () => {
      const updateData = {
        status: 'reconciled',
        dueDate: '2024-04-15T00:00:00Z',
      };

      const updatedInvoice = {
        ...mockInvoice,
        status: 'reconciled',
        dueDate: new Date(updateData.dueDate),
      };

      (prisma.invoice.update as jest.Mock).mockResolvedValue(updatedInvoice);

      const request = {
        nextUrl: { searchParams: new URLSearchParams({ id: 'invoice-1' }) },
        json: async () => updateData,
      } as unknown as NextRequest;
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: {
          status: 'reconciled',
          dueDate: new Date(updateData.dueDate),
          updatedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database errors in GET', async () => {
      (prisma.invoice.count as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/invoices');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch invoices');
    });

    it('should handle database errors in POST', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.invoice.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = {
        json: async () => validInvoiceData,
      } as NextRequest;
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create invoice');
    });
  });
});