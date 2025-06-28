import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { 
  UserRole, 
  TransactionType, 
  CostCategory, 
  InvoiceStatus, 
  ReconciliationStatus,
  DisputeStatus,
  NotificationType,
  ResolutionType,
  FileAttachmentType
} from '@prisma/client'
import { addDays, subDays, startOfMonth, endOfMonth, format, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks } from 'date-fns'

const prisma = new PrismaClient()

// Progress tracking
let progressCallback: ((message: string, progress: number) => void) | null = null

export function setProgressCallback(callback: (message: string, progress: number) => void) {
  progressCallback = callback
}

function reportProgress(message: string, progress: number) {
  if (progressCallback) {
    progressCallback(message, progress)
  } else {
    // console.log(`[${Math.round(progress)}%] ${message}`)
  }
}

// Realistic warehouse data
const WAREHOUSES = [
  {
    code: 'LAX-01',
    name: 'Los Angeles Distribution Center',
    address: '12345 Logistics Way, Los Angeles, CA 90001',
    latitude: 34.0522,
    longitude: -118.2437,
    contactEmail: 'lax01@warehouse.com',
    contactPhone: '+1-310-555-0101'
  },
  {
    code: 'DFW-01',
    name: 'Dallas Fort Worth Fulfillment Hub',
    address: '6789 Commerce Drive, Dallas, TX 75201',
    latitude: 32.7767,
    longitude: -96.7970,
    contactEmail: 'dfw01@warehouse.com',
    contactPhone: '+1-214-555-0201'
  },
  {
    code: 'CHI-01',
    name: 'Chicago Central Warehouse',
    address: '9876 Industrial Blvd, Chicago, IL 60601',
    latitude: 41.8781,
    longitude: -87.6298,
    contactEmail: 'chi01@warehouse.com',
    contactPhone: '+1-312-555-0301'
  },
  {
    code: 'ATL-01',
    name: 'Atlanta Southeast Hub',
    address: '5432 Peachtree Industrial, Atlanta, GA 30301',
    latitude: 33.7490,
    longitude: -84.3880,
    contactEmail: 'atl01@warehouse.com',
    contactPhone: '+1-404-555-0401'
  },
  {
    code: 'NYC-01',
    name: 'New York Metro Facility',
    address: '2468 Commerce Avenue, Newark, NJ 07102',
    latitude: 40.7128,
    longitude: -74.0060,
    contactEmail: 'nyc01@warehouse.com',
    contactPhone: '+1-973-555-0501'
  }
]

// Realistic product SKUs
const PRODUCTS = [
  // Electronics
  { skuCode: 'ELEC-PHN-001', asin: 'B08XYZ123', description: 'Smartphone Screen Protector Pack', packSize: 10, material: 'Tempered Glass', unitsPerCarton: 100, packagingType: 'Box' },
  { skuCode: 'ELEC-CBL-002', asin: 'B08ABC456', description: 'USB-C Charging Cable 6ft', packSize: 5, material: 'Copper/PVC', unitsPerCarton: 50, packagingType: 'Poly Bag' },
  { skuCode: 'ELEC-EAR-003', asin: 'B08DEF789', description: 'Wireless Earbuds with Case', packSize: 1, material: 'ABS Plastic', unitsPerCarton: 20, packagingType: 'Box' },
  { skuCode: 'ELEC-PWR-004', asin: 'B08GHI012', description: 'Portable Power Bank 10000mAh', packSize: 1, material: 'Aluminum/Lithium', unitsPerCarton: 12, packagingType: 'Box' },
  { skuCode: 'ELEC-KBD-005', asin: 'B08JKL345', description: 'Mechanical Gaming Keyboard', packSize: 1, material: 'ABS/Metal', unitsPerCarton: 8, packagingType: 'Box' },
  
  // Home & Kitchen
  { skuCode: 'HOME-KIT-001', asin: 'B08MNO678', description: 'Stainless Steel Knife Set', packSize: 6, material: 'Stainless Steel', unitsPerCarton: 4, packagingType: 'Box' },
  { skuCode: 'HOME-BED-002', asin: 'B08PQR901', description: 'Bamboo Bed Sheet Set Queen', packSize: 1, material: 'Bamboo Fiber', unitsPerCarton: 6, packagingType: 'Bag' },
  { skuCode: 'HOME-ORG-003', asin: 'B08STU234', description: 'Plastic Storage Containers 12pc', packSize: 12, material: 'BPA-Free Plastic', unitsPerCarton: 4, packagingType: 'Box' },
  { skuCode: 'HOME-CLN-004', asin: 'B08VWX567', description: 'Microfiber Cleaning Cloths 24pc', packSize: 24, material: 'Microfiber', unitsPerCarton: 10, packagingType: 'Poly Bag' },
  { skuCode: 'HOME-DEC-005', asin: 'B08YZA890', description: 'LED String Lights 50ft', packSize: 1, material: 'Copper Wire/LED', unitsPerCarton: 24, packagingType: 'Box' },
  
  // Health & Beauty
  { skuCode: 'BEAU-SKN-001', asin: 'B08BCD123', description: 'Vitamin C Serum 30ml', packSize: 2, material: 'Glass/Dropper', unitsPerCarton: 48, packagingType: 'Box' },
  { skuCode: 'BEAU-HAR-002', asin: 'B08EFG456', description: 'Professional Hair Dryer', packSize: 1, material: 'ABS/Ceramic', unitsPerCarton: 6, packagingType: 'Box' },
  { skuCode: 'HLTH-VIT-003', asin: 'B08HIJ789', description: 'Multivitamin Gummies 60ct', packSize: 2, material: 'HDPE Bottle', unitsPerCarton: 24, packagingType: 'Box' },
  { skuCode: 'HLTH-FIT-004', asin: 'B08KLM012', description: 'Resistance Band Set', packSize: 5, material: 'Natural Latex', unitsPerCarton: 20, packagingType: 'Mesh Bag' },
  { skuCode: 'BEAU-MKP-005', asin: 'B08NOP345', description: 'Makeup Brush Set 12pc', packSize: 1, material: 'Synthetic/Wood', unitsPerCarton: 12, packagingType: 'Box' },
  
  // Sports & Outdoors
  { skuCode: 'SPRT-YGA-001', asin: 'B08QRS678', description: 'Premium Yoga Mat 6mm', packSize: 1, material: 'TPE Foam', unitsPerCarton: 10, packagingType: 'Roll with Strap' },
  { skuCode: 'SPRT-BTL-002', asin: 'B08TUV901', description: 'Insulated Water Bottle 32oz', packSize: 1, material: 'Stainless Steel', unitsPerCarton: 12, packagingType: 'Box' },
  { skuCode: 'OUT-CMP-003', asin: 'B08WXY234', description: 'Camping Tent 4-Person', packSize: 1, material: 'Polyester/Fiberglass', unitsPerCarton: 4, packagingType: 'Carry Bag' },
  { skuCode: 'SPRT-DUM-004', asin: 'B08ZAB567', description: 'Adjustable Dumbbell Set 40lb', packSize: 2, material: 'Cast Iron/Rubber', unitsPerCarton: 2, packagingType: 'Box' },
  { skuCode: 'OUT-BAG-005', asin: 'B08CDE890', description: 'Hiking Backpack 50L', packSize: 1, material: 'Ripstop Nylon', unitsPerCarton: 6, packagingType: 'Poly Bag' },
  
  // Toys & Games
  { skuCode: 'TOYS-BLD-001', asin: 'B08FGH123', description: 'Building Blocks Set 500pc', packSize: 1, material: 'ABS Plastic', unitsPerCarton: 8, packagingType: 'Box' },
  { skuCode: 'TOYS-PZL-002', asin: 'B08IJK456', description: 'Jigsaw Puzzle 1000pc', packSize: 1, material: 'Cardboard', unitsPerCarton: 12, packagingType: 'Box' },
  { skuCode: 'GAME-BRD-003', asin: 'B08LMN789', description: 'Strategy Board Game', packSize: 1, material: 'Cardboard/Plastic', unitsPerCarton: 6, packagingType: 'Box' },
  { skuCode: 'TOYS-PLH-004', asin: 'B08OPQ012', description: 'Plush Teddy Bear 16in', packSize: 1, material: 'Polyester Fiber', unitsPerCarton: 12, packagingType: 'Poly Bag' },
  { skuCode: 'TOYS-EDU-005', asin: 'B08RST345', description: 'Educational STEM Kit', packSize: 1, material: 'Mixed Materials', unitsPerCarton: 8, packagingType: 'Box' },
  
  // Office Supplies
  { skuCode: 'OFFC-PEN-001', asin: 'B08UVW678', description: 'Gel Pens 24-Color Set', packSize: 24, material: 'Plastic/Ink', unitsPerCarton: 20, packagingType: 'Box' },
  { skuCode: 'OFFC-NTB-002', asin: 'B08XYZ901', description: 'Spiral Notebooks 5-Pack', packSize: 5, material: 'Paper/Cardboard', unitsPerCarton: 12, packagingType: 'Shrink Wrap' },
  { skuCode: 'OFFC-ORG-003', asin: 'B08ABC234', description: 'Desktop Organizer Set', packSize: 1, material: 'Bamboo Wood', unitsPerCarton: 8, packagingType: 'Box' },
  { skuCode: 'OFFC-STP-004', asin: 'B08DEF567', description: 'Heavy Duty Stapler', packSize: 1, material: 'Metal/Plastic', unitsPerCarton: 24, packagingType: 'Box' },
  { skuCode: 'OFFC-FLD-005', asin: 'B08GHI890', description: 'File Folders Letter Size 100ct', packSize: 100, material: 'Manila Paper', unitsPerCarton: 10, packagingType: 'Box' }
]

