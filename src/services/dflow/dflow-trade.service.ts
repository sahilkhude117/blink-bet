/**
 * DFlow Trade API Service
 * Handles order creation, execution, and status tracking
 * 
 * API Reference: https://pond.dflow.net/swap-api-reference/order/order
 * 
 * Note: This service is ready for integration but requires DFlow API credentials.
 * Add DFLOW_API_KEY and DFLOW_API_URL to .env to enable.
 */

import axios, { AxiosInstance } from 'axios';
import { 
  Connection, 
  Transaction, 
  VersionedTransaction,
} from '@solana/web3.js';
import { config } from '@/config';

export interface OrderQuote {
  contextSlot: number;
  executionMode: 'sync' | 'async';
  inAmount: string;
  inputMint: string;
  minOutAmount: string;
  otherAmountThreshold: string;
  outAmount: string;
  outputMint: string;
  priceImpactPct: string;
  slippageBps: number;
  computeUnitLimit?: number;
  lastValidBlockHeight?: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  } | null;
  prioritizationFeeLamports?: number;
  routePlan?: Array<{
    data: string;
    inAmount: string;
    inputMint: string;
    inputMintDecimals: number;
    marketKey: string;
    outAmount: string;
    outputMint: string;
    outputMintDecimals: number;
    venue: string;
  }>;
  transaction?: string; // Base64 encoded transaction
}

export interface OrderStatus {
  orderId: string;
  status: 'pending' | 'submitted' | 'filled' | 'partially_filled' | 'cancelled' | 'failed';
  filledAmount?: string;
  remainingAmount?: string;
  txSignature?: string;
  error?: string;
}

export interface TradeParams {
  userPublicKey: string;
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  platformFeeBps?: number;
  feeAccount?: string;
  destinationWallet?: string;
  wrapAndUnwrapSol?: boolean;
  onlyDirectRoutes?: boolean;
  maxRouteLength?: number;
}

export class DFlowTradeService {
  private client: AxiosInstance;
  private connection: Connection;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 500; // 500ms between requests
  private isConfigured: boolean = false;

  constructor() {
    const dflowApiUrl = process.env.DFLOW_API_URL || 'https://api.dflow.net';
    const dflowApiKey = process.env.DFLOW_API_KEY;

    this.isConfigured = !!dflowApiKey;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (dflowApiKey) {
      headers['x-api-key'] = dflowApiKey;
    }
    
    this.client = axios.create({
      baseURL: dflowApiUrl,
      timeout: 30000,
      headers,
    });
    
    // Add retry interceptor for rate limiting
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
          console.log(`Rate limited, waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.client.request(error.config);
        }
        throw error;
      }
    );
    
    this.connection = new Connection(
      config.solana.rpcUrl || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  private checkConfiguration() {
    if (!this.isConfigured) {
      throw new Error('DFlow API is not configured. Please add DFLOW_API_KEY to your environment variables.');
    }
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Get a quote for a trade (includes transaction if user public key provided)
   */
  async getQuote(params: TradeParams): Promise<OrderQuote> {
    this.checkConfiguration();
    await this.throttle();
    
    const queryParams: Record<string, any> = {
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      slippageBps: params.slippageBps || 100, // Default 1%
    };

    if (params.userPublicKey) {
      queryParams.userPublicKey = params.userPublicKey;
    }

    if (params.platformFeeBps) {
      queryParams.platformFeeBps = params.platformFeeBps;
    }

    if (params.feeAccount) {
      queryParams.feeAccount = params.feeAccount;
    }

    if (params.destinationWallet) {
      queryParams.destinationWallet = params.destinationWallet;
    }

    if (params.wrapAndUnwrapSol !== undefined) {
      queryParams.wrapAndUnwrapSol = params.wrapAndUnwrapSol;
    }

    if (params.onlyDirectRoutes !== undefined) {
      queryParams.onlyDirectRoutes = params.onlyDirectRoutes;
    }

    if (params.maxRouteLength !== undefined) {
      queryParams.maxRouteLength = params.maxRouteLength;
    }

    const response = await this.client.get('/order', { params: queryParams });
    return response.data;
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    this.checkConfiguration();
    const response = await this.client.get(`/order/${orderId}/status`);
    return response.data;
  }

  /**
   * Buy YES outcome tokens for a market
   */
  async buyYes(
    userPublicKey: string,
    yesOutcomeMint: string,
    usdcAmount: number,
    slippageBps?: number
  ): Promise<OrderQuote> {
    this.checkConfiguration();
    return this.getQuote({
      userPublicKey,
      inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      outputMint: yesOutcomeMint,
      amount: usdcAmount * 1e6, // USDC has 6 decimals
      slippageBps,
    });
  }

  /**
   * Buy NO outcome tokens for a market
   */
  async buyNo(
    userPublicKey: string,
    noOutcomeMint: string,
    usdcAmount: number,
    slippageBps?: number
  ): Promise<OrderQuote> {
    this.checkConfiguration();
    return this.getQuote({
      userPublicKey,
      inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      outputMint: noOutcomeMint,
      amount: usdcAmount * 1e6,
      slippageBps,
    });
  }

  /**
   * Sell outcome tokens back to USDC
   */
  async sellOutcome(
    userPublicKey: string,
    outcomeMint: string,
    tokenAmount: number,
    slippageBps?: number
  ): Promise<OrderQuote> {
    this.checkConfiguration();
    return this.getQuote({
      userPublicKey,
      inputMint: outcomeMint,
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      amount: tokenAmount,
      slippageBps,
    });
  }

  /**
   * Redeem winning outcome tokens after market settlement
   */
  async redeemWinnings(
    userPublicKey: string,
    outcomeMint: string,
    tokenAmount: number
  ): Promise<OrderQuote> {
    this.checkConfiguration();
    return this.getQuote({
      userPublicKey,
      inputMint: outcomeMint,
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      amount: tokenAmount,
      slippageBps: 10, // Very low slippage for redemptions
    });
  }

  /**
   * Initialize a prediction market (tokenization)
   * This creates the YES/NO outcome tokens on-chain for an uninitialized market.
   * 
   * Reference: https://pond.dflow.net/swap-api-reference/prediction-market/prediction-market-init
   */
  async initializeMarket(
    payerPublicKey: string,
    outcomeMint: string
  ): Promise<{
    transaction: string;
    computeUnitLimit?: number;
    lastValidBlockHeight?: number;
  }> {
    this.checkConfiguration();
    await this.throttle();

    const response = await this.client.get('/prediction-market-init', {
      params: {
        payer: payerPublicKey,
        outcomeMint: outcomeMint,
      },
    });

    return response.data;
  }

  /**
   * Get swap instructions without executing (for custom signing flows)
   */
  async getSwapInstructions(params: TradeParams): Promise<{
    instructions: any[];
    lookupTables: string[];
    computeUnits: number;
  }> {
    this.checkConfiguration();
    const response = await this.client.post('/swap/instructions', params);
    return response.data;
  }
}

// Singleton
let tradeServiceInstance: DFlowTradeService | null = null;

export function getDFlowTradeService(): DFlowTradeService {
  if (!tradeServiceInstance) {
    tradeServiceInstance = new DFlowTradeService();
  }
  return tradeServiceInstance;
}
