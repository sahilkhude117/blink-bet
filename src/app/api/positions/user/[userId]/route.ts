/**
 * Positions API Route - Get all positions for a user
 * GET /api/positions/user/:userId
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const settled = searchParams.get('settled');
    const ticker = searchParams.get('ticker');
    const eventTicker = searchParams.get('eventTicker');

    // Build where clause
    const where: any = { userId };

    if (settled !== null) {
      where.isSettled = settled === 'true';
    }

    if (ticker) {
      where.ticker = ticker;
    }

    if (eventTicker) {
      where.eventTicker = eventTicker;
    }

    const positions = await prisma.position.findMany({
      where,
      orderBy: { lastUpdatedTs: 'desc' },
    });

    // Calculate summary stats
    const summary = {
      totalPositions: positions.length,
      activePositions: positions.filter(p => !p.isSettled).length,
      settledPositions: positions.filter(p => p.isSettled).length,
      totalRealizedPnl: positions.reduce((sum, p) => sum + p.realizedPnl, 0),
      totalUnrealizedPnl: positions.reduce((sum, p) => sum + p.unrealizedPnl, 0),
      totalFeesPaid: positions.reduce((sum, p) => sum + p.feesPaid, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        positions,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch positions',
      },
      { status: 500 }
    );
  }
}