// Customer types for realistic data
const CUSTOMER_TYPES = {
  ecommerce: ['Amazon Seller', 'Shopify Store', 'eBay Merchant', 'Etsy Shop'],
  retail: ['Retail Chain', 'Department Store', 'Specialty Retailer'],
  wholesale: ['Distributor', 'Wholesaler', 'Import/Export'],
  manufacturer: ['OEM', 'Private Label', 'Brand Owner']
}

// FBA warehouse codes
const FBA_WAREHOUSES = ['FBA-LAX9', 'FBA-ONT8', 'FBA-DFW6', 'FBA-ATL8', 'FBA-EWR4', 'FBA-ORD2', 'FBA-PHX7', 'FBA-RIC2']

// Seasonal patterns
const SEASONAL_MULTIPLIERS = {
  1: 0.7,   // January - Post-holiday slowdown
  2: 0.75,  // February
  3: 0.85,  // March
  4: 0.9,   // April
  5: 1.0,   // May
  6: 1.1,   // June
  7: 1.2,   // July - Summer peak
  8: 1.15,  // August
  9: 1.3,   // September - Back to school
  10: 1.4,  // October - Pre-holiday buildup
  11: 1.8,  // November - Black Friday/Cyber Monday
  12: 2.0   // December - Holiday peak
}

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generateBatchLot(): string {
  const year = new Date().getFullYear()
  const batch = randomInt(1000, 9999)
  return `${year}-${batch}`
}

