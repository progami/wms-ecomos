import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { pool } from '@/lib/db'

// GET /api/skus-simple - List SKUs
export async function GET(request: NextRequest) {
  console.log('Simple SKUs API called')
  
  try {
    const session = await getServerSession(authOptions)
    console.log('Session in SKUs API:', session)
    
    // For testing, temporarily disable auth check
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Build query
    let query = `
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM inventory_balances WHERE sku_id = s.id) as inventory_count,
        (SELECT COUNT(*) FROM warehouse_sku_configs WHERE sku_id = s.id) as config_count
      FROM skus s
      WHERE 1=1
    `
    const params: any[] = []
    
    if (!includeInactive) {
      query += ' AND s.is_active = true'
    }

    if (search) {
      params.push(`%${search}%`)
      query += ` AND (
        s.sku_code ILIKE $${params.length} OR 
        s.description ILIKE $${params.length} OR 
        s.asin ILIKE $${params.length}
      )`
    }

    query += ' ORDER BY s.sku_code ASC'

    const result = await pool.query(query, params)
    
    // Transform to match expected format
    const skus = result.rows.map(row => ({
      id: row.id,
      skuCode: row.sku_code,
      description: row.description,
      asin: row.asin,
      packSize: row.pack_size,
      material: row.material,
      unitsPerCarton: row.units_per_carton,
      cartonWeightKg: row.carton_weight_kg,
      cartonDimensionsCm: row.carton_dimensions_cm,
      packagingType: row.packaging_type,
      isActive: row.is_active,
      _count: {
        inventoryBalances: parseInt(row.inventory_count),
        warehouseConfigs: parseInt(row.config_count)
      }
    }))

    return NextResponse.json(skus)
  } catch (error) {
    console.error('Error fetching SKUs:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch SKUs', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

// POST /api/skus-simple - Create new SKU
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // For testing, temporarily disable auth check
    // if (!session || !['system_admin', 'finance_admin'].includes(session.user.role)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    
    // Basic validation
    if (!body.skuCode || !body.description || !body.packSize || !body.unitsPerCarton) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if SKU code already exists
    const existingCheck = await pool.query(
      'SELECT id FROM skus WHERE sku_code = $1',
      [body.skuCode]
    )

    if (existingCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'SKU code already exists' },
        { status: 400 }
      )
    }

    // Insert new SKU
    const insertResult = await pool.query(`
      INSERT INTO skus (
        sku_code, asin, description, pack_size, material,
        unit_dimensions_cm, unit_weight_kg, units_per_carton,
        carton_dimensions_cm, carton_weight_kg, packaging_type,
        notes, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      body.skuCode,
      body.asin || null,
      body.description,
      body.packSize,
      body.material || null,
      body.unitDimensionsCm || null,
      body.unitWeightKg || null,
      body.unitsPerCarton,
      body.cartonDimensionsCm || null,
      body.cartonWeightKg || null,
      body.packagingType || null,
      body.notes || null,
      body.isActive !== false
    ])

    return NextResponse.json({
      id: insertResult.rows[0].id,
      skuCode: insertResult.rows[0].sku_code,
      description: insertResult.rows[0].description
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating SKU:', error)
    return NextResponse.json({ 
      error: 'Failed to create SKU',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PATCH /api/skus-simple - Update SKU
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // For testing, temporarily disable auth check
    // if (!session || !['system_admin', 'finance_admin'].includes(session.user.role)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const skuId = searchParams.get('id')
    
    if (!skuId) {
      return NextResponse.json(
        { error: 'SKU ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // Simple toggle active status
    if (body.isActive !== undefined) {
      await pool.query(
        'UPDATE skus SET is_active = $1 WHERE id = $2',
        [body.isActive, skuId]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
  } catch (error) {
    console.error('Error updating SKU:', error)
    return NextResponse.json({ 
      error: 'Failed to update SKU',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/skus-simple - Delete SKU
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // For testing, temporarily disable auth check
    // if (!session || session.user.role !== 'system_admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const skuId = searchParams.get('id')
    
    if (!skuId) {
      return NextResponse.json(
        { error: 'SKU ID is required' },
        { status: 400 }
      )
    }

    // Check if SKU has related data
    const relatedDataCheck = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM inventory_balances WHERE sku_id = $1) as inventory_count,
        (SELECT COUNT(*) FROM inventory_transactions WHERE sku_id = $1) as transaction_count
    `, [skuId])
    
    const counts = relatedDataCheck.rows[0]
    const hasRelatedData = parseInt(counts.inventory_count) > 0 || parseInt(counts.transaction_count) > 0
    
    if (hasRelatedData) {
      // Soft delete - just mark as inactive
      await pool.query(
        'UPDATE skus SET is_active = false WHERE id = $1',
        [skuId]
      )

      return NextResponse.json({
        message: 'SKU deactivated (has related data)'
      })
    } else {
      // Hard delete - no related data
      await pool.query(
        'DELETE FROM skus WHERE id = $1',
        [skuId]
      )

      return NextResponse.json({
        message: 'SKU deleted successfully'
      })
    }
  } catch (error) {
    console.error('Error deleting SKU:', error)
    return NextResponse.json({ 
      error: 'Failed to delete SKU',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}