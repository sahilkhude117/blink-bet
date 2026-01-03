/**
 * Order History API Route - Get completed/canceled orders for a user
 * GET /api/orders/user/:userId/history
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
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    const where = {
      userId,
      status: {
        in: [OrderStatus.EXECUTED, OrderStatus.CANCELED, OrderStatus.EXPIRED, OrderStatus.FAILED],
      },
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { updatedTime: 'desc' },
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10),
      }),
      prisma.order.count({ where }),
    ]);

    // Calculate history summary
    const summary = {
      totalHistoricalOrders: total,
      executed: orders.filter(o => o.status === 'EXECUTED').length,
      canceled: orders.filter(o => o.status === 'CANCELED').length,
      expired: orders.filter(o => o.status === 'EXPIRED').length,
      failed: orders.filter(o => o.status === 'FAILED').length,
      totalFilled: orders.reduce((sum, o) => sum + o.fillCount, 0),
      totalCost: orders.reduce((sum, o) => sum + (o.totalCost || 0), 0),
      totalFees: orders.reduce((sum, o) => sum + o.takerFees + o.makerFees, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        orders,
        summary,
        pagination: {
          total,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching order history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch order history',
      },
      { status: 500 }
    );
  }
}
