/**
 * Event Multi-Market Blink - View all markets for an event
 * GET /api/actions/event/:eventTicker
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ActionError,
  ActionGetResponse,
  createActionHeaders,
  BLOCKCHAIN_IDS,
} from '@solana/actions';
import { getKalshiMarketService } from '@/services';

const headers = {
  ...createActionHeaders(),
  "X-Blockchain-Ids": BLOCKCHAIN_IDS.mainnet,
  "X-Action-Version": "2.4"
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventTicker: string }> }
) {
  try {
    const { eventTicker } = await params;

    if (!eventTicker || typeof eventTicker !== 'string') {
      const error: ActionError = { message: 'Event identifier is required' };
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

    const baseUrl = `${requestUrl.origin}/api/actions/market`;

    // Build market summary for description
    const marketSummaries = openMarkets.slice(0, 5).map(m => {
      const yesPrice = m.yes_ask || m.last_price || m.yes_bid || 50;
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
        'Quick trade with one click - $10 per trade:',
        '',
        ...marketSummaries,
        openMarkets.length > 5 ? `\n...and ${openMarkets.length - 5} more markets` : '',
      ].filter(Boolean).join('\n'),
      label: 'Quick Trade',
      links: {
        actions: openMarkets.slice(0, 3).flatMap((market) => {
          // Show ask prices (what you'd pay to buy) with fallbacks
          const yesPrice = market.yes_ask || market.last_price || market.yes_bid || 50;
          const noPrice = market.no_ask || market.last_price || market.no_bid || 50;
          const marketTitle = market.title.length > 25 
            ? `${market.title.slice(0, 25)}...` 
            : market.title;
          
          return [
            {
              type: 'post' as const,
              label: `${marketTitle} - YES ${yesPrice}¢`,
              href: `${baseUrl}/quick/${market.ticker}/yes?amount=10`,
            },
            {
              type: 'post' as const,
              label: `${marketTitle} - NO ${noPrice}¢`,
              href: `${baseUrl}/quick/${market.ticker}/no?amount=10`,
            },
          ];
        }),
      },
    };

    return NextResponse.json(payload, { headers });
  } catch (e: any) {
    console.error('[Event Blink] Error loading event:', e);
    
    // Handle 404 for event not found
    if (e.response?.status === 404) {
      const error: ActionError = {
        message: 'Event not found. It may have closed or been removed.',
      };
      return NextResponse.json(error, { status: 404, headers });
    }

    const error: ActionError = {
      message: e.message || 'Unable to load event markets. Please try again.',
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