function generateTransactionId(): string {
  const prefix = randomElement(['RCV', 'SHP', 'ADJ', 'TRF'])
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

function generateInvoiceNumber(warehouseCode: string, date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = randomInt(1000, 9999)
  return `INV-${warehouseCode}-${year}${month}-${random}`
}

function generatePONumber(): string {
  return `PO-${Date.now().toString(36).toUpperCase()}-${randomInt(1000, 9999)}`
}

function generateContainerNumber(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const prefix = Array(4).fill(0).map(() => letters[randomInt(0, 25)]).join('')
  return `${prefix}${randomInt(1000000, 9999999)}`
}

function getSeasonalMultiplier(date: Date): number {
  const month = date.getMonth() + 1
  return SEASONAL_MULTIPLIERS[month as keyof typeof SEASONAL_MULTIPLIERS] || 1.0
}

// Main demo data generation function
export async function generateDemoData() {
  // console.log('Starting comprehensive demo data generation...')
  reportProgress('Starting demo data generation', 0)

  try {
    // Clear existing data (optional - be careful in production!)
    reportProgress('Clearing existing demo data...', 5)
    await prisma.$transaction([
      prisma.fileAttachment.deleteMany(),
      prisma.palletVariance.deleteMany(),
      prisma.disputeResolution.deleteMany(),
      prisma.invoiceDispute.deleteMany(),
      prisma.invoiceAuditLog.deleteMany(),
      prisma.warehouseNotification.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.invoiceReconciliation.deleteMany(),
      prisma.invoiceLineItem.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.calculatedCost.deleteMany(),
      prisma.storageLedger.deleteMany(),
      prisma.inventoryBalance.deleteMany(),
      prisma.inventoryTransaction.deleteMany(),
      prisma.costRate.deleteMany(),
      prisma.warehouseSkuConfig.deleteMany(),
      prisma.skuVersion.deleteMany(),
      prisma.sku.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.user.deleteMany(),
      prisma.warehouse.deleteMany(),
    ])

    // 1. Create Warehouses
    reportProgress('Creating warehouses...', 10)
    const warehouses = await Promise.all(
      WAREHOUSES.map(w => prisma.warehouse.create({ data: w }))
    )

    // 2. Create Users
    reportProgress('Creating users...', 15)
    const users = []
    
    // Admin users
    const adminPassword = await hash('admin123', 10)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@warehouse.com',
        username: 'admin',
        passwordHash: adminPassword,
        fullName: 'System Administrator',
        role: UserRole.admin,
        isActive: true
      }
    })
    users.push(admin)

    // Operations Manager
    const opsManager = await prisma.user.create({
      data: {
        email: 'ops.manager@warehouse.com',
        username: 'ops_manager',
        passwordHash: adminPassword,
        fullName: 'Operations Manager',
        role: UserRole.admin,
        isActive: true
      }
    })
    users.push(opsManager)

    // Staff users for each warehouse
    const staffPassword = await hash('staff123', 10)
    for (const warehouse of warehouses) {
      // Warehouse manager
      const manager = await prisma.user.create({
        data: {
          email: `manager.${warehouse.code.toLowerCase()}@warehouse.com`,
          username: `manager_${warehouse.code.toLowerCase()}`,
          passwordHash: staffPassword,
          fullName: `${warehouse.name} Manager`,
          role: UserRole.staff,
          warehouseId: warehouse.id,
          isActive: true
        }
      })
      users.push(manager)

      // Warehouse staff
      const staff = await prisma.user.create({
        data: {
          email: `staff.${warehouse.code.toLowerCase()}@warehouse.com`,
          username: `staff_${warehouse.code.toLowerCase()}`,
          passwordHash: staffPassword,
          fullName: `${warehouse.name} Staff`,
          role: UserRole.staff,
          warehouseId: warehouse.id,
          isActive: true
        }
      })
      users.push(staff)
    }

    // Customer users - different types
    const customerPassword = await hash('customer123', 10)
    const customerData = [
      // E-commerce customers
      { email: 'amazon.seller@example.com', fullName: 'TechGadgets Pro (Amazon FBA)', username: 'techgadgets_fba', type: 'ecommerce' },
      { email: 'shopify.store@example.com', fullName: 'Fashion Forward Store', username: 'fashion_forward', type: 'ecommerce' },
      { email: 'ebay.merchant@example.com', fullName: 'Vintage Collectibles LLC', username: 'vintage_collect', type: 'ecommerce' },
      
      // Retail customers
      { email: 'retail.chain@example.com', fullName: 'MegaMart Retail Chain', username: 'megamart_retail', type: 'retail' },
      { email: 'dept.store@example.com', fullName: 'Prestige Department Store', username: 'prestige_dept', type: 'retail' },
      
      // Wholesale customers
      { email: 'distributor@example.com', fullName: 'National Distribution Co', username: 'national_dist', type: 'wholesale' },
      { email: 'importer@example.com', fullName: 'Global Imports LLC', username: 'global_imports', type: 'wholesale' },
      
      // Manufacturer customers
      { email: 'oem.mfg@example.com', fullName: 'OEM Manufacturing Inc', username: 'oem_mfg', type: 'manufacturer' },
      { email: 'brand.owner@example.com', fullName: 'Premium Brands Group', username: 'premium_brands', type: 'manufacturer' }
    ]

    const customerUsers = []
    for (const customer of customerData) {
      const user = await prisma.user.create({
        data: {
          email: customer.email,
          fullName: customer.fullName,
          username: customer.username,
          passwordHash: customerPassword,
          role: UserRole.staff, // Using staff role for customers
          isActive: true
        }
      })
      users.push(user)
      customerUsers.push({ ...user, type: customer.type })
    }

    // 3. Create SKUs
    reportProgress('Creating SKUs...', 20)
    const skus = await Promise.all(
      PRODUCTS.map(p => {
        const hasFBA = p.asin ? Math.random() > 0.3 : false // 70% of ASIN products have FBA
        const fbaStock = hasFBA ? randomInt(100, 5000) : 0
        const fbaInbound = hasFBA ? randomInt(0, 1000) : 0
        const fbaReserved = hasFBA ? randomInt(0, Math.floor(fbaStock * 0.1)) : 0
        
        return prisma.sku.create({
          data: {
            ...p,
            unitDimensionsCm: `${randomInt(5, 30)}x${randomInt(5, 30)}x${randomInt(5, 30)}`,
            unitWeightKg: randomFloat(0.1, 5),
            cartonDimensionsCm: `${randomInt(30, 60)}x${randomInt(30, 60)}x${randomInt(30, 60)}`,
            cartonWeightKg: randomFloat(5, 25),
            fbaStock: fbaStock,
            fbaInbound: fbaInbound,
            fbaReserved: fbaReserved,
            fbaStockLastUpdated: hasFBA ? new Date() : null,
            isActive: true
          }
        })
      })
    )

    // 4. Create Warehouse SKU Configurations
    reportProgress('Creating warehouse SKU configurations...', 25)
    const effectiveDate = subMonths(new Date(), 6)
    
    for (const warehouse of warehouses) {
      for (const sku of skus) {
        await prisma.warehouseSkuConfig.create({
          data: {
            warehouseId: warehouse.id,
            skuId: sku.id,
            storageCartonsPerPallet: randomElement([48, 60, 72, 96]),
            shippingCartonsPerPallet: randomElement([40, 50, 60, 80]),
            maxStackingHeightCm: randomElement([180, 200, 220, 240]),
            effectiveDate: effectiveDate,
            createdById: admin.id
          }
        })
      }
    }

    // 5. Create Cost Rates for each warehouse
    // console.log('Creating cost rates...')
    const costRateData = [
      { category: CostCategory.Container, name: 'Container Unload', value: 450, unit: 'per container' },
      { category: CostCategory.Container, name: 'Container Drayage', value: 350, unit: 'per container' },
      { category: CostCategory.Carton, name: 'Carton Handling In', value: 0.75, unit: 'per carton' },
      { category: CostCategory.Carton, name: 'Carton Handling Out', value: 0.85, unit: 'per carton' },
      { category: CostCategory.Pallet, name: 'Pallet Build', value: 5.50, unit: 'per pallet' },
      { category: CostCategory.Pallet, name: 'Pallet Wrap', value: 2.25, unit: 'per pallet' },
      { category: CostCategory.Storage, name: 'Pallet Storage Weekly', value: 3.50, unit: 'per pallet per week' },
      { category: CostCategory.Storage, name: 'Floor Storage Monthly', value: 15.00, unit: 'per sq ft per month' },
      { category: CostCategory.Unit, name: 'Pick and Pack', value: 0.35, unit: 'per unit' },
      { category: CostCategory.Unit, name: 'Labeling', value: 0.15, unit: 'per unit' },
      { category: CostCategory.Shipment, name: 'BOL Processing', value: 25.00, unit: 'per shipment' },
      { category: CostCategory.Shipment, name: 'Shipment Preparation', value: 45.00, unit: 'per shipment' },
      { category: CostCategory.Accessorial, name: 'Overtime Labor', value: 55.00, unit: 'per hour' },
      { category: CostCategory.Accessorial, name: 'Special Handling', value: 75.00, unit: 'per occurrence' }
    ]

    const costRates = []
    for (const warehouse of warehouses) {
      for (const rate of costRateData) {
        const costRate = await prisma.costRate.create({
          data: {
            warehouseId: warehouse.id,
            costCategory: rate.category,
            costName: rate.name,
            costValue: rate.value * (1 + randomFloat(-0.1, 0.1)), // Add some variation
            unitOfMeasure: rate.unit,
            effectiveDate: effectiveDate,
            createdById: admin.id
          }
        })
        costRates.push(costRate)
      }
    }

    // 6. Generate Inventory Transactions for the past 6 months
    reportProgress('Generating inventory transactions...', 35)
    const startDate = subMonths(new Date(), 6)
    const endDate = new Date()
    const transactions = []
    const batchLots = new Map<string, Set<string>>() // Track batch lots per SKU
    const containerNumbers = new Set<string>() // Track container numbers

    // Initialize batch lots for each SKU
    for (const sku of skus) {
      batchLots.set(sku.id, new Set())
    }

    // Generate transactions with seasonal patterns
    let transactionProgress = 35
    for (const warehouse of warehouses) {
      for (const sku of skus) {
        const skuBatchLots = batchLots.get(sku.id)!
        
        // Base transaction count adjusted by SKU popularity
        const baseTransactionCount = sku.asin ? randomInt(15, 30) : randomInt(5, 15)
        
        // Generate monthly transactions to ensure even distribution
        let currentMonth = new Date(startDate)
        while (currentMonth < endDate) {
          const monthEnd = endOfMonth(currentMonth)
          const seasonalMultiplier = getSeasonalMultiplier(currentMonth)
          const monthlyTransactions = Math.ceil(baseTransactionCount / 6 * seasonalMultiplier)
          
          for (let i = 0; i < monthlyTransactions; i++) {
            const transactionDate = new Date(
              currentMonth.getTime() + Math.random() * (monthEnd.getTime() - currentMonth.getTime())
            )
            
            // Determine transaction type with realistic distribution
            const typeRandom = Math.random()
            let transactionType: TransactionType
            
            // FBA sellers have different patterns
            const isFBASeller = customerUsers.find(c => c.type === 'ecommerce' && c.fullName.includes('FBA'))
            
            if (isFBASeller && sku.asin) {
              // FBA pattern: more ships to FBA, fewer direct ships
              if (typeRandom < 0.3) {
                transactionType = TransactionType.RECEIVE
              } else if (typeRandom < 0.8) {
                transactionType = TransactionType.SHIP // Ship to FBA
              } else if (typeRandom < 0.9) {
                transactionType = TransactionType.ADJUST_IN
              } else {
                transactionType = TransactionType.ADJUST_OUT
              }
            } else {
              // Regular pattern
              if (typeRandom < 0.35) {
                transactionType = TransactionType.RECEIVE
              } else if (typeRandom < 0.75) {
                transactionType = TransactionType.SHIP
              } else if (typeRandom < 0.88) {
                transactionType = TransactionType.ADJUST_IN
              } else {
                transactionType = TransactionType.ADJUST_OUT
              }
            }
            
            // Get or create batch lot
            let batchLot: string
            if (transactionType === TransactionType.RECEIVE || skuBatchLots.size === 0) {
              batchLot = generateBatchLot()
              skuBatchLots.add(batchLot)
            } else {
              batchLot = randomElement(Array.from(skuBatchLots))
            }
            
            // Get warehouse config for this SKU
            const config = await prisma.warehouseSkuConfig.findFirst({
              where: {
                warehouseId: warehouse.id,
                skuId: sku.id,
                effectiveDate: { lte: transactionDate },
                OR: [
                  { endDate: null },
                  { endDate: { gte: transactionDate } }
                ]
              }
            })
            
            const storageCartonsPerPallet = config?.storageCartonsPerPallet || 60
            const shippingCartonsPerPallet = config?.shippingCartonsPerPallet || 50
            
            // Generate quantities based on transaction type and seasonal patterns
            let cartonsIn = 0, cartonsOut = 0, storagePalletsIn = 0, shippingPalletsOut = 0
            let containerNumber: string | undefined
            let referenceId: string | undefined
            let poNumber: string | undefined
            
            if (transactionType === TransactionType.RECEIVE) {
              // Larger receives during peak season
              const baseCartons = randomInt(200, 1500)
              cartonsIn = Math.floor(baseCartons * seasonalMultiplier)
              storagePalletsIn = Math.ceil(cartonsIn / storageCartonsPerPallet)
              
              // Container shipments for large receives
              if (cartonsIn > 500) {
                containerNumber = generateContainerNumber()
                containerNumbers.add(containerNumber)
              }
              poNumber = generatePONumber()
              referenceId = poNumber
            } else if (transactionType === TransactionType.SHIP) {
              // Ships adjusted by season
              const baseCartons = randomInt(50, 600)
              cartonsOut = Math.floor(baseCartons * seasonalMultiplier)
              shippingPalletsOut = Math.ceil(cartonsOut / shippingCartonsPerPallet)
              
              // FBA shipments
              if (isFBASeller && sku.asin && Math.random() > 0.3) {
                referenceId = `FBA-${randomElement(FBA_WAREHOUSES)}-${randomInt(100000, 999999)}`
              } else {
                referenceId = generatePONumber()
              }
            } else if (transactionType === TransactionType.ADJUST_IN) {
              cartonsIn = randomInt(10, 100)
              storagePalletsIn = Math.ceil(cartonsIn / storageCartonsPerPallet)
              referenceId = `ADJ-${randomInt(10000, 99999)}`
            } else if (transactionType === TransactionType.ADJUST_OUT) {
              cartonsOut = randomInt(10, 100)
              referenceId = `ADJ-${randomInt(10000, 99999)}`
            }
            
            // Select appropriate user based on transaction type
            const transactionUser = transactionType === TransactionType.RECEIVE || transactionType === TransactionType.SHIP
              ? randomElement(users.filter(u => u.warehouseId === warehouse.id))
              : randomElement(users.filter(u => u.role === UserRole.staff && u.warehouseId === warehouse.id))
            
            const transaction = await prisma.inventoryTransaction.create({
              data: {
                transactionId: generateTransactionId(),
                warehouseId: warehouse.id,
                skuId: sku.id,
                batchLot: batchLot,
                transactionType: transactionType,
                referenceId: referenceId,
                poNumber: poNumber,
                containerNumber: containerNumber,
                cartonsIn: cartonsIn,
                cartonsOut: cartonsOut,
                storagePalletsIn: storagePalletsIn,
                shippingPalletsOut: shippingPalletsOut,
                transactionDate: transactionDate,
                pickupDate: transactionType === TransactionType.SHIP ? addDays(transactionDate, randomInt(1, 3)) : undefined,
                isReconciled: transactionDate < subDays(endDate, 7) ? Math.random() > 0.1 : Math.random() > 0.5,
                createdById: transactionUser.id,
                shippingCartonsPerPallet: shippingCartonsPerPallet,
                storageCartonsPerPallet: storageCartonsPerPallet,
                shipName: transactionType === TransactionType.SHIP ? 
                  (referenceId?.startsWith('FBA') ? 'Amazon Fulfillment' : randomElement(['Maersk Alabama', 'Ever Given', 'MSC Oscar', 'CMA CGM Marco Polo', 'COSCO Development'])) : 
                  undefined,
                trackingNumber: transactionType === TransactionType.SHIP ? 
                  (referenceId?.startsWith('FBA') ? `1Z${randomInt(100000000, 999999999)}` : `TRK${randomInt(1000000000, 9999999999)}`) : 
                  undefined,
                modeOfTransportation: transactionType === TransactionType.SHIP ? 
                  (referenceId?.startsWith('FBA') ? 'Ground' : randomElement(['Ocean', 'Air', 'Ground', 'Rail'])) : 
                  undefined,
                notes: transactionType === TransactionType.ADJUST_IN || transactionType === TransactionType.ADJUST_OUT ?
                  randomElement(['Cycle count adjustment', 'Damaged goods', 'Customer return', 'Quality control adjustment', 'Found inventory']) :
                  undefined
              }
            })
            transactions.push(transaction)
          }
          
          currentMonth = addMonths(currentMonth, 1)
        }
        
        // Update progress
        transactionProgress += 0.5
        reportProgress('Generating inventory transactions...', Math.min(transactionProgress, 50))
      }
    }

    // 7. Calculate and create inventory balances with pallet variances
    reportProgress('Calculating inventory balances...', 55)
    const palletVariances = []
    
    for (const warehouse of warehouses) {
      for (const sku of skus) {
        const skuBatchLots = Array.from(batchLots.get(sku.id) || [])
        
        for (const batchLot of skuBatchLots) {
          // Get all transactions for this combination
          const batchTransactions = await prisma.inventoryTransaction.findMany({
            where: {
              warehouseId: warehouse.id,
              skuId: sku.id,
              batchLot: batchLot
            },
            orderBy: { transactionDate: 'asc' }
          })
          
          if (batchTransactions.length === 0) continue
          
          // Calculate balance
          let currentCartons = 0
          let currentPallets = 0
          let theoreticalPallets = 0
          
          for (const trans of batchTransactions) {
            currentCartons += trans.cartonsIn - trans.cartonsOut
            currentPallets += trans.storagePalletsIn - trans.shippingPalletsOut
            
            // Calculate theoretical pallets for variance tracking
            if (trans.cartonsIn > 0 && trans.storageCartonsPerPallet) {
              theoreticalPallets += Math.ceil(trans.cartonsIn / trans.storageCartonsPerPallet)
            }
            if (trans.cartonsOut > 0 && trans.shippingCartonsPerPallet) {
              theoreticalPallets -= Math.ceil(trans.cartonsOut / trans.shippingCartonsPerPallet)
            }
          }
          
          // Only create positive balances
          if (currentCartons > 0) {
            const lastTransaction = batchTransactions[batchTransactions.length - 1]
            const balance = await prisma.inventoryBalance.create({
              data: {
                warehouseId: warehouse.id,
                skuId: sku.id,
                batchLot: batchLot,
                currentCartons: currentCartons,
                currentPallets: currentPallets,
                currentUnits: currentCartons * sku.unitsPerCarton,
                lastTransactionDate: lastTransaction.transactionDate,
                shippingCartonsPerPallet: lastTransaction.shippingCartonsPerPallet,
                storageCartonsPerPallet: lastTransaction.storageCartonsPerPallet
              }
            })
            
            // Create pallet variance records for some balances (20% chance)
            if (Math.random() < 0.2 && currentPallets !== theoreticalPallets) {
              const variance = currentPallets - theoreticalPallets
              const varianceRecord = await prisma.palletVariance.create({
                data: {
                  warehouseId: warehouse.id,
                  skuId: sku.id,
                  batchLot: batchLot,
                  reportedPallets: currentPallets,
                  systemPallets: theoreticalPallets,
                  varianceAmount: variance,
                  variancePercentage: theoreticalPallets > 0 ? (variance / theoreticalPallets) * 100 : 0,
                  reportDate: lastTransaction.transactionDate,
                  investigationStatus: Math.abs(variance) > 2 ? 'pending' : 'resolved',
                  rootCause: Math.abs(variance) <= 2 ? randomElement([
                    'Rounding difference in partial pallet',
                    'Consolidation during putaway',
                    'Pallet optimization by warehouse staff'
                  ]) : undefined,
                  resolutionNotes: Math.abs(variance) <= 2 ? 'Minor variance within acceptable range' : undefined,
                  resolvedById: Math.abs(variance) <= 2 ? randomElement(users.filter(u => u.warehouseId === warehouse.id)).id : undefined,
                  resolvedAt: Math.abs(variance) <= 2 ? new Date() : undefined
                }
              })
              palletVariances.push(varianceRecord)
            }
          }
        }
      }
    }

    // 8. Generate Storage Ledger entries
    reportProgress('Generating storage ledger entries...', 60)
    const currentDate = new Date()
    const sixMonthsAgo = subMonths(currentDate, 6)
    
    for (const warehouse of warehouses) {
      const storageRate = costRates.find(r => 
        r.warehouseId === warehouse.id && 
        r.costName === 'Pallet Storage Weekly'
      )
      
      if (!storageRate) continue
      
      // Generate weekly entries for the past 6 months
      let weekStart = sixMonthsAgo
      while (weekStart < currentDate) {
        const weekEnd = addDays(weekStart, 6)
        const billingPeriodStart = startOfMonth(weekStart)
        const billingPeriodEnd = endOfMonth(weekStart)
        
        // Get inventory balances at the end of Monday
        const balances = await prisma.inventoryBalance.findMany({
          where: {
            warehouseId: warehouse.id,
            lastTransactionDate: { lte: weekEnd }
          }
        })
        
        for (const balance of balances) {
          if (balance.currentPallets > 0) {
            await prisma.storageLedger.create({
              data: {
                slId: `SL-${warehouse.code}-${format(weekEnd, 'yyyyMMdd')}-${balance.skuId.substring(0, 8)}`,
                weekEndingDate: weekEnd,
                warehouseId: warehouse.id,
                skuId: balance.skuId,
                batchLot: balance.batchLot,
                cartonsEndOfMonday: balance.currentCartons,
                storagePalletsCharged: balance.currentPallets,
                applicableWeeklyRate: storageRate.costValue,
                calculatedWeeklyCost: Number(storageRate.costValue) * balance.currentPallets,
                billingPeriodStart: billingPeriodStart,
                billingPeriodEnd: billingPeriodEnd
              }
            })
          }
        }
        
        weekStart = addDays(weekStart, 7)
      }
    }

    // 9. Generate Invoices with line items, disputes, and payments
    reportProgress('Generating invoices...', 70)
    const invoices = []
    const fileAttachments = []
    
    for (const warehouse of warehouses) {
      // Generate monthly invoices for the past 6 months
      let invoiceMonth = sixMonthsAgo
      
      while (invoiceMonth < currentDate) {
        const billingPeriodStart = startOfMonth(invoiceMonth)
        const billingPeriodEnd = endOfMonth(invoiceMonth)
        const invoiceDate = addDays(billingPeriodEnd, 5) // Invoice 5 days after month end
        const dueDate = addDays(invoiceDate, 30) // 30 days payment terms
        
        // Get storage costs for the month
        const storageCosts = await prisma.storageLedger.aggregate({
          where: {
            warehouseId: warehouse.id,
            billingPeriodStart: billingPeriodStart,
            billingPeriodEnd: billingPeriodEnd
          },
          _sum: {
            calculatedWeeklyCost: true,
            storagePalletsCharged: true
          }
        })
        
        // Get activity costs (simplified - in real world would be from calculated costs)
        const inboundTransactions = await prisma.inventoryTransaction.count({
          where: {
            warehouseId: warehouse.id,
            transactionDate: {
              gte: billingPeriodStart,
              lte: billingPeriodEnd
            },
            transactionType: TransactionType.RECEIVE
          }
        })
        
        const outboundTransactions = await prisma.inventoryTransaction.count({
          where: {
            warehouseId: warehouse.id,
            transactionDate: {
              gte: billingPeriodStart,
              lte: billingPeriodEnd
            },
            transactionType: TransactionType.SHIP
          }
        })
        
        // Assign customer based on transaction patterns
        const customer = randomElement(customerUsers)
        
        // Calculate more realistic costs
        const handlingCost = inboundTransactions * randomFloat(45, 65) + outboundTransactions * randomFloat(70, 90)
        const storageCost = storageCosts._sum.calculatedWeeklyCost || 0
        const accessorialCost = Math.random() > 0.7 ? randomFloat(100, 500) : 0
        
        const subtotal = storageCost + handlingCost + accessorialCost
        const taxAmount = subtotal * 0.0875 // 8.75% tax
        const totalAmount = subtotal + taxAmount
        
        // Determine invoice status based on date and customer type
        let status: InvoiceStatus = InvoiceStatus.pending
        const daysSinceInvoice = Math.floor((currentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysSinceInvoice > 90) {
          status = InvoiceStatus.paid
        } else if (daysSinceInvoice > 60) {
          status = randomElement([InvoiceStatus.paid, InvoiceStatus.paid, InvoiceStatus.reconciled])
        } else if (daysSinceInvoice > 30) {
          // Different patterns for different customer types
          if (customer.type === 'ecommerce') {
            status = randomElement([InvoiceStatus.paid, InvoiceStatus.reconciled, InvoiceStatus.disputed])
          } else if (customer.type === 'retail') {
            status = randomElement([InvoiceStatus.pending, InvoiceStatus.reconciled])
          } else {
            status = randomElement([InvoiceStatus.pending, InvoiceStatus.paid])
          }
        } else if (daysSinceInvoice > 15) {
          status = randomElement([InvoiceStatus.pending, InvoiceStatus.sent])
        }
        
        const paymentDate = status === InvoiceStatus.paid ? 
          addDays(invoiceDate, randomInt(25, daysSinceInvoice > 30 ? 60 : 30)) : undefined
        
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: generateInvoiceNumber(warehouse.code, invoiceDate),
            warehouseId: warehouse.id,
            customerId: customer.id,
            billingPeriodStart: billingPeriodStart,
            billingPeriodEnd: billingPeriodEnd,
            invoiceDate: invoiceDate,
            issueDate: invoiceDate,
            dueDate: dueDate,
            subtotal: subtotal,
            taxAmount: taxAmount,
            totalAmount: totalAmount,
            paidAmount: status === InvoiceStatus.paid ? totalAmount : 
                       status === InvoiceStatus.disputed ? totalAmount * randomFloat(0.5, 0.9) : 0,
            status: status,
            notes: `Monthly warehouse services for ${customer.fullName}`,
            createdById: admin.id,
            billingMonth: invoiceDate.getMonth() + 1,
            billingYear: invoiceDate.getFullYear(),
            type: 'Monthly Services',
            currency: 'USD',
            paymentTerms: customer.type === 'retail' ? 'Net 45' : 'Net 30',
            paymentDate: paymentDate,
            paidAt: paymentDate,
            paidBy: status === InvoiceStatus.paid ? customer.email : undefined
          }
        })
        invoices.push(invoice)
        
        // Create detailed line items
        const lineItems = []
        
        // Storage costs
        if (storageCost > 0) {
          const palletCount = storageCosts._sum.storagePalletsCharged || 0
          const rate = costRates.find(r => r.warehouseId === warehouse.id && r.costName.includes('Storage'))?.costValue || 3.50
          
          lineItems.push({
            invoiceId: invoice.id,
            costCategory: CostCategory.Storage,
            costName: 'Pallet Storage - Weekly',
            description: `Storage charges for ${palletCount} pallets`,
            quantity: palletCount,
            unitRate: rate,
            amount: storageCost,
            referenceData: { weekCount: 4, averagePalletsPerWeek: Math.floor(palletCount / 4) }
          })
        }
        
        // Inbound processing
        if (inboundTransactions > 0) {
          const inboundCartons = await prisma.inventoryTransaction.aggregate({
            where: {
              warehouseId: warehouse.id,
              transactionDate: {
                gte: billingPeriodStart,
                lte: billingPeriodEnd
              },
              transactionType: TransactionType.RECEIVE
            },
            _sum: { cartonsIn: true }
          })
          
          const cartonRate = costRates.find(r => r.warehouseId === warehouse.id && r.costName === 'Carton Handling In')?.costValue || 0.75
          const containerRate = costRates.find(r => r.warehouseId === warehouse.id && r.costName === 'Container Unload')?.costValue || 450
          
          lineItems.push({
            invoiceId: invoice.id,
            costCategory: CostCategory.Carton,
            costName: 'Inbound Carton Handling',
            description: `Processing of ${inboundCartons._sum.cartonsIn || 0} cartons`,
            quantity: inboundCartons._sum.cartonsIn || 0,
            unitRate: cartonRate,
            amount: (inboundCartons._sum.cartonsIn || 0) * cartonRate
          })
          
          // Container charges for large shipments
          const containerCount = Math.floor((inboundCartons._sum.cartonsIn || 0) / 1000)
          if (containerCount > 0) {
            lineItems.push({
              invoiceId: invoice.id,
              costCategory: CostCategory.Container,
              costName: 'Container Unload',
              description: `Unloading of ${containerCount} containers`,
              quantity: containerCount,
              unitRate: containerRate,
              amount: containerCount * containerRate
            })
          }
        }
        
        // Outbound processing
        if (outboundTransactions > 0) {
          const outboundCartons = await prisma.inventoryTransaction.aggregate({
            where: {
              warehouseId: warehouse.id,
              transactionDate: {
                gte: billingPeriodStart,
                lte: billingPeriodEnd
              },
              transactionType: TransactionType.SHIP
            },
            _sum: { cartonsOut: true }
          })
          
          const cartonRate = costRates.find(r => r.warehouseId === warehouse.id && r.costName === 'Carton Handling Out')?.costValue || 0.85
          const shipmentRate = costRates.find(r => r.warehouseId === warehouse.id && r.costName === 'Shipment Preparation')?.costValue || 45
          
          lineItems.push({
            invoiceId: invoice.id,
            costCategory: CostCategory.Carton,
            costName: 'Outbound Carton Handling',
            description: `Processing of ${outboundCartons._sum.cartonsOut || 0} cartons`,
            quantity: outboundCartons._sum.cartonsOut || 0,
            unitRate: cartonRate,
            amount: (outboundCartons._sum.cartonsOut || 0) * cartonRate
          })
          
          lineItems.push({
            invoiceId: invoice.id,
            costCategory: CostCategory.Shipment,
            costName: 'Shipment Preparation',
            description: `Preparation of ${outboundTransactions} shipments`,
            quantity: outboundTransactions,
            unitRate: shipmentRate,
            amount: outboundTransactions * shipmentRate
          })
        }
        
        // Accessorial charges
        if (accessorialCost > 0) {
          lineItems.push({
            invoiceId: invoice.id,
            costCategory: CostCategory.Accessorial,
            costName: randomElement(['Special Handling', 'Overtime Labor', 'Rush Processing', 'Weekend Operations']),
            description: 'Additional services requested',
            quantity: 1,
            unitRate: accessorialCost,
            amount: accessorialCost
          })
        }
        
        if (lineItems.length > 0) {
          await prisma.invoiceLineItem.createMany({
            data: lineItems
          })
        }
        
        // Create file attachments for invoices
        const attachmentTypes = [
          { type: FileAttachmentType.invoice_pdf, name: `${invoice.invoiceNumber}.pdf`, size: randomInt(100000, 500000) },
          { type: FileAttachmentType.support_doc, name: `${invoice.invoiceNumber}_detail.xlsx`, size: randomInt(50000, 200000) }
        ]
        
        for (const attachment of attachmentTypes) {
          // 80% chance of having the primary invoice PDF, 40% for support docs
          if ((attachment.type === FileAttachmentType.invoice_pdf && Math.random() < 0.8) ||
              (attachment.type === FileAttachmentType.support_doc && Math.random() < 0.4)) {
            const fileAttachment = await prisma.fileAttachment.create({
              data: {
                fileName: attachment.name,
                fileType: attachment.type,
                fileSize: attachment.size,
                mimeType: attachment.type === FileAttachmentType.invoice_pdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                uploadedById: admin.id,
                invoiceId: invoice.id,
                description: attachment.type === FileAttachmentType.invoice_pdf ? 
                  'Official invoice document' : 
                  'Detailed transaction breakdown'
              }
            })
            fileAttachments.push(fileAttachment)
          }
        }
        
        // Create reconciliation records for some invoices
        if (status === InvoiceStatus.reconciled || status === InvoiceStatus.disputed) {
          for (const lineItem of lineItems) {
            const difference = randomFloat(-50, 50)
            const reconciliation = await prisma.invoiceReconciliation.create({
              data: {
                invoiceId: invoice.id,
                costCategory: lineItem.costCategory,
                costName: lineItem.costName,
                expectedAmount: lineItem.amount,
                invoicedAmount: lineItem.amount + difference,
                difference: difference,
                status: Math.abs(difference) < 10 ? ReconciliationStatus.match : 
                       difference > 0 ? ReconciliationStatus.overbilled : ReconciliationStatus.underbilled,
                resolutionNotes: Math.abs(difference) < 10 ? 'Amount matches expected' : 'Discrepancy identified',
                resolvedById: Math.abs(difference) < 10 ? admin.id : undefined,
                resolvedAt: Math.abs(difference) < 10 ? new Date() : undefined,
                suggestedAmount: lineItem.amount,
                expectedQuantity: lineItem.quantity,
                invoicedQuantity: lineItem.quantity,
                unitRate: lineItem.unitRate
              }
            })
          }
        }
        
        // Create dispute for disputed invoices
        if (status === InvoiceStatus.disputed) {
          const disputeReasons = [
            { reason: 'Incorrect storage charges - pallet count mismatch', category: CostCategory.Storage },
            { reason: 'Duplicate billing for shipment processing', category: CostCategory.Shipment },
            { reason: 'Rate discrepancy - contracted rate not applied', category: CostCategory.Carton },
            { reason: 'Services not rendered as invoiced', category: CostCategory.Accessorial },
            { reason: 'Billing period dates incorrect', category: null },
            { reason: 'Tax calculation error', category: null }
          ]
          
          const selectedReason = randomElement(disputeReasons)
          const relevantLineItems = selectedReason.category ? 
            lineItems.filter(li => li.costCategory === selectedReason.category) : lineItems
          
          const dispute = await prisma.invoiceDispute.create({
            data: {
              invoiceId: invoice.id,
              disputedBy: customer.email,
              reason: selectedReason.reason,
              disputedAmount: totalAmount * randomFloat(0.1, 0.3),
              lineItemsDisputed: Math.min(relevantLineItems.length, randomInt(1, 3)),
              status: daysSinceInvoice > 45 ? 
                randomElement([DisputeStatus.open, DisputeStatus.in_review, DisputeStatus.resolved]) : 
                DisputeStatus.open,
              priority: totalAmount > 10000 ? 'high' : 
                       totalAmount > 5000 ? 'medium' : 'low',
              contactedWarehouse: Math.random() > 0.3,
              assignedTo: randomElement(users.filter(u => u.role === UserRole.admin)).email,
              notes: `Customer ${customer.fullName} disputed charges. Initial review required.`,
              supportingDocuments: Math.random() > 0.5 ? 
                [`email_correspondence_${invoice.invoiceNumber}.pdf`, `transaction_report_${format(billingPeriodStart, 'yyyy-MM')}.xlsx`] : 
                undefined
            }
          })
          
          // Create resolution for resolved disputes
          if (dispute.status === DisputeStatus.resolved) {
            await prisma.disputeResolution.create({
              data: {
                disputeId: dispute.id,
                resolutionType: randomElement([
                  ResolutionType.full_credit,
                  ResolutionType.partial_credit,
                  ResolutionType.no_adjustment,
                  ResolutionType.payment_plan
                ]),
                creditAmount: dispute.disputedAmount * randomFloat(0.3, 1.0),
                resolutionNotes: 'After review, adjustment has been processed.',
                approvedBy: opsManager.email,
                implementedBy: admin.email,
                resolutionDate: addDays(dispute.createdAt, randomInt(3, 15))
              }
            })
          }
        }
        
        invoiceMonth = addMonths(invoiceMonth, 1)
      }
    }

    // 10. Generate warehouse notifications
    reportProgress('Generating warehouse notifications...', 80)
    const notifications = []
    
    // Create notifications for various events
    for (const warehouse of warehouses) {
      // Low stock notifications
      const lowStockBalances = await prisma.inventoryBalance.findMany({
        where: {
          warehouseId: warehouse.id,
          currentCartons: { lte: 20 }
        },
        include: { sku: true },
        take: 5
      })
      
      for (const balance of lowStockBalances) {
        const notification = await prisma.warehouseNotification.create({
          data: {
            warehouseId: warehouse.id,
            type: NotificationType.low_stock,
            title: `Low Stock Alert: ${balance.sku.skuCode}`,
            message: `SKU ${balance.sku.skuCode} (${balance.sku.description}) has only ${balance.currentCartons} cartons remaining in batch ${balance.batchLot}.`,
            priority: balance.currentCartons <= 10 ? 'high' : 'medium',
            relatedSkuId: balance.skuId,
            relatedTransactionId: undefined,
            isRead: Math.random() > 0.3,
            readBy: Math.random() > 0.3 ? randomElement(users.filter(u => u.warehouseId === warehouse.id)).email : undefined,
            readAt: Math.random() > 0.3 ? subDays(currentDate, randomInt(1, 7)) : undefined
          }
        })
        notifications.push(notification)
      }
      
      // Shipment delay notifications
      const delayedShipments = await prisma.inventoryTransaction.findMany({
        where: {
          warehouseId: warehouse.id,
          transactionType: TransactionType.SHIP,
          pickupDate: { lte: subDays(currentDate, 2) },
          transactionDate: { gte: subMonths(currentDate, 1) }
        },
        take: 3
      })
      
      for (const shipment of delayedShipments) {
        const notification = await prisma.warehouseNotification.create({
          data: {
            warehouseId: warehouse.id,
            type: NotificationType.shipment_delay,
            title: `Shipment Delay: ${shipment.referenceId}`,
            message: `Shipment ${shipment.referenceId} scheduled for pickup on ${format(shipment.pickupDate!, 'MMM dd, yyyy')} may be delayed.`,
            priority: 'high',
            relatedTransactionId: shipment.transactionId,
            isRead: Math.random() > 0.2,
            actionRequired: true,
            actionDeadline: addDays(shipment.pickupDate!, 1)
          }
        })
        notifications.push(notification)
      }
      
      // System maintenance notifications
      if (Math.random() > 0.7) {
        const maintenanceDate = addDays(currentDate, randomInt(7, 30))
        const notification = await prisma.warehouseNotification.create({
          data: {
            warehouseId: warehouse.id,
            type: NotificationType.system_maintenance,
            title: 'Scheduled System Maintenance',
            message: `System maintenance scheduled for ${format(maintenanceDate, 'EEEE, MMMM dd, yyyy')} from 2:00 AM to 6:00 AM EST.`,
            priority: 'low',
            isRead: false,
            scheduledFor: maintenanceDate
          }
        })
        notifications.push(notification)
      }
    }
    
    // 11. Generate comprehensive calculated costs
    reportProgress('Generating calculated costs...', 85)
    const recentTransactions = await prisma.inventoryTransaction.findMany({
      where: {
        transactionDate: {
          gte: subMonths(currentDate, 3)
        }
      },
      orderBy: { transactionDate: 'desc' },
      take: 200
    })
    
    for (const transaction of recentTransactions) {
      const relevantRates = await prisma.costRate.findMany({
        where: {
          warehouseId: transaction.warehouseId,
          effectiveDate: { lte: transaction.transactionDate },
          OR: [
            { endDate: null },
            { endDate: { gte: transaction.transactionDate } }
          ]
        }
      })
      
      // Create comprehensive costs based on transaction type
      if (transaction.transactionType === TransactionType.RECEIVE) {
        // Inbound handling
        const handlingRate = relevantRates.find(r => r.costName === 'Carton Handling In')
        if (handlingRate && transaction.cartonsIn > 0) {
          await prisma.calculatedCost.create({
            data: {
              calculatedCostId: `CC-${transaction.transactionId}-HANDLING`,
              transactionType: 'Inbound Handling',
              transactionReferenceId: transaction.transactionId,
              costRateId: handlingRate.id,
              warehouseId: transaction.warehouseId,
              skuId: transaction.skuId,
              batchLot: transaction.batchLot,
              transactionDate: transaction.transactionDate,
              billingWeekEnding: endOfWeek(transaction.transactionDate, { weekStartsOn: 1 }),
              billingPeriodStart: startOfMonth(transaction.transactionDate),
              billingPeriodEnd: endOfMonth(transaction.transactionDate),
              quantityCharged: transaction.cartonsIn,
              applicableRate: handlingRate.costValue,
              calculatedCost: Number(handlingRate.costValue) * transaction.cartonsIn,
              costAdjustmentValue: 0,
              finalExpectedCost: Number(handlingRate.costValue) * transaction.cartonsIn,
              createdById: admin.id,
              notes: transaction.containerNumber ? `Container: ${transaction.containerNumber}` : undefined
            }
          })
        }
        
        // Container unload cost for large shipments
        if (transaction.containerNumber) {
          const containerRate = relevantRates.find(r => r.costName === 'Container Unload')
          if (containerRate) {
            await prisma.calculatedCost.create({
              data: {
                calculatedCostId: `CC-${transaction.transactionId}-CONTAINER`,
                transactionType: 'Container Unload',
                transactionReferenceId: transaction.transactionId,
                costRateId: containerRate.id,
                warehouseId: transaction.warehouseId,
                skuId: transaction.skuId,
                batchLot: transaction.batchLot,
                transactionDate: transaction.transactionDate,
                billingWeekEnding: endOfWeek(transaction.transactionDate, { weekStartsOn: 1 }),
                billingPeriodStart: startOfMonth(transaction.transactionDate),
                billingPeriodEnd: endOfMonth(transaction.transactionDate),
                quantityCharged: 1,
                applicableRate: containerRate.costValue,
                calculatedCost: Number(containerRate.costValue),
                costAdjustmentValue: 0,
                finalExpectedCost: Number(containerRate.costValue),
                createdById: admin.id,
                notes: `Container ${transaction.containerNumber}`
              }
            })
          }
        }
        
        // Pallet build cost
        if (transaction.storagePalletsIn > 0) {
          const palletRate = relevantRates.find(r => r.costName === 'Pallet Build')
          if (palletRate) {
            await prisma.calculatedCost.create({
              data: {
                calculatedCostId: `CC-${transaction.transactionId}-PALLET`,
                transactionType: 'Pallet Build',
                transactionReferenceId: transaction.transactionId,
                costRateId: palletRate.id,
                warehouseId: transaction.warehouseId,
                skuId: transaction.skuId,
                batchLot: transaction.batchLot,
                transactionDate: transaction.transactionDate,
                billingWeekEnding: endOfWeek(transaction.transactionDate, { weekStartsOn: 1 }),
                billingPeriodStart: startOfMonth(transaction.transactionDate),
                billingPeriodEnd: endOfMonth(transaction.transactionDate),
                quantityCharged: transaction.storagePalletsIn,
                applicableRate: palletRate.costValue,
                calculatedCost: Number(palletRate.costValue) * transaction.storagePalletsIn,
                costAdjustmentValue: 0,
                finalExpectedCost: Number(palletRate.costValue) * transaction.storagePalletsIn,
                createdById: admin.id
              }
            })
          }
        }
      } else if (transaction.transactionType === TransactionType.SHIP) {
        // Outbound handling
        const handlingRate = relevantRates.find(r => r.costName === 'Carton Handling Out')
        if (handlingRate && transaction.cartonsOut > 0) {
          await prisma.calculatedCost.create({
            data: {
              calculatedCostId: `CC-${transaction.transactionId}-HANDLING`,
              transactionType: 'Outbound Handling',
              transactionReferenceId: transaction.transactionId,
              costRateId: handlingRate.id,
              warehouseId: transaction.warehouseId,
              skuId: transaction.skuId,
              batchLot: transaction.batchLot,
              transactionDate: transaction.transactionDate,
              billingWeekEnding: endOfWeek(transaction.transactionDate, { weekStartsOn: 1 }),
              billingPeriodStart: startOfMonth(transaction.transactionDate),
              billingPeriodEnd: endOfMonth(transaction.transactionDate),
              quantityCharged: transaction.cartonsOut,
              applicableRate: handlingRate.costValue,
              calculatedCost: Number(handlingRate.costValue) * transaction.cartonsOut,
              costAdjustmentValue: 0,
              finalExpectedCost: Number(handlingRate.costValue) * transaction.cartonsOut,
              createdById: admin.id,
              notes: transaction.referenceId?.startsWith('FBA') ? 'FBA Shipment' : undefined
            }
          })
        }
        
        // Shipment preparation cost
        const shipmentRate = relevantRates.find(r => r.costName === 'Shipment Preparation')
        if (shipmentRate) {
          await prisma.calculatedCost.create({
            data: {
              calculatedCostId: `CC-${transaction.transactionId}-SHIPPREP`,
              transactionType: 'Shipment Preparation',
              transactionReferenceId: transaction.transactionId,
              costRateId: shipmentRate.id,
              warehouseId: transaction.warehouseId,
              skuId: transaction.skuId,
              batchLot: transaction.batchLot,
              transactionDate: transaction.transactionDate,
              billingWeekEnding: endOfWeek(transaction.transactionDate, { weekStartsOn: 1 }),
              billingPeriodStart: startOfMonth(transaction.transactionDate),
              billingPeriodEnd: endOfMonth(transaction.transactionDate),
              quantityCharged: 1,
              applicableRate: shipmentRate.costValue,
              calculatedCost: Number(shipmentRate.costValue),
              costAdjustmentValue: 0,
              finalExpectedCost: Number(shipmentRate.costValue),
              createdById: admin.id
            }
          })
        }
      }
    }
    
    // 12. Generate payments for paid invoices
    reportProgress('Generating payment records...', 90)
    const paidInvoices = invoices.filter(inv => inv.status === InvoiceStatus.paid && inv.paymentDate)
    
    for (const invoice of paidInvoices) {
      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentAmount: invoice.paidAmount,
          paymentDate: invoice.paymentDate!,
          paymentMethod: randomElement(['ACH Transfer', 'Wire Transfer', 'Check', 'Credit Card']),
          referenceNumber: `PAY-${Date.now().toString(36).toUpperCase()}-${randomInt(1000, 9999)}`,
          processedBy: invoice.paidBy || 'system',
          notes: 'Payment received and processed successfully'
        }
      })
    }

    // 13. Create comprehensive audit logs
    reportProgress('Creating audit logs...', 95)
    const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT']
    const auditTables = ['inventory_transactions', 'invoices', 'cost_rates', 'users', 'sku', 'inventory_balance', 'warehouse_notification']
    
    // Generate audit logs throughout the time period
    for (let i = 0; i < 200; i++) {
      const auditDate = new Date(
        sixMonthsAgo.getTime() + Math.random() * (currentDate.getTime() - sixMonthsAgo.getTime())
      )
      const auditUser = randomElement(users)
      const tableName = randomElement(auditTables)
      
      let recordId: string
      let changes: any = {}
      
      // Create realistic audit entries based on table
      switch (tableName) {
        case 'inventory_transactions':
          recordId = randomElement(transactions).id
          changes = {
            before: { isReconciled: false },
            after: { isReconciled: true }
          }
          break
        case 'invoices':
          recordId = invoices.length > 0 ? randomElement(invoices).id : 'dummy-id'
          changes = {
            before: { status: 'pending' },
            after: { status: 'sent' }
          }
          break
        case 'cost_rates':
          recordId = randomElement(costRates).id
          changes = {
            before: { costValue: 25.00 },
            after: { costValue: 27.50 }
          }
          break
        default:
          recordId = randomElement(users).id
          changes = {
            before: { isActive: true },
            after: { isActive: false }
          }
      }
      
      await prisma.auditLog.create({
        data: {
          tableName: tableName,
          recordId: recordId,
          action: randomElement(auditActions),
          changes: changes,
          userId: auditUser.id,
          ipAddress: `10.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`,
          userAgent: randomElement([
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
          ]),
          createdAt: auditDate
        }
      })
    }

    reportProgress('Demo data generation completed successfully!', 100)
    
    // Calculate final statistics
    const finalStats = {
      warehouses: warehouses.length,
      users: users.length,
      skus: skus.length,
      transactions: transactions.length,
      inventoryBalances: await prisma.inventoryBalance.count(),
      costRates: costRates.length,
      invoices: invoices.length,
      invoiceLineItems: await prisma.invoiceLineItem.count(),
      disputes: await prisma.invoiceDispute.count(),
      payments: await prisma.payment.count(),
      notifications: notifications.length,
      fileAttachments: fileAttachments.length,
      palletVariances: palletVariances.length,
      storageLedgerEntries: await prisma.storageLedger.count(),
      calculatedCosts: await prisma.calculatedCost.count(),
      auditLogs: await prisma.auditLog.count()
    }
    
    // console.log('\n📊 Demo Data Generation Summary:')
    // console.log('================================')
    // console.log(`✅ Warehouses: ${finalStats.warehouses}`)
    // console.log(`✅ Users: ${finalStats.users}`)
    // console.log(`✅ SKUs: ${finalStats.skus}`)
    // console.log(`✅ Transactions: ${finalStats.transactions}`)
    // console.log(`✅ Inventory Balances: ${finalStats.inventoryBalances}`)
    // console.log(`✅ Cost Rates: ${finalStats.costRates}`)
    // console.log(`✅ Invoices: ${finalStats.invoices}`)
    // console.log(`✅ Invoice Line Items: ${finalStats.invoiceLineItems}`)
    // console.log(`✅ Disputes: ${finalStats.disputes}`)
    // console.log(`✅ Payments: ${finalStats.payments}`)
    // console.log(`✅ Notifications: ${finalStats.notifications}`)
    // console.log(`✅ File Attachments: ${finalStats.fileAttachments}`)
    // console.log(`✅ Pallet Variances: ${finalStats.palletVariances}`)
    // console.log(`✅ Storage Ledger Entries: ${finalStats.storageLedgerEntries}`)
    // console.log(`✅ Calculated Costs: ${finalStats.calculatedCosts}`)
    // console.log(`✅ Audit Logs: ${finalStats.auditLogs}`)
    // console.log('================================\n')
    
    return finalStats

  } catch (error) {
    // console.error('Error generating demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Export function to clear all demo data
export async function clearDemoData() {
  // console.log('Clearing all demo data...')
  reportProgress('Clearing demo data...', 0)
  
  try {
    await prisma.$transaction([
      prisma.fileAttachment.deleteMany(),
      prisma.palletVariance.deleteMany(),
      prisma.disputeResolution.deleteMany(),
      prisma.invoiceDispute.deleteMany(),
      prisma.invoiceAuditLog.deleteMany(),
      prisma.warehouseNotification.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.invoiceReconciliation.deleteMany(),
      prisma.invoiceLineItem.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.calculatedCost.deleteMany(),
      prisma.storageLedger.deleteMany(),
      prisma.inventoryBalance.deleteMany(),
      prisma.inventoryTransaction.deleteMany(),
      prisma.costRate.deleteMany(),
      prisma.warehouseSkuConfig.deleteMany(),
      prisma.skuVersion.deleteMany(),
      prisma.sku.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.user.deleteMany(),
      prisma.warehouse.deleteMany(),
    ])
    
    // console.log('All demo data cleared successfully!')
  } catch (error) {
    // console.error('Error clearing demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2]
  
  if (command === 'generate') {
    generateDemoData()
      .then(summary => {
        // console.log('\nDemo data generation summary:')
        // console.log(`- Warehouses: ${summary.warehouses}`)
        // console.log(`- Users: ${summary.users}`)
        // console.log(`- SKUs: ${summary.skus}`)
        // console.log(`- Transactions: ${summary.transactions}`)
        // console.log(`- Cost Rates: ${summary.costRates}`)
        // console.log(`- Invoices: ${summary.invoicesGenerated}`)
      })
      .catch(error => {
        // console.error('Failed to generate demo data:', error)
        process.exit(1)
      })
  } else if (command === 'clear') {
    clearDemoData()
      .catch(error => {
        // console.error('Failed to clear demo data:', error)
        process.exit(1)
      })
  } else {
    // console.log('Usage: ts-node demo-data-generator.ts [generate|clear]')
    process.exit(1)
  }
}