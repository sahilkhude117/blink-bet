/**
 * Order API Route - Get, update, or delete a specific order
 * GET /api/orders/:orderId - Get order details
 * DELETE /api/orders/:orderId - Cancel order
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';
import { getKalshiTradeService } from '@/services/kalshi-trade.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            externalId: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch order',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    // Get order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      );
    }

    // Check if order can be canceled
    if (order.status === 'EXECUTED' || order.status === 'CANCELED' || order.status === 'EXPIRED') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot cancel order with status: ${order.status}`,
        },
        { status: 400 }
      );
    }

    // Cancel on Kalshi if we have a Kalshi order ID
    if (order.kalshiOrderId) {
      try {
        const tradeService = getKalshiTradeService();
        await tradeService.cancelOrder(order.kalshiOrderId);
      } catch (kalshiError: any) {
        console.error('Failed to cancel on Kalshi:', kalshiError);
        // Continue to update local status even if Kalshi fails
      }
    }

    // Update order status in database
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELED',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        order: updatedOrder,
        message: 'Order canceled successfully',
      },
    });
  } catch (error: any) {
    console.error('Error canceling order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to cancel order',
      },
      { status: 500 }
    );
  }
}
