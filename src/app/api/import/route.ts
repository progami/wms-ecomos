import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'system_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run the import script
    const scriptPath = path.join(process.cwd(), 'scripts', 'import-excel-data.ts')
    
    try {
      const { stdout, stderr } = await execAsync(`npx tsx ${scriptPath}`)
      
      if (stderr && !stderr.includes('DeprecationWarning')) {
        console.error('Import stderr:', stderr)
      }
      
      // Parse the output to get counts
      const output = stdout
      const skuMatch = output.match(/SKUs: (\d+)/)
      const configMatch = output.match(/Warehouse Configs: (\d+)/)
      const rateMatch = output.match(/Cost Rates: (\d+)/)
      const transactionMatch = output.match(/Transactions: (\d+)/)
      const balanceMatch = output.match(/Active Inventory Items: (\d+)/)
      
      const results = {
        skus: skuMatch ? parseInt(skuMatch[1]) : 0,
        configs: configMatch ? parseInt(configMatch[1]) : 0,
        rates: rateMatch ? parseInt(rateMatch[1]) : 0,
        transactions: transactionMatch ? parseInt(transactionMatch[1]) : 0,
        balances: balanceMatch ? parseInt(balanceMatch[1]) : 0,
      }
      
      return NextResponse.json({
        success: true,
        message: 'Import completed successfully',
        ...results,
      })
    } catch (error) {
      console.error('Import script error:', error)
      return NextResponse.json({ 
        error: 'Import script failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: 'Import failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}