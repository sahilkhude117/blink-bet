/**
 * Cancel Market Orders API Route - Cancel all orders for a specific market
 * DELETE /api/orders/market/:ticker/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';
import { getKalshiTradeService } from '@/services/kalshi-trade.service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'userId query parameter is required',
        },
        { status: 400 }
      );
    }

    // Get active orders for this market
    const activeOrders = await prisma.order.findMany({
      where: {
        userId,
        ticker,
        status: {
          in: ['PENDING', 'RESTING', 'PARTIALLY_FILLED'],
        },
      },
    });

    if (activeOrders.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No active orders to cancel',
          canceledCount: 0,
        },
      });
    }

    // Cancel each order on Kalshi
    const tradeService = getKalshiTradeService();
    const cancelResults = [];

    for (const order of activeOrders) {
      if (order.kalshiOrderId) {
        try {
          await tradeService.cancelOrder(order.kalshiOrderId);
          
          // Update in database
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'CANCELED',
            },
          });

          cancelResults.push({
            orderId: order.id,
            kalshiOrderId: order.kalshiOrderId,
            success: true,
          });
        } catch (error: any) {
          console.error(`Failed to cancel order ${order.id}:`, error);
          cancelResults.push({
            orderId: order.id,
            kalshiOrderId: order.kalshiOrderId,
            success: false,
            error: error.message,
          });
        }
      }
    }

    const successCount = cancelResults.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        message: `Canceled ${successCount} of ${activeOrders.length} orders`,
        canceledCount: successCount,
        totalOrders: activeOrders.length,
        results: cancelResults,
      },
    });
  } catch (error: any) {
    console.error('Error canceling market orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to cancel market orders',
      },
      { status: 500 }
    );
  }
}
