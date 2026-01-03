/**
 * User API Route - Get user details and wallet status
 * GET /api/users/:userId
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/db';
import { getSolanaWalletService } from '@/services/solana-wallet.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        externalId: true,
        username: true,
        email: true,
        walletAddress: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    let walletInfo = null;
    if (user.walletAddress) {
      const walletService = getSolanaWalletService();
      walletInfo = await walletService.getWalletInfo(userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        externalId: user.externalId,
        username: user.username,
        email: user.email,
        wallet: walletInfo,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch user',
      },
      { status: 500 }
    );
  }
}
