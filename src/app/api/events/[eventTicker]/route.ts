/**
 * Event Details API
 * GET /api/events/[eventTicker]
 * 
 * Query Parameters:
 * - with_nested_markets: boolean (default: true) - Include all markets for this event
 * 
 * Returns detailed information about a specific event including:
 * - Event metadata and description
 * - Associated markets (if with_nested_markets=true)
 * - Category and series information
 * - Strike date and period
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKalshiMarketService } from '@/services';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventTicker: string }> }
) {
  try {
    const { eventTicker } = await params;

    if (!eventTicker) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event ticker is required',
        },
        { status: 400 }
      );
    }

    // Check if we should include nested markets
    const searchParams = request.nextUrl.searchParams;
    const withNestedMarkets = searchParams.get('with_nested_markets') !== 'false';

    // Get event details from Kalshi
    const marketService = getKalshiMarketService();
    const event = await marketService.getEvent(eventTicker, withNestedMarkets);

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    console.error(`Failed to get event `, error);
    
    // Handle 404 for event not found
    if (error.response?.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch event details',
      },
      { status: error.response?.status || 500 }
    );
  }
}
