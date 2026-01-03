/**
 * Balances API Route - Get user's wallet balances
 * GET /api/users/:userId/balances
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSolanaWalletService } from '@/services/solana-wallet.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const walletService = getSolanaWalletService();
    const walletInfo = await walletService.getWalletInfo(userId);

    if (!walletInfo) {
      return NextResponse.json(
        {
          success: false,
          error: 'No wallet found. Please setup wallet first.',
        },
        { status: 404 }
      );
    }

    const balances = await walletService.getBalances(walletInfo.publicKey);

    return NextResponse.json({
      success: true,
      data: {
        publicKey: walletInfo.publicKey,
        walletType: walletInfo.type,
        balances,
      },
    });
  } catch (error: any) {
    console.error('Error fetching balances:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch balances',
      },
      { status: 500 }
    );
  }
}
