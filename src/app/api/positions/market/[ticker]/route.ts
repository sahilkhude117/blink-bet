/**
 * Market Positions API Route - Get all positions for a specific market
 * GET /api/positions/market/:ticker
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where: any = { ticker };
    
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
          message: 'No positions found for this market',
        },
      });
    }

    // Calculate market summary
    const summary = {
      totalPositions: positions.length,
      activePositions: positions.filter(p => !p.isSettled).length,
      totalVolume: positions.reduce((sum, p) => sum + p.totalTraded, 0),
      totalExposure: positions.reduce((sum, p) => sum + p.marketExposure, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        ticker,
        positions,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching market positions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch market positions',
      },
      { status: 500 }
    );
  }
}
