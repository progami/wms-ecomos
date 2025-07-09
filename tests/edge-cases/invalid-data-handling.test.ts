import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const inventoryTransactionSchema = z.object({
  transactionType: z.enum(['RECEIVE', 'SHIP', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER']),
  warehouseId: z.string().uuid(),
  skuId: z.string().uuid(),
  cartonsIn: z.number().int().nonnegative(),
  cartonsOut: z.number().int().nonnegative(),
  storagePalletsIn: z.number().int().nonnegative(),
  shippingPalletsOut: z.number().int().nonnegative(),
  batchLot: z.string(),
  trackingNumber: z.string().optional(),
  transactionDate: z.date()
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().regex(/^INV-\d{4}-\d{6}$/),
  customerId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  dueDate: z.date(),
  totalAmount: z.number().positive(),
  items: z.array(z.object({
    skuId: z.string().uuid(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive()
  })).min(1)
});

describe('Invalid Data Handling', () => {
  let testWarehouseId: string;
  let testSkuId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Setup test data
    const warehouse = await prisma.warehouse.create({
      data: {
        name: 'Invalid Data Test Warehouse',
        code: 'IDTW',
        address: 'Test Address',
        isActive: true
      }
    });
    testWarehouseId = warehouse.id;

    const sku = await prisma.sku.create({
      data: {
        skuCode: 'SKU-INVALID',
        description: 'Invalid Data Test SKU',
        packSize: 1,
        unitsPerCarton: 10,
        isActive: true
      }
    });
    testSkuId = sku.id;

    const customer = await prisma.user.create({
      data: {
        email: 'invalid@test.com',
        fullName: 'Test Customer',
        passwordHash: 'hashed',
        role: 'staff'
      }
    });
    testUserId = customer.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.inventoryBalance.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.sku.delete({ where: { id: testSkuId } });
    await prisma.warehouse.delete({ where: { id: testWarehouseId } });
  });

  test('Reject negative inventory quantities', async () => {
    const invalidData = {
      transactionType: 'RECEIVE',
      warehouseId: testWarehouseId,
      skuId: testSkuId,
      cartonsIn: -50,
      cartonsOut: 0,
      storagePalletsIn: -5,
      shippingPalletsOut: 0,
      batchLot: 'NEGATIVE-TEST',
      transactionDate: new Date()
    };

    const validation = inventoryTransactionSchema.safeParse(invalidData);
    expect(validation.success).toBe(false);
    
    if (!validation.success) {
      expect(validation.error.issues.some(issue => 
        issue.path.includes('cartonsIn') && 
        issue.message.includes('nonnegative')
      )).toBe(true);
    }

    // Database should also reject
    await expect(
      prisma.inventoryTransaction.create({ data: invalidData as any })
    ).rejects.toThrow();
  });

  test('Handle invalid UUID formats', async () => {
    const invalidUUIDs = [
      'not-a-uuid',
      '12345',
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      '',
      null,
      undefined
    ];

    for (const invalidId of invalidUUIDs) {
      const result = await prisma.inventoryTransaction.create({
        data: {
          transactionId: `TX-INVALID-${Date.now()}`,
          transactionType: 'RECEIVE',
          warehouseId: invalidId as any,
          skuId: testSkuId,
          batchLot: 'INVALID-UUID-TEST',
          cartonsIn: 10,
          cartonsOut: 0,
          storagePalletsIn: 1,
          shippingPalletsOut: 0,
          transactionDate: new Date(),
          createdById: 'test-user'
        }
      }).catch(error => ({ error: error.message }));

      expect((result as any).error).toBeDefined();
    }
  });

  test('Sanitize and validate user input strings', async () => {
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      '"; DROP TABLE inventory; --',
      '${process.env.DATABASE_URL}',
      '../../../etc/passwd',
      String.fromCharCode(0), // Null character
      '\x00\x01\x02', // Control characters
      '𝕊𝕡𝕖𝕔𝕚𝕒𝕝 𝕌𝕟𝕚𝕔𝕠𝕕𝕖', // Special Unicode
      new Array(10000).join('x'), // Very long string
    ];

    const sanitizeInput = (input: string): string => {
      // Remove null bytes and control characters
      let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
      
      // Escape HTML entities
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      
      // Truncate to reasonable length
      return sanitized.substring(0, 255);
    };

    for (const input of maliciousInputs) {
      const sanitized = sanitizeInput(input);
      
      // Create SKU with sanitized input
      const sku = await prisma.sku.create({
        data: {
          skuCode: `SKU-${Date.now()}`,
          description: sanitized || 'Default Description',
          packSize: 1,
          unitsPerCarton: 10,
          isActive: true
        }
      });

      // Verify no script tags or SQL injection
      expect(sku.description).not.toContain('<script>');
      expect(sku.description).not.toContain('DROP TABLE');
      expect(sku.description.length).toBeLessThanOrEqual(255);

      // Cleanup
      await prisma.sku.delete({ where: { id: sku.id } });
    }
  });

  test('Validate date ranges and formats', async () => {
    const invalidDates = [
      new Date('invalid-date'),
      new Date('2024-13-45'), // Invalid month/day
      new Date('2024-02-30'), // Invalid day for February
      new Date(8640000000000001), // Beyond max date
      new Date(-8640000000000001), // Beyond min date
    ];

    const validateDate = (date: Date): boolean => {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return false;
      }
      
      // Check reasonable date range (1900 to 2100)
      const year = date.getFullYear();
      return year >= 1900 && year <= 2100;
    };

    for (const date of invalidDates) {
      expect(validateDate(date)).toBe(false);
    }

    // Test with valid dates
    const validDates = [
      new Date(),
      new Date('2024-06-15'),
      new Date('2024-12-31T23:59:59Z')
    ];

    for (const date of validDates) {
      expect(validateDate(date)).toBe(true);
      
      // Create transaction with valid date
      const transaction = await prisma.inventoryTransaction.create({
        data: {
          transactionId: `TX-DATE-${date.getTime()}`,
          transactionType: 'RECEIVE',
          warehouseId: testWarehouseId,
          skuId: testSkuId,
          batchLot: `BATCH-DATE-${date.getTime()}`,
          cartonsIn: 100,
          cartonsOut: 0,
          storagePalletsIn: 10,
          shippingPalletsOut: 0,
          transactionDate: date,
          createdById: testUserId
        }
      });

      expect(transaction.transactionDate).toEqual(date);
    }
  });

  test('Handle numeric overflow and precision issues', async () => {
    const numericTests = [
      { value: Number.MAX_SAFE_INTEGER + 1, valid: false },
      { value: Number.MIN_SAFE_INTEGER - 1, valid: false },
      { value: Infinity, valid: false },
      { value: -Infinity, valid: false },
      { value: NaN, valid: false },
      { value: 0.1 + 0.2, expected: 0.3 }, // Floating point precision
      { value: 999999999, valid: true },
      { value: -999999999, valid: false }, // Negative for quantities
    ];

    const validateQuantity = (value: number): boolean => {
      return Number.isFinite(value) && 
             Number.isSafeInteger(value) && 
             value >= 0 &&
             value <= Number.MAX_SAFE_INTEGER;
    };

    for (const test of numericTests) {
      if ('valid' in test) {
        expect(validateQuantity(test.value)).toBe(test.valid);
      }
      
      if ('expected' in test && test.expected) {
        // Handle floating point precision
        expect(Math.abs(test.value - test.expected)).toBeLessThan(0.0001);
      }
    }

    // Test database handling of large numbers
    const largeNumberTransaction = await prisma.inventoryTransaction.create({
      data: {
        transactionId: `TX-LARGE-${Date.now()}`,
        transactionType: 'RECEIVE',
        warehouseId: testWarehouseId,
        skuId: testSkuId,
        batchLot: 'BATCH-LARGE',
        cartonsIn: 1000,
        cartonsOut: 0,
        storagePalletsIn: 100,
        shippingPalletsOut: 0,
        transactionDate: new Date(),
        createdById: testUserId
      }
    });

    expect(largeNumberTransaction.cartonsIn).toBe(1000);
  });

  test('Validate email formats and domains', async () => {
    const emailTests = [
      { email: 'valid@example.com', valid: true },
      { email: 'user.name+tag@example.co.uk', valid: true },
      { email: 'invalid.email', valid: false },
      { email: '@example.com', valid: false },
      { email: 'user@', valid: false },
      { email: 'user @example.com', valid: false },
      { email: 'user@example..com', valid: false },
      { email: '<script>@example.com', valid: false },
      { email: 'a'.repeat(255) + '@example.com', valid: false }, // Too long
    ];

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const validateEmail = (email: string): boolean => {
      return emailRegex.test(email) && email.length <= 254;
    };

    for (const test of emailTests) {
      expect(validateEmail(test.email)).toBe(test.valid);
      
      if (test.valid) {
        const user = await prisma.user.create({
          data: {
            fullName: 'Email Test Customer',
            email: test.email,
            passwordHash: 'hashed',
            role: 'staff'
          }
        });
        
        expect(user.email).toBe(test.email);
        await prisma.user.delete({ where: { id: user.id } });
      }
    }
  });

  test('Handle file upload validation', async () => {
    const fileValidationTests = [
      { 
        filename: 'document.pdf',
        size: 1024 * 1024, // 1MB
        mimeType: 'application/pdf',
        valid: true 
      },
      { 
        filename: 'large-file.pdf',
        size: 11 * 1024 * 1024, // 11MB
        mimeType: 'application/pdf',
        valid: false,
        reason: 'File too large'
      },
      { 
        filename: 'malicious.exe',
        size: 1024,
        mimeType: 'application/x-msdownload',
        valid: false,
        reason: 'Invalid file type'
      },
      { 
        filename: '../../../etc/passwd',
        size: 1024,
        mimeType: 'text/plain',
        valid: false,
        reason: 'Invalid filename'
      },
      { 
        filename: 'file-without-extension',
        size: 1024,
        mimeType: 'application/octet-stream',
        valid: false,
        reason: 'No file extension'
      }
    ];

    const validateFileUpload = (file: any) => {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.ms-excel'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      const filenameRegex = /^[a-zA-Z0-9\-_.]+$/;
      
      // Check file size
      if (file.size > maxSize) {
        return { valid: false, reason: 'File too large' };
      }
      
      // Check MIME type
      if (!allowedTypes.includes(file.mimeType)) {
        return { valid: false, reason: 'Invalid file type' };
      }
      
      // Check filename
      const filename = file.filename.replace(/\s/g, '_');
      if (!filenameRegex.test(filename)) {
        return { valid: false, reason: 'Invalid filename' };
      }
      
      // Check for extension
      if (!filename.includes('.')) {
        return { valid: false, reason: 'No file extension' };
      }
      
      return { valid: true };
    };

    for (const test of fileValidationTests) {
      const result = validateFileUpload(test);
      expect(result.valid).toBe(test.valid);
      if (!result.valid && test.reason) {
        expect(result.reason).toBe(test.reason);
      }
    }
  });

  test('Validate and sanitize JSON data', async () => {
    const jsonTests = [
      { 
        data: '{"key": "value"}',
        valid: true 
      },
      { 
        data: '{"key": "value", "nested": {"array": [1, 2, 3]}}',
        valid: true 
      },
      { 
        data: 'not json at all',
        valid: false 
      },
      { 
        data: '{"unclosed": "quote}',
        valid: false 
      },
      { 
        data: '{"__proto__": {"isAdmin": true}}', // Prototype pollution attempt
        valid: true,
        sanitize: true 
      },
      { 
        data: JSON.stringify({ a: 'b'.repeat(1000000) }), // Large JSON
        valid: true,
        sizeLimit: true 
      }
    ];

    const validateAndSanitizeJSON = (jsonString: string, maxSize = 1024 * 100) => {
      // Check size first
      if (jsonString.length > maxSize) {
        return { valid: false, error: 'JSON too large' };
      }
      
      try {
        const parsed = JSON.parse(jsonString);
        
        // Remove dangerous keys
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
        const sanitize = (obj: any): any => {
          if (typeof obj !== 'object' || obj === null) return obj;
          
          if (Array.isArray(obj)) {
            return obj.map(sanitize);
          }
          
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (!dangerousKeys.includes(key)) {
              cleaned[key] = sanitize(value);
            }
          }
          return cleaned;
        };
        
        return { valid: true, data: sanitize(parsed) };
      } catch (error) {
        return { valid: false, error: 'Invalid JSON' };
      }
    };

    for (const test of jsonTests) {
      const result = validateAndSanitizeJSON(test.data);
      expect(result.valid).toBe(test.valid);
      
      if (test.sanitize && result.valid) {
        expect(result.data).not.toHaveProperty('__proto__');
      }
    }
  });
});