/**
 * Events API - Browse all events
 * GET /api/events
 * 
 * Query Parameters:
 * - limit: number (default: 20, max: 200)
 * - cursor: string (pagination)
 * - with_nested_markets: boolean (include markets in response)
 * - status: 'open' | 'closed' | 'settled'
 * - series_ticker: string (filter by series)
 * - min_close_ts: number (timestamp)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKalshiMarketService } from '@/services';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const params: any = {};
    
    const limit = searchParams.get('limit');
    if (limit) params.limit = Math.min(parseInt(limit), 200);
    
    const cursor = searchParams.get('cursor');
    if (cursor) params.cursor = cursor;
    
    const withNestedMarkets = searchParams.get('with_nested_markets');
    if (withNestedMarkets !== null) {
      params.with_nested_markets = withNestedMarkets === 'true';
    }
    
    const status = searchParams.get('status');
    if (status) params.status = status;
    
    const seriesTicker = searchParams.get('series_ticker');
    if (seriesTicker) params.series_ticker = seriesTicker;
    
    const minCloseTs = searchParams.get('min_close_ts');
    if (minCloseTs) params.min_close_ts = parseInt(minCloseTs);

    // Get events from Kalshi
    const marketService = getKalshiMarketService();
    const result = await marketService.getEvents(params);

    return NextResponse.json({
      success: true,
      data: {
        events: result.events,
        cursor: result.cursor,
        count: result.events.length,
      },
    });
  } catch (error: any) {
    console.error('Failed to get events:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch events',
      },
      { status: error.response?.status || 500 }
    );
  }
}
