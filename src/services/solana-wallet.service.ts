/**
 * Solana Wallet Service for Blink Bet
 * Handles wallet generation, storage, and transaction signing
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import bs58 from 'bs58';
import prisma from '../db';
import { config } from '../config';
import { getEncryptionService } from '../crypto/encryption';

export interface WalletInfo {
  publicKey: string;
  type: 'generated';
  createdAt: Date;
}

export interface WalletBalances {
  sol: number;
  usdc: number;
  tokens: Record<string, number>;
}

export class SolanaWalletService {
  private connection: Connection;
  private fallbackConnection: Connection | null = null;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, config.solana.commitment);
    
    if (config.solana.rpcFallback) {
      this.fallbackConnection = new Connection(config.solana.rpcFallback, config.solana.commitment);
    }
  }

  /**
   * Generate a new Solana wallet for a user
   */
  async generateWallet(userId: string): Promise<WalletInfo> {
    const encryption = getEncryptionService();

    // Generate new keypair
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKeyBase58 = bs58.encode(keypair.secretKey);

    // Encrypt the private key for storage
    const encryptedSeed = encryption.encrypt(privateKeyBase58);

    // Store in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletAddress: publicKey,
        encryptedSeed: encryptedSeed,
      },
    });

    return {
      publicKey,
      type: 'generated',
      createdAt: new Date(),
    };
  }

  /**
   * Get wallet info for a user
   */
  async getWalletInfo(userId: string): Promise<WalletInfo | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        walletAddress: true,
        encryptedSeed: true,
        createdAt: true,
      },
    });

    if (!user || !user.walletAddress) {
      return null;
    }

    return {
      publicKey: user.walletAddress,
      type: 'generated',
      createdAt: user.createdAt,
    };
  }

  /**
   * Get wallet balances
   */
  async getBalances(publicKey: string): Promise<WalletBalances> {
    const pubKey = new PublicKey(publicKey);

    // Get SOL balance
    const solBalance = await this.connection.getBalance(pubKey);

    // Get USDC balance
    let usdcBalance = 0;
    try {
      const usdcMint = new PublicKey(config.tokens.USDC);
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, pubKey);
      const usdcAccountInfo = await this.connection.getTokenAccountBalance(usdcTokenAccount);
      usdcBalance = parseFloat(usdcAccountInfo.value.amount) / Math.pow(10, usdcAccountInfo.value.decimals);
    } catch (error) {
      // Token account doesn't exist yet
      usdcBalance = 0;
    }

    // Get all token balances
    const tokens: Record<string, number> = {};
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(pubKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      for (const account of tokenAccounts.value) {
        const mint = account.account.data.parsed.info.mint;
        const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
        if (balance > 0) {
          tokens[mint] = balance;
        }
      }
    } catch (error) {
      console.error('Error fetching token balances:', error);
    }

    return {
      sol: solBalance / LAMPORTS_PER_SOL,
      usdc: usdcBalance,
      tokens,
    };
  }

  /**
   * Get keypair for signing
   */
  async getKeypairForSigning(userId: string): Promise<Keypair> {
    const encryption = getEncryptionService();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { encryptedSeed: true },
    });

    if (!user || !user.encryptedSeed) {
      throw new Error('No wallet found for user');
    }

    const privateKeyBase58 = encryption.decrypt(user.encryptedSeed);
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(privateKeyBytes);
  }

  /**
   * Sign and send a transaction
   */
  async signAndSendTransaction(
    userId: string,
    transaction: Transaction | VersionedTransaction
  ): Promise<string> {
    const keypair = await this.getKeypairForSigning(userId);

    try {
      let txSignature: string;

      if (transaction instanceof VersionedTransaction) {
        // Sign versioned transaction
        transaction.sign([keypair]);
        txSignature = await this.connection.sendTransaction(transaction);
      } else {
        // Sign legacy transaction
        transaction.sign(keypair);
        txSignature = await this.connection.sendRawTransaction(transaction.serialize());
      }

      // Wait for confirmation
      await this.connection.confirmTransaction(txSignature, 'confirmed');

      return txSignature;
    } catch (error: any) {
      // Try fallback if available
      if (this.fallbackConnection) {
        console.log('Primary RPC failed, trying fallback...');
        
        if (transaction instanceof VersionedTransaction) {
          transaction.sign([keypair]);
          const txSignature = await this.fallbackConnection.sendTransaction(transaction);
          await this.fallbackConnection.confirmTransaction(txSignature, 'confirmed');
          return txSignature;
        } else {
          transaction.sign(keypair);
          const txSignature = await this.fallbackConnection.sendRawTransaction(transaction.serialize());
          await this.fallbackConnection.confirmTransaction(txSignature, 'confirmed');
          return txSignature;
        }
      }

      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Get SPL token balance for a specific mint
   */
  async getTokenBalance(publicKey: string, mintAddress: string): Promise<number> {
    try {
      const pubKey = new PublicKey(publicKey);
      const mint = new PublicKey(mintAddress);
      const tokenAccount = await getAssociatedTokenAddress(mint, pubKey);
      const balance = await this.connection.getTokenAccountBalance(tokenAccount);
      return parseFloat(balance.value.amount) / Math.pow(10, balance.value.decimals);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get all SPL token accounts for a wallet
   */
  async getAllTokenAccounts(publicKey: string): Promise<Array<{
    mint: string;
    balance: string;
    decimals: number;
  }>> {
    const pubKey = new PublicKey(publicKey);
    const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(pubKey, {
      programId: TOKEN_PROGRAM_ID,
    });

    return tokenAccounts.value.map((account) => ({
      mint: account.account.data.parsed.info.mint,
      balance: account.account.data.parsed.info.tokenAmount.amount,
      decimals: account.account.data.parsed.info.tokenAmount.decimals,
    }));
  }

  /**
   * Get connection for external use
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Send SOL to another wallet
   */
  async sendSol(
    userId: string,
    toAddress: string,
    solAmount: number
  ): Promise<{
    txSignature: string;
    fromAddress: string;
    toAddress: string;
    amount: number;
    explorerUrl: string;
  }> {
    const keypair = await this.getKeypairForSigning(userId);
    const toPublicKey = new PublicKey(toAddress);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: toPublicKey,
        lamports: solAmount * LAMPORTS_PER_SOL,
      })
    );

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;

    const txSignature = await this.signAndSendTransaction(userId, transaction);

    return {
      txSignature,
      fromAddress: keypair.publicKey.toBase58(),
      toAddress,
      amount: solAmount,
      explorerUrl: `https://solscan.io/tx/${txSignature}`,
    };
  }

  /**
   * Send SPL token to another wallet
   */
  async sendToken(
    userId: string,
    toAddress: string,
    mintAddress: string,
    amount: number,
    decimals: number
  ): Promise<{
    txSignature: string;
    fromAddress: string;
    toAddress: string;
    mint: string;
    amount: number;
    explorerUrl: string;
  }> {
    const keypair = await this.getKeypairForSigning(userId);
    const toPublicKey = new PublicKey(toAddress);
    const mintPublicKey = new PublicKey(mintAddress);

    const fromTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      keypair.publicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      toPublicKey
    );

    const transaction = new Transaction();

    // Check if recipient token account exists
    const toAccountInfo = await this.connection.getAccountInfo(toTokenAccount);
    if (!toAccountInfo) {
      // Create associated token account for recipient
      transaction.add(
        createAssociatedTokenAccountInstruction(
          keypair.publicKey,
          toTokenAccount,
          toPublicKey,
          mintPublicKey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        keypair.publicKey,
        amount * Math.pow(10, decimals),
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;

    const txSignature = await this.signAndSendTransaction(userId, transaction);

    return {
      txSignature,
      fromAddress: keypair.publicKey.toBase58(),
      toAddress,
      mint: mintAddress,
      amount,
      explorerUrl: `https://solscan.io/tx/${txSignature}`,
    };
  }

  /**
   * Helper: Send USDC
   */
  async sendUsdc(
    userId: string,
    toAddress: string,
    usdcAmount: number
  ) {
    return this.sendToken(
      userId,
      toAddress,
      config.tokens.USDC,
      usdcAmount,
      6 // USDC has 6 decimals
    );
  }
}

// Singleton
let walletServiceInstance: SolanaWalletService | null = null;

export function getSolanaWalletService(): SolanaWalletService {
  if (!walletServiceInstance) {
    walletServiceInstance = new SolanaWalletService();
  }
  return walletServiceInstance;
}
