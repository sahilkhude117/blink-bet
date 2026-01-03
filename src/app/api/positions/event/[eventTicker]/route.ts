/**
 * Event Positions API Route - Get all positions for a specific event
 * GET /api/positions/event/:eventTicker
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventTicker: string }> }
) {
  try {
    const { eventTicker } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where: any = { eventTicker };
    
    if (userId) {
      where.userId = userId;
    }

    const positions = await prisma.position.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            externalId: true,
            username: true,
          },
        },
      },
      orderBy: { lastUpdatedTs: 'desc' },
    });

    if (positions.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          positions: [],
          message: 'No positions found for this event',
        },
      });
    }

    // Group positions by market ticker
    const positionsByMarket = positions.reduce((acc, pos) => {
      if (!acc[pos.ticker]) {
        acc[pos.ticker] = [];
      }
      acc[pos.ticker].push(pos);
      return acc;
    }, {} as Record<string, typeof positions>);

    // Calculate event summary
    const summary = {
      totalPositions: positions.length,
      uniqueMarkets: Object.keys(positionsByMarket).length,
      activePositions: positions.filter(p => !p.isSettled).length,
      totalRealizedPnl: positions.reduce((sum, p) => sum + p.realizedPnl, 0),
      totalUnrealizedPnl: positions.reduce((sum, p) => sum + p.unrealizedPnl, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        eventTicker,
        positions,
        positionsByMarket,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching event positions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch event positions',
      },
      { status: 500 }
    );
  }
}
