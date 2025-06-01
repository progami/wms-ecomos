import { NextResponse } from 'next/server'

export async function GET() {
  console.log('Test dashboard API route called')
  
  return NextResponse.json({
    message: 'Test API is working',
    timestamp: new Date().toISOString(),
    data: {
      stats: {
        totalInventory: 1234,
        inventoryChange: '5.2',
        inventoryTrend: 'up',
        storageCost: '15000.00',
        costChange: '3.1',
        costTrend: 'down',
        activeSkus: 42,
        pendingInvoices: 3,
        overdueInvoices: 0
      },
      systemInfo: {
        totalUsers: 5,
        totalTransactions: 150,
        dbSize: 12.5
      }
    }
  })
}