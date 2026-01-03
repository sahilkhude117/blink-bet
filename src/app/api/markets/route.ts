/**
 * Markets API - Browse all markets
 * GET /api/markets
 * 
 * Query Parameters:
 * - limit: number (default: 20, max: 200)
 * - cursor: string (pagination)
 * - event_ticker: string (filter by event)
 * - series_ticker: string (filter by series)
 * - status: 'unopened' | 'open' | 'paused' | 'closed' | 'settled'
 * - min_close_ts: number (timestamp)
 * - max_close_ts: number (timestamp)
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
    
    const eventTicker = searchParams.get('event_ticker');
    if (eventTicker) params.event_ticker = eventTicker;
    
    const seriesTicker = searchParams.get('series_ticker');
    if (seriesTicker) params.series_ticker = seriesTicker;
    
    const status = searchParams.get('status');
    if (status) params.status = status;
    
    const minCloseTs = searchParams.get('min_close_ts');
    if (minCloseTs) params.min_close_ts = parseInt(minCloseTs);
    
    const maxCloseTs = searchParams.get('max_close_ts');
    if (maxCloseTs) params.max_close_ts = parseInt(maxCloseTs);
    
    const minCreatedTs = searchParams.get('min_created_ts');
    if (minCreatedTs) params.min_created_ts = parseInt(minCreatedTs);
    
    const maxCreatedTs = searchParams.get('max_created_ts');
    if (maxCreatedTs) params.max_created_ts = parseInt(maxCreatedTs);

    // Get markets from Kalshi
    const marketService = getKalshiMarketService();
    const result = await marketService.getMarkets(params);

    return NextResponse.json({
      success: true,
      data: {
        markets: result.markets,
        cursor: result.cursor,
        count: result.markets.length,
      },
    });
  } catch (error: any) {
    console.error('Failed to get markets:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch markets',
      },
      { status: error.response?.status || 500 }
    );
  }
}
