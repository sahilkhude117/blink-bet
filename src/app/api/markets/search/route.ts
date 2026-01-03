/**
 * Market Search API
 * GET /api/markets/search
 * 
 * Query Parameters:
 * - q: string (search query - required)
 * - limit: number (default: 20, max: 100)
 * - status: 'open' | 'closed' | 'settled' (optional)
 * 
 * Searches markets by ticker and title
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKalshiMarketService } from '@/services';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const query = searchParams.get('q');
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query (q) is required',
        },
        { status: 400 }
      );
    }

    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20'),
      100
    );
    
    const status = searchParams.get('status') as 'open' | 'closed' | 'settled' | undefined;

    // Get all markets and filter
    const marketService = getKalshiMarketService();
    const lowerQuery = query.toLowerCase();
    
    // Fetch markets with status filter if provided
    const params: any = { limit: 200 };
    if (status) {
      params.status = status;
    }

    let allMatches: any[] = [];
    let cursor: string | undefined = undefined;

    // Paginate through results until we have enough matches or no more data
    do {
      if (cursor) {
        params.cursor = cursor;
      }

      const result = await marketService.getMarkets(params);
      
      // Filter markets by search query
      const matches = result.markets.filter((market) =>
        market.ticker.toLowerCase().includes(lowerQuery) ||
        market.title.toLowerCase().includes(lowerQuery) ||
        market.subtitle?.toLowerCase().includes(lowerQuery)
      );

      allMatches.push(...matches);
      cursor = result.cursor;

      // Stop if we have enough matches or no more data
      if (allMatches.length >= limit || !cursor) {
        break;
      }
    } while (cursor);

    // Return limited results
    const results = allMatches.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        markets: results,
        count: results.length,
        query,
      },
    });
  } catch (error: any) {
    console.error('Market search failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Market search failed',
      },
      { status: error.response?.status || 500 }
    );
  }
}
