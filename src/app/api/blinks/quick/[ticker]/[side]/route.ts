/**
 * Quick Trade Blink - Zero-friction trading with pre-filled side
 * GET/POST /api/blinks/quick/:ticker/:side
 * 
 * Ultra-fast trading: Click → Choose amount → Done (2 clicks)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  createActionHeaders,
  createPostResponse,
  BLOCKCHAIN_IDS,
} from '@solana/actions';
import { getKalshiMarketService, getKalshiTradeService } from '@/services';
import prisma from '@/db';
import { OrderStatus } from '@/generated/prisma/client';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js';
import { config } from '@/config';

const headers = {
  ...createActionHeaders(),
  "X-Blockchain-Ids": BLOCKCHAIN_IDS.mainnet,
  "X-Action-Version": "2.4"
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string; side: string }> }
) {
  try {
    const { ticker, side } = await params;

    if (!ticker || typeof ticker !== 'string') {
      const error: ActionError = { message: 'Market ticker is required' };
      return NextResponse.json(error, { status: 400, headers });
    }

    if (!side || !['yes', 'no'].includes(side.toLowerCase())) {
      const error: ActionError = { message: 'Please select YES or NO' };
      return NextResponse.json(error, { status: 400, headers });
    }

    const marketService = getKalshiMarketService();
    const market = await marketService.getMarket(ticker);

    const requestUrl = new URL(req.url);
    const baseHref = `${requestUrl.origin}/api/blinks/quick/${ticker}/${side.toLowerCase()}`;
    const normalizedSide = side.toLowerCase() as 'yes' | 'no';
    
    // Show ask prices (what you'd pay to buy)
    const price = normalizedSide === 'yes' ? (market.yes_ask || market.last_price || 50) : (market.no_ask || market.last_price || 50);
    const oppositePrice = normalizedSide === 'yes' ? (market.no_ask || market.last_price || 50) : (market.yes_ask || market.last_price || 50);
    const oppositeSide = normalizedSide === 'yes' ? 'NO' : 'YES';

    const payload: ActionGetResponse = {
      type: 'action',
      title: `⚡ Quick ${normalizedSide.toUpperCase()}: ${market.title}`,
      icon: 'https://kalshi.com/favicon.ico',
      description: [
        `${market.subtitle || ''}`,
        '',
        `💰 ${normalizedSide.toUpperCase()} @ ${price}¢`,
        `📊 ${oppositeSide} @ ${oppositePrice}¢`,
        `📈 Volume: $${((market.volume || 0) / 100).toLocaleString()}`,
        '',
        `🚀 One-click trading - Choose your amount:`,
      ].filter(Boolean).join('\n'),
      label: `Buy ${normalizedSide.toUpperCase()}`,
      links: {
        actions: [
          {
            type: "post" as const,
            label: `Buy ${normalizedSide.toUpperCase()} $10`,
            href: `${baseHref}?amount=10`,
          },
          {
            type: "post" as const,
            label: `Buy ${normalizedSide.toUpperCase()} $25`,
            href: `${baseHref}?amount=25`,
          },
          {
            type: "post" as const,
            label: `Buy ${normalizedSide.toUpperCase()} $50`,
            href: `${baseHref}?amount=50`,
          },
          {
            type: "post" as const,
            label: `Buy ${normalizedSide.toUpperCase()} $100`,
            href: `${baseHref}?amount=100`,
          },
        ],
      },
    };

    return NextResponse.json(payload, { headers });
  } catch (e: any) {
    console.error('[Quick Trade] Error loading market:', e);
    const error: ActionError = {
      message: e.message || 'Unable to load market. Please try again.',
    };
    return NextResponse.json(error, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string; side: string }> }
) {
  try {
    const { ticker, side } = await params;
    const body: ActionPostRequest = await req.json();
    const requestUrl = new URL(req.url);

    const amountParam = requestUrl.searchParams.get('amount');
    const account = body.account;

    if (!account) {
      const error: ActionError = { message: 'Please connect your wallet to trade' };
      return NextResponse.json(error, { status: 400, headers });
    }

    if (!amountParam) {
      const error: ActionError = { message: 'Trade amount is required' };
      return NextResponse.json(error, { status: 400, headers });
    }

    const amount = parseFloat(amountParam);
    if (isNaN(amount) || amount <= 0 || ![10, 25, 50, 100].includes(amount)) {
      const error: ActionError = { message: 'Please select a valid amount: $10, $25, $50, or $100' };
      return NextResponse.json(error, { status: 400, headers });
    }

    const normalizedSide = side.toLowerCase() as 'yes' | 'no';
    if (!['yes', 'no'].includes(normalizedSide)) {
      const error: ActionError = { message: 'Please select YES or NO' };
      return NextResponse.json(error, { status: 400, headers });
    }

    // Validate account
    let accountPubkey: PublicKey;
    try {
      accountPubkey = new PublicKey(account);
    } catch (err) {
      const error: ActionError = { message: 'Invalid account provided' };
      return NextResponse.json(error, { status: 400, headers });
    }

    // Find or create user
    const user = await prisma.user.upsert({
      where: { walletAddress: account },
      create: {
        externalId: account,
        walletAddress: account,
      },
      update: {},
    });

    // Get market details
    const marketService = getKalshiMarketService();
    const market = await marketService.getMarket(ticker);

    // For buying, use ask price (what sellers want). Multiple fallbacks for liquidity
    let price = normalizedSide === 'yes' ? market.yes_ask : market.no_ask;
    
    // Try multiple fallbacks
    if (!price || price <= 0) {
      price = market.last_price;
    }
    if (!price || price <= 0) {
      // Try opposite side or same side bid as fallback
      price = normalizedSide === 'yes' ? market.yes_bid : market.no_bid;
    }
    if (!price || price <= 0) {
      // Use 50¢ as absolute fallback
      price = 50;
    }
    
    // Validate price is within valid range (1-99 cents)
    if (price <= 0 || price >= 100) {
      const error: ActionError = {
        message: `💧 This market has no liquidity right now. Try another market or check back later!`,
      };
      return NextResponse.json(error, { status: 400, headers });
    }

    const count = Math.floor((amount * 100) / price);

    if (count <= 0) {
      const error: ActionError = {
        message: 'Amount too small to buy any shares',
      };
      return NextResponse.json(error, { status: 400, headers });
    }

    console.log('[Quick Trade] Order details:', {
      ticker,
      side: normalizedSide,
      action: 'buy',
      count,
      estimatedPrice: price,
      marketStatus: market.status,
      amount: amount
    });

    // Check Kalshi balance
    const tradeService = getKalshiTradeService();
    
    let balance;
    try {
      balance = await tradeService.getBalance();
    } catch (balanceError: any) {
      console.error('[Quick Trade] Kalshi API authentication failed:', {
        error: balanceError.message,
        status: balanceError.response?.status,
        data: balanceError.response?.data,
      });
      
      const error: ActionError = {
        message: balanceError.response?.status === 401 
          ? '❌ Kalshi API authentication failed. Please check your API credentials in .env file.'
          : `Unable to check balance: ${balanceError.message}`,
      };
      return NextResponse.json(error, { status: 500, headers });
    }

    if (balance.balance < amount * 100) {
      const error: ActionError = {
        message: `Insufficient balance. You have $${(balance.balance / 100).toFixed(2)}. Deposit at kalshi.com`,
      };
      return NextResponse.json(error, { status: 400, headers });
    }

    // Create order in database
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        ticker: ticker,
        eventTicker: market.event_ticker,
        side: normalizedSide.toUpperCase() as any,
        action: 'BUY',
        type: 'MARKET',
        count: count,
        yesPrice: normalizedSide === 'yes' ? price : null,
        noPrice: normalizedSide === 'no' ? price : null,
        status: OrderStatus.PENDING,
      },
    });

    // Submit to Kalshi API
    try {
      // Create order params - even market orders need a price!
      // For market orders, the price acts as a limit: max willing to pay (buy) or min to accept (sell)
      const orderParams: any = {
        ticker: ticker,
        action: 'buy',
        side: normalizedSide,
        count: count,
        type: 'market',
      };

      // Add price based on side - use current market price as limit
      if (normalizedSide === 'yes') {
        orderParams.yes_price = price;
      } else {
        orderParams.no_price = price;
      }

      const kalshiOrder = await tradeService.createOrder(orderParams);

      // Update order with Kalshi details
      await prisma.order.update({
        where: { id: order.id },
        data: {
          kalshiOrderId: kalshiOrder.order_id,
          status: kalshiOrder.status.toUpperCase() as any,
          fillCount: kalshiOrder.fill_count || 0,
          remainingCount: kalshiOrder.remaining_count,
          avgPrice: kalshiOrder.yes_price || kalshiOrder.no_price,
          totalCost: kalshiOrder.taker_fill_cost || 0,
          takerFees: kalshiOrder.taker_fees || 0,
        },
      });

      // Update or create position
      const existingPosition = await prisma.position.findFirst({
        where: {
          userId: user.id,
          ticker: ticker,
        },
      });

      if (existingPosition) {
        const positionChange = normalizedSide === 'yes' ? count : -count;
        const newPosition = existingPosition.position + positionChange;
        const newTotalTraded = existingPosition.totalTraded + count;
        const newMarketExposure = existingPosition.marketExposure + (kalshiOrder.taker_fill_cost || 0);
        const newFeesPaid = existingPosition.feesPaid + (kalshiOrder.taker_fees || 0);

        await prisma.position.update({
          where: { id: existingPosition.id },
          data: {
            position: newPosition,
            totalTraded: newTotalTraded,
            marketExposure: newMarketExposure,
            feesPaid: newFeesPaid,
          },
        });
      } else {
        await prisma.position.create({
          data: {
            userId: user.id,
            ticker: ticker,
            eventTicker: market.event_ticker,
            position: normalizedSide === 'yes' ? count : -count,
            totalTraded: count,
            marketExposure: kalshiOrder.taker_fill_cost || 0,
            feesPaid: kalshiOrder.taker_fees || 0,
          },
        });
      }

      // Create proof transaction
      const connection = new Connection(
        config.solana.rpcUrl || clusterApiUrl('devnet')
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const transaction = new Transaction({
        feePayer: accountPubkey,
        blockhash,
        lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: accountPubkey,
          toPubkey: accountPubkey,
          lamports: 0,
        })
      );

      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          type: 'transaction',
          transaction,
          message: `🎉 ${normalizedSide.toUpperCase()} Order Executed!\n\n✅ Bought ${count} shares @ ${price}¢\n💰 Total: $${amount.toFixed(2)}\n\n🚀 Trade more or view your portfolio!`,
        },
      });

      return NextResponse.json(payload, { headers });
    } catch (kalshiError: any) {
      console.error('[Quick Trade] Kalshi API error:', {
        error: kalshiError.message,
        status: kalshiError.response?.status,
        statusText: kalshiError.response?.statusText,
        data: JSON.stringify(kalshiError.response?.data, null, 2),
        ticker,
        side: normalizedSide,
        count,
      });

      // Update order as failed
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.FAILED,
          errorMessage: kalshiError.message,
        },
      });

      if (kalshiError.response?.status === 401) {
        const error: ActionError = {
          message: '❌ Kalshi API authentication failed. Please check your API credentials.',
        };
        return NextResponse.json(error, { status: 500, headers });
      }

      // Extract error message from Kalshi API response
      let errorMessage = 'Unknown error occurred';
      if (kalshiError.response?.data?.error) {
        const apiError = kalshiError.response.data.error;
        if (typeof apiError === 'string') {
          errorMessage = apiError;
        } else if (apiError.message) {
          errorMessage = apiError.message;
        } else if (apiError.details) {
          errorMessage = apiError.details;
        }
      } else if (kalshiError.message) {
        errorMessage = kalshiError.message;
      }

      const error: ActionError = {
        message: `❌ Order failed: ${errorMessage}`,
      };
      return NextResponse.json(error, { status: 400, headers });
    }
  } catch (e: any) {
    console.error('[Quick Trade] Error executing trade:', e);
    const error: ActionError = {
      message: e.message || 'Trade failed. Please try again or contact support.',
    };
    return NextResponse.json(error, { status: 500, headers });
  }
}
