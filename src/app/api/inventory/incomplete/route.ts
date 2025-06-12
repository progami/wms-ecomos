import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic'

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get incomplete transactions based on user's warehouse
    const whereClause = session.user.role === 'staff' && session.user.warehouseId
      ? { warehouseId: session.user.warehouseId }
      : {};

    // Find RECEIVE transactions missing tracking number or pickup date
    const incompleteReceive = await prisma.inventoryTransaction.findMany({
      where: {
        ...whereClause,
        transactionType: 'RECEIVE',
        OR: [
          { trackingNumber: null },
          { pickupDate: null }
        ]
      },
      select: {
        id: true,
        transactionId: true,
        transactionType: true,
        transactionDate: true,
        trackingNumber: true,
        pickupDate: true,
        attachments: true,
        sku: {
          select: { skuCode: true }
        }
      },
      take: 10,
      orderBy: { transactionDate: 'desc' }
    });

    // Find SHIP transactions missing pickup date
    const incompleteShip = await prisma.inventoryTransaction.findMany({
      where: {
        ...whereClause,
        transactionType: 'SHIP',
        pickupDate: null
      },
      select: {
        id: true,
        transactionId: true,
        transactionType: true,
        transactionDate: true,
        pickupDate: true,
        attachments: true,
        sku: {
          select: { skuCode: true }
        }
      },
      take: 10,
      orderBy: { transactionDate: 'desc' }
    });

    // Format response with missing fields
    const formatTransaction = (tx: any) => {
      const missingFields = [];
      
      if (tx.transactionType === 'RECEIVE') {
        if (!tx.trackingNumber) missingFields.push('tracking_number');
        if (!tx.pickupDate) missingFields.push('pickup_date');
      } else if (tx.transactionType === 'SHIP') {
        if (!tx.pickupDate) missingFields.push('pickup_date');
      }
      
      if (!tx.attachments || Object.keys(tx.attachments as any).length === 0) {
        missingFields.push('attachments');
      }

      return {
        id: tx.id,
        transactionId: tx.transactionId,
        transactionType: tx.transactionType,
        skuCode: tx.sku.skuCode,
        transactionDate: tx.transactionDate,
        missingFields
      };
    };

    const allIncomplete = [
      ...incompleteReceive.map(formatTransaction),
      ...incompleteShip.map(formatTransaction)
    ].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

    return NextResponse.json(allIncomplete);
  } catch (error) {
    console.error('Error fetching incomplete transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch incomplete transactions' },
      { status: 500 }
    );
  }
}