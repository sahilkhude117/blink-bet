/**
 * Settled Positions API Route - Get settled positions for a user
 * GET /api/positions/user/:userId/settled
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
    const limit = searchParams.get('limit');

    const queryOptions: any = {
      where: {
        userId,
        isSettled: true,
      },
      orderBy: { settledTime: 'desc' },
    };

    if (limit) {
      queryOptions.take = parseInt(limit, 10);
    }

    const positions = await prisma.position.findMany(queryOptions);

    // Calculate settled positions summary
    const summary = {
      totalSettledPositions: positions.length,
      totalRealizedPnl: positions.reduce((sum, p) => sum + p.realizedPnl, 0),
      totalSettlementValue: positions.reduce((sum, p) => sum + (p.settlementValue || 0), 0),
      winCount: positions.filter(p => (p.settlementValue || 0) > 0).length,
      lossCount: positions.filter(p => (p.settlementValue || 0) <= 0).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        positions,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching settled positions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch settled positions',
      },
      { status: 500 }
    );
  }
}
