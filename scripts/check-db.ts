import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Check users
    const users = await prisma.user.findMany()
    console.log('Users in database:', users.length)
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role})`)
    })
    
    // Check warehouses
    const warehouses = await prisma.warehouse.findMany()
    console.log('\nWarehouses:', warehouses.length)
    
    // Check SKUs
    const skus = await prisma.sku.findMany()
    console.log('SKUs:', skus.length)
    
    // Check inventory
    const inventory = await prisma.inventoryBalance.findMany()
    console.log('Inventory balances:', inventory.length)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()