/**
 * Market Orders API Route - Get all orders for a specific market
 * GET /api/orders/market/:ticker
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const where: any = { ticker };

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            externalId: true,
            username: true,
          },
        },
      },
      orderBy: { createdTime: 'desc' },
    });

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          orders: [],
          message: 'No orders found for this market',
        },
      });
    }

    // Calculate market order summary
    const summary = {
      totalOrders: orders.length,
      buyOrders: orders.filter(o => o.action === 'BUY').length,
      sellOrders: orders.filter(o => o.action === 'SELL').length,
      yesOrders: orders.filter(o => o.side === 'YES').length,
      noOrders: orders.filter(o => o.side === 'NO').length,
      activeOrders: orders.filter(o => ['PENDING', 'RESTING', 'PARTIALLY_FILLED'].includes(o.status)).length,
      executedOrders: orders.filter(o => o.status === 'EXECUTED').length,
      totalVolume: orders.reduce((sum, o) => sum + o.fillCount, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        ticker,
        orders,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching market orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch market orders',
      },
      { status: 500 }
    );
  }
}
