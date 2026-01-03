/**
 * Setup Wallet API Route - Generate a new Solana wallet for the user
 * POST /api/users/:userId/setup-wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSolanaWalletService } from '@/services/solana-wallet.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const walletService = getSolanaWalletService();
    
    // Check if wallet already exists
    const existingWallet = await walletService.getWalletInfo(userId);
    
    if (existingWallet) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'Wallet already exists',
          wallet: existingWallet,
        },
      });
    }

    // Generate new wallet
    const wallet = await walletService.generateWallet(userId);
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Solana wallet generated successfully',
        wallet,
        note: 'Fund this address with SOL and USDC to start trading.',
      },
    });
  } catch (error: any) {
    console.error('Error setting up wallet:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to setup wallet',
      },
      { status: 500 }
    );
  }
}
