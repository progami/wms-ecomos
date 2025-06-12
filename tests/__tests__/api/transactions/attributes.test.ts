import { NextRequest, NextResponse } from 'next/server';
import { PATCH } from '@/app/api/transactions/[id]/attributes/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    inventoryTransaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    inventoryBalance: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('PATCH /api/transactions/[id]/attributes', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  const mockTransaction = {
    id: 'trans-123',
    warehouseId: 'warehouse-1',
    skuId: 'sku-1',
    batchLot: 'BATCH001',
    transactionType: 'RECEIVE',
    transactionDate: new Date('2024-01-01'),
    cartonsIn: 100,
    cartonsOut: 0,
    storagePalletsIn: 10,
    shippingPalletsOut: 0,
    shipName: 'Original Ship',
    trackingNumber: 'TRACK001',
    pickupDate: null,
    notes: null,
    referenceId: 'REF001',
    attachments: null,
    storageCartonsPerPallet: 10,
    shippingCartonsPerPallet: 10,
    warehouse: { id: 'warehouse-1', name: 'Warehouse A' },
    sku: { 
      id: 'sku-1', 
      skuCode: 'SKU001', 
      description: 'Product 1',
      unitsPerCarton: 24
    },
  };

  const mockInventoryBalance = {
    id: 'balance-1',
    warehouseId: 'warehouse-1',
    skuId: 'sku-1',
    batchLot: 'BATCH001',
    currentCartons: 100,
    currentPallets: 10,
    currentUnits: 2400,
    storageCartonsPerPallet: 10,
    shippingCartonsPerPallet: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.inventoryTransaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction);
    (prisma.inventoryBalance.findFirst as jest.Mock).mockResolvedValue(mockInventoryBalance);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(prisma);
    });
  });

  const createRequest = (body: any) => {
    return {
      json: async () => body,
    } as NextRequest;
  };

  describe('Authentication', () => {
    it('should return 401 if no session exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createRequest({});
      const response = await PATCH(request, { params: { id: 'trans-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Transaction validation', () => {
    it('should return 404 if transaction not found', async () => {
      (prisma.inventoryTransaction.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createRequest({ shipName: 'New Ship' });
      const response = await PATCH(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Transaction not found');
    });
  });

  describe('Attribute updates', () => {
    it('should update basic attributes without affecting quantities', async () => {
      const updateData = {
        shipName: 'New Ship Name',
        trackingNumber: 'TRACK002',
        notes: 'Updated notes',
        referenceId: 'REF002',
      };

      const updatedTransaction = {
        ...mockTransaction,
        ...updateData,
        updatedAt: new Date(),
      };

      (prisma.inventoryTransaction.update as jest.Mock).mockResolvedValue(updatedTransaction);

      const request = createRequest(updateData);
      const response = await PATCH(request, { params: { id: 'trans-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Transaction updated successfully');
      
      // Verify update was called with correct data
      expect(prisma.inventoryTransaction.update).toHaveBeenCalledWith({
        where: { id: 'trans-123' },
        data: expect.objectContaining({
          shipName: 'New Ship Name',
          trackingNumber: 'TRACK002',
          notes: 'Updated notes',
          referenceId: 'REF002',
        }),
        include: expect.any(Object),
      });

      // Verify inventory balance was not updated
      expect(prisma.inventoryBalance.update).not.toHaveBeenCalled();
    });

    it('should handle pickup date conversion', async () => {
      const updateData = {
        pickupDate: '2024-01-15T10:00:00Z',
      };

      (prisma.inventoryTransaction.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        pickupDate: new Date('2024-01-15T10:00:00Z'),
      });

      const request = createRequest(updateData);
      const response = await PATCH(request, { params: { id: 'trans-123' } });

      expect(response.status).toBe(200);
      expect(prisma.inventoryTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pickupDate: new Date('2024-01-15T10:00:00Z'),
          }),
        })
      );
    });

    it('should handle null pickup date', async () => {
      const updateData = {
        pickupDate: null,
      };

      (prisma.inventoryTransaction.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        pickupDate: null,
      });

      const request = createRequest(updateData);
      const response = await PATCH(request, { params: { id: 'trans-123' } });

      expect(response.status).toBe(200);
      expect(prisma.inventoryTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pickupDate: null,
          }),
        })
      );
    });
  });

  describe('Quantity updates', () => {
    it('should update quantities and inventory balance', async () => {
      const updateData = {
        cartonsIn: 150, // Increase from 100 to 150
        storagePalletsIn: 15, // Increase from 10 to 15
      };

      const updatedTransaction = {
        ...mockTransaction,
        cartonsIn: 150,
        storagePalletsIn: 15,
      };

      (prisma.inventoryTransaction.update as jest.Mock).mockResolvedValue(updatedTransaction);
      (prisma.inventoryBalance.update as jest.Mock).mockResolvedValue({
        ...mockInventoryBalance,
        currentCartons: 150,
        currentPallets: 15,
        currentUnits: 3600,
      });

      const request = createRequest({
        ...updateData,
        auditReason: 'Quantity adjustment',
        oldValues: {
          cartons: 100,
          pallets: 10,
        },
      });
      const response = await PATCH(request, { params: { id: 'trans-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Transaction and inventory updated successfully');

      // Verify inventory balance was updated
      expect(prisma.inventoryBalance.update).toHaveBeenCalledWith({
        where: { id: 'balance-1' },
        data: expect.objectContaining({
          currentCartons: 150,
          currentPallets: 15,
          currentUnits: 3600,
        }),
      });
    });

    it('should prevent negative inventory on quantity reduction', async () => {
      const updateData = {
        cartonsIn: 50, // Reduce from 100 to 50, but balance is 100
      };

      // Mock current balance as 80 (some already shipped)
      (prisma.inventoryBalance.findFirst as jest.Mock).mockResolvedValue({
        ...mockInventoryBalance,
        currentCartons: 80,
      });

      const request = createRequest(updateData);
      const response = await PATCH(request, { params: { id: 'trans-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update attributes');
      expect(data.details).toContain('negative inventory');
    });

    it('should validate dependent shipments when reducing RECEIVE quantities', async () => {
      const updateData = {
        cartonsIn: 50, // Reduce from 100 to 50
      };

      // Mock that 60 cartons have already been shipped
      (prisma.inventoryTransaction.aggregate as jest.Mock).mockResolvedValue({
        _sum: { cartonsOut: 60 },
      });

      const request = createRequest(updateData);
      const response = await PATCH(request, { params: { id: 'trans-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update attributes');
      expect(data.details).toContain('60 cartons from batch');
      expect(data.details).toContain('have already been shipped');
    });

    it('should handle SHIP transaction quantity updates', async () => {
      const shipTransaction = {
        ...mockTransaction,
        transactionType: 'SHIP',
        cartonsIn: 0,
        cartonsOut: 50,
        storagePalletsIn: 0,
        shippingPalletsOut: 5,
      };

      (prisma.inventoryTransaction.findUnique as jest.Mock).mockResolvedValue(shipTransaction);

      const updateData = {
        cartonsOut: 30, // Reduce from 50 to 30
        shippingPalletsOut: 3, // Reduce from 5 to 3
      };

      const updatedTransaction = {
        ...shipTransaction,
        ...updateData,
      };

      (prisma.inventoryTransaction.update as jest.Mock).mockResolvedValue(updatedTransaction);
      (prisma.inventoryBalance.update as jest.Mock).mockResolvedValue({
        ...mockInventoryBalance,
        currentCartons: 120, // Returned 20 cartons
        currentPallets: 12, // Returned 2 pallets
      });

      const request = createRequest(updateData);
      const response = await PATCH(request, { params: { id: 'trans-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Audit logging', () => {
    it('should create audit log for changes', async () => {
      const updateData = {
        shipName: 'New Ship Name',
        trackingNumber: 'TRACK002',
        auditReason: 'Correcting ship information',
      };

      (prisma.inventoryTransaction.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        ...updateData,
      });

      const request = createRequest(updateData);
      const response = await PATCH(request, { params: { id: 'trans-123' } });

      expect(response.status).toBe(200);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tableName: 'inventory_transactions',
          recordId: 'trans-123',
          action: 'Correcting ship information',
          userId: 'user-123',
          changes: expect.objectContaining({
            before: expect.any(Object),
            after: expect.any(Object),
          }),
        }),
      });
    });

    it('should track quantity changes in audit log', async () => {
      const updateData = {
        cartonsIn: 150,
        oldValues: {
          cartons: 100,
          pallets: 10,
        },
        auditReason: 'Quantity correction',
      };

      (prisma.inventoryTransaction.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        cartonsIn: 150,
      });

      const request = createRequest(updateData);
      const response = await PATCH(request, { params: { id: 'trans-123' } });

      expect(response.status).toBe(200);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'Quantity correction',
          changes: expect.objectContaining({
            before: expect.objectContaining({ quantities: updateData.oldValues }),
            after: expect.objectContaining({
              quantities: expect.objectContaining({ cartons: 150 }),
            }),
          }),
        }),
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = createRequest({ shipName: 'New Ship' });
      const response = await PATCH(request, { params: { id: 'trans-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update attributes');
      expect(data.details).toBe('Database connection failed');
    });

    it('should handle missing inventory balance', async () => {
      (prisma.inventoryBalance.findFirst as jest.Mock).mockResolvedValue(null);

      const request = createRequest({ cartonsIn: 150 });
      const response = await PATCH(request, { params: { id: 'trans-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.details).toContain('Inventory balance not found');
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple field updates with attachments', async () => {
      const updateData = {
        shipName: 'New Ship',
        trackingNumber: 'TRACK002',
        pickupDate: '2024-01-15',
        notes: 'Updated notes',
        attachments: {
          packingList: 'packing.pdf',
          commercialInvoice: 'invoice.pdf',
        },
        storageCartonsPerPallet: 12,
        shippingCartonsPerPallet: 12,
      };

      (prisma.inventoryTransaction.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        ...updateData,
        pickupDate: new Date('2024-01-15'),
      });

      const request = createRequest(updateData);
      const response = await PATCH(request, { params: { id: 'trans-123' } });

      expect(response.status).toBe(200);
      expect(prisma.inventoryTransaction.update).toHaveBeenCalledWith({
        where: { id: 'trans-123' },
        data: expect.objectContaining({
          shipName: 'New Ship',
          trackingNumber: 'TRACK002',
          pickupDate: new Date('2024-01-15'),
          notes: 'Updated notes',
          attachments: updateData.attachments,
          storageCartonsPerPallet: 12,
          shippingCartonsPerPallet: 12,
        }),
        include: expect.any(Object),
      });
    });

    it('should update cartons per pallet in inventory balance when quantities change', async () => {
      const updateData = {
        cartonsIn: 120,
        storageCartonsPerPallet: 15,
      };

      (prisma.inventoryTransaction.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        cartonsIn: 120,
        storageCartonsPerPallet: 15,
      });

      const request = createRequest(updateData);
      const response = await PATCH(request, { params: { id: 'trans-123' } });

      expect(response.status).toBe(200);
      expect(prisma.inventoryBalance.update).toHaveBeenCalledWith({
        where: { id: 'balance-1' },
        data: expect.objectContaining({
          storageCartonsPerPallet: 15,
        }),
      });
    });
  });
});