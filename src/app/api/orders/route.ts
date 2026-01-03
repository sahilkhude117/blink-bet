/**
 * Create Order API Route - Create a new order
 * POST /api/orders
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';
import { getKalshiTradeService } from '@/services/kalshi-trade.service';
import { CreateOrderParams } from '@/services/kalshi.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      ticker,
      side,
      action,
      count,
      type = 'market',
      yesPrice,
      noPrice,
      clientOrderId,
    } = body;

    // Validation
    if (!userId || !ticker || !side || !action || !count) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, ticker, side, action, count',
        },
        { status: 400 }
      );
    }

    // Get event ticker from market ticker
    const eventTicker = ticker.split('-')[0];

    // Create order params for Kalshi
    const orderParams: CreateOrderParams = {
      ticker,
      side: side.toLowerCase(),
      action: action.toLowerCase(),
      count,
      type: type.toLowerCase(),
      client_order_id: clientOrderId || `order_${Date.now()}`,
    };

    if (type === 'limit') {
      if (side.toLowerCase() === 'yes' && yesPrice) {
        orderParams.yes_price = yesPrice;
      } else if (side.toLowerCase() === 'no' && noPrice) {
        orderParams.no_price = noPrice;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Limit orders require price (yesPrice or noPrice)',
          },
          { status: 400 }
        );
      }
    }

    // Submit order to Kalshi
    const tradeService = getKalshiTradeService();
    let kalshiOrder;
    
    try {
      kalshiOrder = await tradeService.createOrder(orderParams);
    } catch (kalshiError: any) {
      // If Kalshi API fails, still save order as FAILED
      const failedOrder = await prisma.order.create({
        data: {
          userId,
          ticker,
          eventTicker,
          side: side.toUpperCase(),
          action: action.toUpperCase(),
          type: type.toUpperCase(),
          count,
          yesPrice: yesPrice || null,
          noPrice: noPrice || null,
          status: 'FAILED',
          errorMessage: kalshiError.message || 'Kalshi API error',
          clientOrderId: orderParams.client_order_id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: kalshiError.message || 'Failed to create order on Kalshi',
          data: { order: failedOrder },
        },
        { status: 400 }
      );
    }

    // Save order to database
    const order = await prisma.order.create({
      data: {
        userId,
        kalshiOrderId: kalshiOrder.order_id,
        ticker,
        eventTicker,
        side: side.toUpperCase(),
        action: action.toUpperCase(),
        type: type.toUpperCase(),
        count,
        yesPrice: kalshiOrder.yes_price || null,
        noPrice: kalshiOrder.no_price || null,
        yesPriceDollars: kalshiOrder.yes_price_dollars || null,
        noPriceDollars: kalshiOrder.no_price_dollars || null,
        fillCount: kalshiOrder.fill_count || 0,
        remainingCount: kalshiOrder.remaining_count || count,
        takerFees: kalshiOrder.taker_fees || 0,
        makerFees: kalshiOrder.maker_fees || 0,
        takerFeesDollars: kalshiOrder.taker_fees_dollars || null,
        makerFeesDollars: kalshiOrder.maker_fees_dollars || null,
        status: kalshiOrder.status.toUpperCase() as any,
        clientOrderId: kalshiOrder.client_order_id || orderParams.client_order_id,
        queuePosition: kalshiOrder.queue_position || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        order,
        kalshiOrder,
        message: 'Order created successfully',
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create order',
      },
      { status: 500 }
    );
  }
}
