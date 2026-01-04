/**
 * Portfolio Blink - View user positions and P&L
 * GET /api/actions/portfolio
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  ActionError, 
  ActionGetResponse, 
  createActionHeaders,
  BLOCKCHAIN_IDS
} from '@solana/actions';
import { getKalshiTradeService } from '@/services';


const headers = {
  ...createActionHeaders(),
  "X-Blockchain-Ids": BLOCKCHAIN_IDS.mainnet,
  "X-Action-Version": "2.4"
};

export async function GET(req: NextRequest) {
  try {
    const requestUrl = new URL(req.url);
    
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
            `💰 **Balance**: $${(balance.balance / 100).toFixed(2)}`,
            `📈 **Portfolio Value**: $${(balance.portfolio_value / 100).toFixed(2)}`,
            ``,
            "You don't have any active positions yet.",
            "Start trading to build your portfolio!"
          ].join('\n'),
          label: 'Browse Markets',
          links: {
            actions: [
              {
                type: 'post' as const,
                label: '🔥 View Top Markets',
                href: `${requestUrl.origin}/api/actions/markets`,
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

      const baseUrl = `${requestUrl.origin}/api/actions/markets`;

      const payload: ActionGetResponse = {
        type: 'action',
        title: '📊 Your Kalshi Portfolio',
        icon: 'https://kalshi.com/favicon.ico',
        description: [
          `💰 **Balance**: $${(balance.balance / 100).toFixed(2)}`,
          `📈 **Portfolio Value**: $${(balance.portfolio_value / 100).toFixed(2)}`,
          `${totalPnl >= 0 ? '🟢' : '🔴'} **Total P&L**: ${totalPnl >= 0 ? '+' : ''}$${(totalPnl / 100).toFixed(2)}`,
          `💼 **Active Positions**: ${positions.length}`,
          `💸 **Total Fees**: $${(totalFees / 100).toFixed(2)}`,
          ``,
          positions.length > 0 ? '📋 **Top Positions**:' : '',
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
              type: 'post' as const,
              label: '🔥 View Top Markets',
              href: `${requestUrl.origin}/api/actions/markets`,
            },
            ...positions.slice(0, 2).flatMap((position) => [
              {
                type: 'post' as const,
                label: `${position.ticker} - Quick YES`,
                href: `${baseUrl}/quick/${position.ticker}/yes?amount=10`,
              },
              {
                type: 'post' as const,
                label: `${position.ticker} - Quick NO`,
                href: `${baseUrl}/quick/${position.ticker}/no?amount=10`,
              },
            ]),
          ],
        },
      };

      return NextResponse.json(payload, { headers });
    } catch (kalshiError: any) {
      console.error('Error fetching Kalshi portfolio:', kalshiError);
      
      // If it's a 401, user needs to connect their Kalshi account
      if (kalshiError.response?.status === 401) {
        const error: ActionError = {
          message: 'Kalshi account not connected. Please link your account at kalshi.com to view your portfolio.',
        };
        return NextResponse.json(error, { status: 401, headers });
      }
      
      const error: ActionError = {
        message: kalshiError.message || 'Unable to load portfolio. Please try again.',
      };
      return NextResponse.json(error, { status: 500, headers });
    }
  } catch (error: any) {
    console.error('[Portfolio Blink] Error:', error);
    const actionError: ActionError = {
      message: error.message || 'Unable to load portfolio. Please try again.',
    };
    return NextResponse.json(actionError, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers });
}
