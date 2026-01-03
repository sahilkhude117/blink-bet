/**
 * Tokens API Route - Get all SPL token holdings
 * GET /api/users/:userId/tokens
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

    const tokens = await walletService.getAllTokenAccounts(walletInfo.publicKey);

    return NextResponse.json({
      success: true,
      data: {
        publicKey: walletInfo.publicKey,
        tokens,
      },
    });
  } catch (error: any) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch tokens',
      },
      { status: 500 }
    );
  }
}
