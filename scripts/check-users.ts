import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('Checking users in database...\n')
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      role: true,
      isDemo: true,
      isActive: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
  
  console.log(`Found ${users.length} users:\n`)
  
  users.forEach(user => {
    console.log(`Username: ${user.username || 'N/A'}`)
    console.log(`Email: ${user.email}`)
    console.log(`Name: ${user.fullName}`)
    console.log(`Role: ${user.role}`)
    console.log(`Demo: ${user.isDemo}`)
    console.log(`Active: ${user.isActive}`)
    console.log(`Created: ${user.createdAt}`)
    console.log('---')
  })
  
  await prisma.$disconnect()
}

checkUsers().catch(console.error)