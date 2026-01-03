/**
 * Event Orders API Route - Get all orders for a specific event
 * GET /api/orders/event/:eventTicker
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventTicker: string }> }
) {
  try {
    const { eventTicker } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where: any = { eventTicker };

    if (userId) {
      where.userId = userId;
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
          message: 'No orders found for this event',
        },
      });
    }

    // Group orders by market ticker
    const ordersByMarket = orders.reduce((acc, order) => {
      if (!acc[order.ticker]) {
        acc[order.ticker] = [];
      }
      acc[order.ticker].push(order);
      return acc;
    }, {} as Record<string, typeof orders>);

    // Calculate event order summary
    const summary = {
      totalOrders: orders.length,
      uniqueMarkets: Object.keys(ordersByMarket).length,
      activeOrders: orders.filter(o => ['PENDING', 'RESTING', 'PARTIALLY_FILLED'].includes(o.status)).length,
      executedOrders: orders.filter(o => o.status === 'EXECUTED').length,
      totalVolume: orders.reduce((sum, o) => sum + o.fillCount, 0),
      totalCost: orders.reduce((sum, o) => sum + (o.totalCost || 0), 0),
      totalFees: orders.reduce((sum, o) => sum + o.takerFees + o.makerFees, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        eventTicker,
        orders,
        ordersByMarket,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching event orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch event orders',
      },
      { status: 500 }
    );
  }
}
