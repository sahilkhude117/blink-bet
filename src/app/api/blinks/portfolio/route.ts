/**
 * Portfolio Blink - View user positions and P&L
 * GET /api/blinks/portfolio
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  ActionError, 
  ActionGetResponse, 
  createActionHeaders 
} from '@solana/actions';
import { getKalshiTradeService } from '@/services';

const headers = createActionHeaders();

export async function GET(req: NextRequest) {
  try {
    const requestUrl = new URL(req.url);
    const account = requestUrl.searchParams.get('account');

    if (!account) {
      const error: ActionError = {
        message: 'Wallet address is required',
      };
      return NextResponse.json(error, { status: 400, headers });
    }

    // Get Kalshi portfolio data directly from API
    const tradeService = getKalshiTradeService();
    
    try {
      // Get balance and positions from Kalshi API
      const balance = await tradeService.getBalance();
      const portfolioData = await tradeService.getPositions({ 
        count_filter: 'position',
        limit: 100 
      });

      const positions = portfolioData.market_positions.filter(p => p.position !== 0);

      if (positions.length === 0) {
        const payload: ActionGetResponse = {
          type: 'action',
          title: '📊 No Active Positions',
          icon: 'https://kalshi.com/favicon.ico',
          description: [
            `💰 Balance: $${(balance.balance / 100).toFixed(2)}`,
            `📈 Portfolio Value: $${(balance.portfolio_value / 100).toFixed(2)}`,
            ``,
            "You don't have any active positions. Start trading to build your portfolio!"
          ].join('\n'),
          label: 'Get Started',
          links: {
            actions: [
              {
                label: 'Browse Markets',
                href: `${requestUrl.origin}/api/blinks/markets`,
                type: 'external-link',
              },
            ],
          },
        };
        return NextResponse.json(payload, { headers });
      }

      // Calculate totals from Kalshi API data
      const totalPnl = positions.reduce((sum, p) => sum + (p.realized_pnl || 0), 0);
      const totalExposure = positions.reduce((sum, p) => sum + (p.market_exposure || 0), 0);
      const totalFees = positions.reduce((sum, p) => sum + (p.fees_paid || 0), 0);

      const baseUrl = `${requestUrl.origin}/api/blinks/markets`;

      const payload: ActionGetResponse = {
        type: 'action',
        title: '📊 Your Kalshi Portfolio',
        icon: 'https://kalshi.com/favicon.ico',
        description: [
          `💰 Balance: $${(balance.balance / 100).toFixed(2)}`,
          `📈 Portfolio Value: $${(balance.portfolio_value / 100).toFixed(2)}`,
          `${totalPnl >= 0 ? '🟢' : '🔴'} Total P&L: ${totalPnl >= 0 ? '+' : ''}$${(totalPnl / 100).toFixed(2)}`,
          `💼 Active Positions: ${positions.length}`,
          `💸 Total Fees: $${(totalFees / 100).toFixed(2)}`,
          ``,
          positions.length > 0 ? '📋 Top Positions:' : '',
          ...positions.slice(0, 3).map(p => {
            const side = p.position > 0 ? 'YES' : 'NO';
            const shares = Math.abs(p.position);
            const pnl = p.realized_pnl || 0;
            return `• ${p.ticker}: ${shares} ${side} (${pnl >= 0 ? '+' : ''}$${(pnl / 100).toFixed(2)})`;
          }),
        ].filter(Boolean).join('\n'),
        label: 'View Portfolio',
        links: {
          actions: [
            {
              label: 'Browse Markets',
              href: `${requestUrl.origin}/api/blinks/markets`,
              type: 'external-link',
            },
            ...positions.slice(0, 3).map((position) => ({
              label: `Trade ${position.ticker}`,
              href: `${baseUrl}/${position.ticker}?account=${account}`,
              type: 'external-link' as const,
            })),
          ],
        },
      };

      return NextResponse.json(payload, { headers });
    } catch (kalshiError: any) {
      console.error('Error fetching Kalshi portfolio:', kalshiError);
      
      // If it's a 401, user needs to connect their Kalshi account
      if (kalshiError.response?.status === 401) {
        const error: ActionError = {
          message: 'Kalshi account not connected. Please link your account at kalshi.com',
        };
        return NextResponse.json(error, { status: 401, headers });
      }
      
      const error: ActionError = {
        message: kalshiError.message || 'Failed to load portfolio from Kalshi',
      };
      return NextResponse.json(error, { status: 500, headers });
    }
  } catch (error: any) {
    console.error('Error in portfolio blink:', error);
    const actionError: ActionError = {
      message: error.message || 'Failed to load portfolio',
    };
    return NextResponse.json(actionError, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers });
}
