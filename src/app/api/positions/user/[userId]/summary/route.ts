/**
 * Portfolio Summary API Route - Get portfolio summary for a user
 * GET /api/positions/user/:userId/summary
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Get all positions
    const positions = await prisma.position.findMany({
      where: { userId },
    });

    // Get all orders
    const orders = await prisma.order.findMany({
      where: { userId },
    });

    // Calculate comprehensive summary
    const activePositions = positions.filter(p => !p.isSettled);
    const settledPositions = positions.filter(p => p.isSettled);

    const summary = {
      // Position stats
      totalPositions: positions.length,
      activePositions: activePositions.length,
      settledPositions: settledPositions.length,
      
      // Financial stats (in cents)
      totalMarketExposure: activePositions.reduce((sum, p) => sum + p.marketExposure, 0),
      totalRealizedPnl: positions.reduce((sum, p) => sum + p.realizedPnl, 0),
      totalUnrealizedPnl: activePositions.reduce((sum, p) => sum + p.unrealizedPnl, 0),
      totalPnl: positions.reduce((sum, p) => sum + p.realizedPnl + p.unrealizedPnl, 0),
      totalFeesPaid: positions.reduce((sum, p) => sum + p.feesPaid, 0),
      
      // Order stats
      totalOrders: orders.length,
      executedOrders: orders.filter(o => o.status === 'EXECUTED').length,
      pendingOrders: orders.filter(o => o.status === 'PENDING' || o.status === 'RESTING').length,
      canceledOrders: orders.filter(o => o.status === 'CANCELED').length,
      
      // Win/Loss stats for settled positions
      wins: settledPositions.filter(p => p.realizedPnl > 0).length,
      losses: settledPositions.filter(p => p.realizedPnl < 0).length,
      breakEven: settledPositions.filter(p => p.realizedPnl === 0).length,
      winRate: settledPositions.length > 0 
        ? (settledPositions.filter(p => p.realizedPnl > 0).length / settledPositions.length) * 100 
        : 0,
      
      // Market diversity
      uniqueMarkets: new Set(positions.map(p => p.ticker)).size,
      uniqueEvents: new Set(positions.map(p => p.eventTicker)).size,
    };

    // Convert cents to dollars for display
    const summaryWithDollars = {
      ...summary,
      totalMarketExposureDollars: (summary.totalMarketExposure / 100).toFixed(2),
      totalRealizedPnlDollars: (summary.totalRealizedPnl / 100).toFixed(2),
      totalUnrealizedPnlDollars: (summary.totalUnrealizedPnl / 100).toFixed(2),
      totalPnlDollars: (summary.totalPnl / 100).toFixed(2),
      totalFeesPaidDollars: (summary.totalFeesPaid / 100).toFixed(2),
    };

    return NextResponse.json({
      success: true,
      data: summaryWithDollars,
    });
  } catch (error: any) {
    console.error('Error fetching portfolio summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch portfolio summary',
      },
      { status: 500 }
    );
  }
}
