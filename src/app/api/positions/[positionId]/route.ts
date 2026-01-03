/**
 * Position API Route - Get a specific position by ID
 * GET /api/positions/:positionId
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ positionId: string }> }
) {
  try {
    const { positionId } = await params;

    const position = await prisma.position.findUnique({
      where: { id: positionId },
      include: {
        user: {
          select: {
            id: true,
            externalId: true,
            username: true,
          },
        },
      },
    });

    if (!position) {
      return NextResponse.json(
        {
          success: false,
          error: 'Position not found',
        },
        { status: 404 }
      );
    }

    // Get related orders for this position
    const relatedOrders = await prisma.order.findMany({
      where: {
        userId: position.userId,
        ticker: position.ticker,
      },
      orderBy: { createdTime: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        position,
        relatedOrders,
      },
    });
  } catch (error: any) {
    console.error('Error fetching position:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch position',
      },
      { status: 500 }
    );
  }
}
