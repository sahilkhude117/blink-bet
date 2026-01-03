/**
 * Event Multi-Market Blink - View all markets for an event
 * GET /api/blinks/event/:eventTicker
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ActionError,
  ActionGetResponse,
  createActionHeaders,
} from '@solana/actions';
import { getKalshiMarketService } from '@/services';

const headers = createActionHeaders();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventTicker: string }> }
) {
  try {
    const { eventTicker } = await params;

    if (!eventTicker || typeof eventTicker !== 'string') {
      const error: ActionError = { message: 'Event ticker is required' };
      return NextResponse.json(error, {
        status: 400,
        headers,
      });
    }

    const requestUrl = new URL(req.url);
    const marketService = getKalshiMarketService();

    // Get event with all nested markets
    const event = await marketService.getEvent(eventTicker, true);

    if (!event.markets || event.markets.length === 0) {
      const error: ActionError = {
        message: `No markets found for event ${eventTicker}`,
      };
      return NextResponse.json(error, {
        status: 404,
        headers,
      });
    }

    // Filter only open markets
    const openMarkets = event.markets.filter(m => m.status === 'open');

    if (openMarkets.length === 0) {
      const error: ActionError = {
        message: `No open markets available for ${event.title}`,
      };
      return NextResponse.json(error, {
        status: 404,
        headers,
      });
    }

    const baseUrl = `${requestUrl.origin}/api/blinks/markets`;

    // Build market summary for description
    const marketSummaries = openMarkets.slice(0, 5).map(m => {
      const yesPrice = m.yes_bid || m.last_price || 0;
      return `• ${m.title}: YES ${yesPrice}¢`;
    });

    const payload: ActionGetResponse = {
      type: 'action',
      title: `🗳️ ${event.title}`,
      icon: 'https://kalshi.com/favicon.ico',
      description: [
        event.sub_title || '',
        '',
        `📊 ${openMarkets.length} Markets Available`,
        '',
        ...marketSummaries,
        openMarkets.length > 5 ? `\n...and ${openMarkets.length - 5} more` : '',
      ].filter(Boolean).join('\n'),
      label: 'View Markets',
      links: {
        actions: openMarkets.map((market) => {
          const yesPrice = market.yes_bid || market.last_price || 0;
          const marketTitle = market.title.length > 35 
            ? `${market.title.slice(0, 35)}...` 
            : market.title;
          
          return {
            label: `Trade: ${marketTitle} (${yesPrice}¢)`,
            href: `${baseUrl}/${market.ticker}`,
            type: 'external-link' as const,
          };
        }),
      },
    };

    return NextResponse.json(payload, { headers });
  } catch (e: any) {
    console.error('Error in event blink:', e);
    
    // Handle 404 for event not found
    if (e.response?.status === 404) {
      const error: ActionError = {
        message: 'Event not found',
      };
      return NextResponse.json(error, { status: 404, headers });
    }

    const error: ActionError = {
      message: e.message || 'Failed to load event markets',
    };
    return NextResponse.json(error, {
      status: 500,
      headers,
    });
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers });
}
