/**
 * Active Positions API Route - Get active (unsettled) positions for a user
 * GET /api/positions/user/:userId/active
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const positions = await prisma.position.findMany({
      where: {
        userId,
        isSettled: false,
      },
      orderBy: { lastUpdatedTs: 'desc' },
    });

    // Calculate active positions summary
    const summary = {
      totalActivePositions: positions.length,
      totalMarketExposure: positions.reduce((sum, p) => sum + p.marketExposure, 0),
      totalUnrealizedPnl: positions.reduce((sum, p) => sum + p.unrealizedPnl, 0),
      netPosition: positions.reduce((sum, p) => sum + p.position, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        positions,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Error fetching active positions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch active positions',
      },
      { status: 500 }
    );
  }
}
