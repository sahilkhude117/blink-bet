/**
 * Market Details API
 * GET /api/markets/[ticker]
 * 
 * Returns detailed information about a specific market including:
 * - Current prices (bid/ask)
 * - Volume and open interest
 * - Market status and rules
 * - Settlement information
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKalshiMarketService } from '@/services';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    if (!ticker) {
      return NextResponse.json(
        {
          success: false,
          error: 'Market ticker is required',
        },
        { status: 400 }
      );
    }

    // Get market details from Kalshi
    const marketService = getKalshiMarketService();
    const market = await marketService.getMarket(ticker);

    return NextResponse.json({
      success: true,
      data: market,
    });
  } catch (error: any) {
    console.error(`Failed to get market :`, error);
    
    // Handle 404 for market not found
    if (error.response?.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Market not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch market details',
      },
      { status: error.response?.status || 500 }
    );
  }
}
