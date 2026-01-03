/**
 * Orders API Route - Get all orders for a user
 * GET /api/orders/user/:userId
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const ticker = searchParams.get('ticker');
    const eventTicker = searchParams.get('eventTicker');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset') || '0';

    // Build where clause
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (ticker) {
      where.ticker = ticker;
    }

    if (eventTicker) {
      where.eventTicker = eventTicker;
    }

    // Query options
    const queryOptions: any = {
      where,
      orderBy: { createdTime: 'desc' },
      skip: parseInt(offset, 10),
    };

    if (limit) {
      queryOptions.take = parseInt(limit, 10);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany(queryOptions),
      prisma.order.count({ where }),
    ]);

    // Calculate summary stats
    const summary = {
      totalOrders: total,
      pending: orders.filter(o => o.status === 'PENDING').length,
      resting: orders.filter(o => o.status === 'RESTING').length,
      executed: orders.filter(o => o.status === 'EXECUTED').length,
      canceled: orders.filter(o => o.status === 'CANCELED').length,
      failed: orders.filter(o => o.status === 'FAILED').length,
      totalFilled: orders.reduce((sum, o) => sum + o.fillCount, 0),
      totalCost: orders.reduce((sum, o) => sum + (o.totalCost || 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        orders,
        summary,
        pagination: {
          total,
          limit: limit ? parseInt(limit, 10) : orders.length,
          offset: parseInt(offset, 10),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch orders',
      },
      { status: 500 }
    );
  }
}
