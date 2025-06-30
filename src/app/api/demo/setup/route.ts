import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signIn } from 'next-auth/react'
import bcrypt from 'bcryptjs'
import { generateSimpleDemoData } from '@/lib/demo-data-simple'

export async function POST(request: NextRequest) {
  try {
    // Check if demo mode is already active by checking for demo-specific warehouses
    const demoWarehouse = await prisma.warehouse.findFirst({
      where: {
        OR: [
          { code: 'LON-01' },
          { code: 'MAN-01' }
        ]
      }
    })
    
    if (demoWarehouse) {
      return NextResponse.json({
        success: false,
        message: 'Demo data already exists'
      })
    }

    // Start transaction to ensure atomic operation
    await prisma.$transaction(async (tx) => {
      // Always create a demo admin user
      const hashedPassword = await bcrypt.hash('SecureWarehouse2024!', 10)
      
      // Check if demo admin already exists
      let demoAdmin = await tx.user.findFirst({
        where: { 
          username: 'demo-admin',
          isDemo: true
        }
      })

      if (!demoAdmin) {
        demoAdmin = await tx.user.create({
          data: {
            username: 'demo-admin',
            email: 'demo-admin@warehouse.com',
            passwordHash: hashedPassword,
            fullName: 'Demo Administrator',
            role: 'admin',
            isActive: true,
            isDemo: true,
          }
        })
      }

      // Generate basic demo data
      const { warehouses, skus, staffUser } = await generateBasicDemoData(tx, demoAdmin.id)
      
      // Generate demo data with integrity rules
      await generateSimpleDemoData({
        tx,
        adminUserId: demoAdmin.id,
        staffUserId: staffUser.id,
        warehouses,
        skus
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Demo environment set up successfully'
    })
  } catch (error) {
    // console.error('Error setting up demo:', error)
    return NextResponse.json(
      { 
        error: 'Failed to set up demo environment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function generateBasicDemoData(tx: any, adminUserId: string) {
  // Create demo staff user
  const hashedPassword = await bcrypt.hash('DemoStaff2024!', 10)
  const staffUser = await tx.user.create({
    data: {
      username: 'staff',
      email: 'staff@warehouse.com',
      passwordHash: hashedPassword,
      fullName: 'Demo Staff',
      role: 'staff',
      isActive: true,
      isDemo: true,
    }
  })

  // Create demo warehouses
  const warehouses = await Promise.all([
    tx.warehouse.create({
      data: {
        code: 'LON-01',
        name: 'London Central Warehouse',
        address: '123 Warehouse Lane, London, UK',
        contactEmail: 'london@warehouse.com',
        contactPhone: '+44 20 1234 5678',
        isActive: true,
      }
    }),
    tx.warehouse.create({
      data: {
        code: 'MAN-01',
        name: 'Manchester Distribution Center',
        address: '456 Industrial Park, Manchester, UK',
        contactEmail: 'manchester@warehouse.com',
        contactPhone: '+44 161 234 5678',
        isActive: true,
      }
    }),
  ])

  // Update staff user with warehouse assignment
  await tx.user.update({
    where: { id: staffUser.id },
    data: { warehouseId: warehouses[0].id }
  })

  // Create demo SKUs
  const skus = await Promise.all([
    // Electronics
    tx.sku.create({
      data: {
        skuCode: 'ELEC-001',
        asin: 'B08N5WRWNW',
        description: 'Wireless Bluetooth Headphones',
        packSize: 1,
        material: 'Plastic/Metal',
        unitDimensionsCm: '20x18x8',
        unitWeightKg: 0.25,
        unitsPerCarton: 24,
        cartonDimensionsCm: '60x40x30',
        cartonWeightKg: 6.5,
        packagingType: 'Box',
        isActive: true,
      }
    }),
    tx.sku.create({
      data: {
        skuCode: 'ELEC-002',
        asin: 'B09K5W3XYZ',
        description: 'Smart Watch Pro',
        packSize: 1,
        material: 'Aluminum/Glass',
        unitDimensionsCm: '4x4x1',
        unitWeightKg: 0.05,
        unitsPerCarton: 48,
        cartonDimensionsCm: '40x30x20',
        cartonWeightKg: 3.0,
        packagingType: 'Box',
        isActive: true,
      }
    }),
    tx.sku.create({
      data: {
        skuCode: 'ELEC-003',
        asin: 'B07XL8D89P',
        description: 'Portable Power Bank 20000mAh',
        packSize: 1,
        material: 'Plastic',
        unitDimensionsCm: '15x7x2',
        unitWeightKg: 0.4,
        unitsPerCarton: 30,
        cartonDimensionsCm: '50x35x25',
        cartonWeightKg: 12.5,
        packagingType: 'Box',
        isActive: true,
      }
    }),
    // Fashion
    tx.sku.create({
      data: {
        skuCode: 'FASH-001',
        description: 'Premium Cotton T-Shirt',
        packSize: 1,
        material: '100% Cotton',
        unitDimensionsCm: '30x25x2',
        unitWeightKg: 0.2,
        unitsPerCarton: 50,
        cartonDimensionsCm: '60x40x30',
        cartonWeightKg: 10.5,
        packagingType: 'Poly Bag',
        isActive: true,
      }
    }),
    tx.sku.create({
      data: {
        skuCode: 'FASH-002',
        description: 'Denim Jeans Classic',
        packSize: 1,
        material: 'Denim',
        unitDimensionsCm: '35x30x3',
        unitWeightKg: 0.5,
        unitsPerCarton: 20,
        cartonDimensionsCm: '60x40x35',
        cartonWeightKg: 10.5,
        packagingType: 'Poly Bag',
        isActive: true,
      }
    }),
    // Home Goods
    tx.sku.create({
      data: {
        skuCode: 'HOME-001',
        description: 'Ceramic Coffee Mug Set',
        packSize: 6,
        material: 'Ceramic',
        unitDimensionsCm: '30x20x10',
        unitWeightKg: 1.5,
        unitsPerCarton: 8,
        cartonDimensionsCm: '65x45x35',
        cartonWeightKg: 13.0,
        packagingType: 'Box',
        isActive: true,
      }
    }),
    tx.sku.create({
      data: {
        skuCode: 'HOME-002',
        description: 'Memory Foam Pillow',
        packSize: 1,
        material: 'Memory Foam',
        unitDimensionsCm: '60x40x15',
        unitWeightKg: 0.8,
        unitsPerCarton: 12,
        cartonDimensionsCm: '70x50x40',
        cartonWeightKg: 10.0,
        packagingType: 'Vacuum Sealed',
        isActive: true,
      }
    }),
  ])

  // Create warehouse SKU configurations
  for (const warehouse of warehouses) {
    for (const sku of skus) {
      await tx.warehouseSkuConfig.create({
        data: {
          warehouseId: warehouse.id,
          skuId: sku.id,
          storageCartonsPerPallet: 48,
          shippingCartonsPerPallet: 40,
          maxStackingHeightCm: 180,
          effectiveDate: new Date('2024-01-01'),
          createdById: adminUserId,
        }
      })
    }
  }

  // Create demo cost rates
  const costRates = await Promise.all([
    tx.costRate.create({
      data: {
        warehouseId: warehouses[0].id,
        costCategory: 'Storage',
        costName: 'Standard Storage - Per Pallet',
        costValue: 25.00,
        unitOfMeasure: 'pallet/week',
        effectiveDate: new Date('2024-01-01'),
        createdById: adminUserId,
      }
    }),
    tx.costRate.create({
      data: {
        warehouseId: warehouses[0].id,
        costCategory: 'Carton',
        costName: 'Inbound Processing',
        costValue: 1.50,
        unitOfMeasure: 'carton',
        effectiveDate: new Date('2024-01-01'),
        createdById: adminUserId,
      }
    }),
    tx.costRate.create({
      data: {
        warehouseId: warehouses[0].id,
        costCategory: 'Carton',
        costName: 'Outbound Processing',
        costValue: 1.75,
        unitOfMeasure: 'carton',
        effectiveDate: new Date('2024-01-01'),
        createdById: adminUserId,
      }
    }),
    tx.costRate.create({
      data: {
        warehouseId: warehouses[1].id,
        costCategory: 'Storage',
        costName: 'Standard Storage - Per Pallet',
        costValue: 20.00,
        unitOfMeasure: 'pallet/week',
        effectiveDate: new Date('2024-01-01'),
        createdById: adminUserId,
      }
    }),
  ])

  // Return basic entities for enhanced demo data generation
  return { warehouses, skus, staffUser, costRates }
}