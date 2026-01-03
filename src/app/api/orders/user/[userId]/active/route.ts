/**
 * Active Orders API Route - Get active orders for a user
 * GET /api/orders/user/:userId/active
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';
import { OrderStatus } from '@/generated/prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');

    const where: any = {
      userId,
      status: {
        in: [OrderStatus.PENDING, OrderStatus.RESTING, OrderStatus.PARTIALLY_FILLED],
      },
    };

    if (ticker) {
      where.ticker = ticker;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdTime: 'desc' },
    });

    // Calculate summary
    const summary = {
      totalActiveOrders: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      resting: orders.filter(o => o.status === 'RESTING').length,
      partiallyFilled: orders.filter(o => o.status === 'PARTIALLY_FILLED').length,
      totalCommitted: orders.reduce((sum, o) => sum + (o.totalCost || 0), 0),
      totalFees: orders.reduce((sum, o) => sum + o.takerFees + o.makerFees, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        orders,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching active orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch active orders',
      },
      { status: 500 }
    );
  }
}
