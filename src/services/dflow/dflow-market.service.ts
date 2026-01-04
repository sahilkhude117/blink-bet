/**
 * DFlow Prediction Market Metadata Service
 * Handles market discovery, event data, and pricing information
 * 
 * API Reference: https://pond.dflow.net/prediction-market-metadata-api-reference/introduction
 * 
 * Note: This service is ready for integration but requires DFlow API credentials.
 * Add DFLOW_API_KEY and DFLOW_METADATA_API_URL to .env to enable.
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '@/config';

export interface DFlowEvent {
  ticker: string;
  seriesTicker?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  volume?: number;
  volume24h?: number;
  liquidity?: number;
  openInterest?: number;
  settlementSources?: Array<{ name: string; url: string }>;
  markets: DFlowMarket[];
}

export interface DFlowMarket {
  ticker: string;
  eventTicker: string;
  marketType: string;
  title: string;
  subtitle?: string;
  yesSubTitle?: string;
  noSubTitle?: string;
  openTime?: number;
  closeTime?: number;
  expirationTime?: number;
  status: 'active' | 'inactive' | 'finalized';
  volume?: number;
  result?: 'yes' | 'no' | null;
  openInterest?: number;
  canCloseEarly?: boolean;
  earlyCloseCondition?: string;
  rulesPrimary?: string;
  rulesSecondary?: string;
  yesBid?: number | null;
  yesAsk?: number | null;
  noBid?: number | null;
  noAsk?: number | null;
  accounts?: {
    [settlementMint: string]: {
      marketLedger: string;
      yesMint: string;
      noMint: string;
      isInitialized: boolean;
      redemptionStatus?: string | null;
    };
  };
}

export interface DFlowSeries {
  ticker: string;
  title: string;
  category: string;
  frequency: string;
}

export interface MarketCandlestick {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiveData {
  ticker: string;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  openInterest: number;
  yesBid?: number | null;
  yesAsk?: number | null;
  noBid?: number | null;
  noAsk?: number | null;
  status?: string;
  lastTrade?: {
    price: number;
    size: number;
    timestamp: string;
  };
}

export class DFlowMarketService {
  private client: AxiosInstance;
  private isConfigured: boolean = false;

  constructor() {
    const dflowApiUrl = process.env.DFLOW_METADATA_API_URL || 'https://api.dflow.net';
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
  }

  private checkConfiguration() {
    if (!this.isConfigured) {
      throw new Error('DFlow API is not configured. Please add DFLOW_API_KEY to your environment variables.');
    }
  }

  // ============================================
  // EVENTS API
  // ============================================

  async getEvent(ticker: string): Promise<DFlowEvent> {
    this.checkConfiguration();
    const response = await this.client.get(`/api/v1/events/${ticker}`);
    return response.data;
  }

  async getEvents(params?: {
    category?: string;
    limit?: number;
    cursor?: string;
    withNestedMarkets?: boolean;
    marketStatus?: 'active' | 'inactive' | 'finalized' | 'all';
  }): Promise<{ events: DFlowEvent[]; cursor?: string }> {
    this.checkConfiguration();
    const { marketStatus, limit, ...apiParams } = params || {};
    const requestedLimit = limit || 50;
    
    const fetchLimit = (marketStatus && marketStatus !== 'all') ? Math.max(200, requestedLimit * 4) : requestedLimit;
    
    const queryParams = {
      ...apiParams,
      limit: fetchLimit,
      withNestedMarkets: params?.withNestedMarkets ?? true,
    };
    
    const response = await this.client.get('/api/v1/events', { params: queryParams });
    let events = response.data.events || [];
    
    if (marketStatus && marketStatus !== 'all') {
      events = events.filter((event: DFlowEvent) => 
        event.markets?.some((market: DFlowMarket) => market.status === marketStatus)
      );
    }
    
    events = events.slice(0, requestedLimit);
    
    return { events, cursor: response.data.cursor };
  }

  async searchEvents(query: string, limit: number = 20, marketStatus?: 'active' | 'inactive' | 'finalized' | 'all'): Promise<DFlowEvent[]> {
    this.checkConfiguration();
    try {
      const response = await this.client.get('/api/v1/search/events', {
        params: { q: query, limit, withNestedMarkets: true },
      });
      let events = response.data.events || [];
      
      if (marketStatus && marketStatus !== 'all') {
        events = events.filter((e: DFlowEvent) => 
          e.markets?.some((m: DFlowMarket) => m.status === marketStatus)
        );
      }
      
      return events;
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 400) {
        const response = await this.client.get('/api/v1/events', {
          params: { withNestedMarkets: true, limit: 200 },
        });
        let events = response.data.events || [];
        const queryLower = query.toLowerCase();
        
        events = events.filter((e: DFlowEvent) => 
          e.title.toLowerCase().includes(queryLower) ||
          e.ticker.toLowerCase().includes(queryLower) ||
          e.subtitle?.toLowerCase().includes(queryLower) ||
          e.markets?.some((m: DFlowMarket) => 
            m.title.toLowerCase().includes(queryLower) ||
            m.subtitle?.toLowerCase().includes(queryLower)
          )
        );
        
        if (marketStatus && marketStatus !== 'all') {
          events = events.filter((e: DFlowEvent) => 
            e.markets?.some((m: DFlowMarket) => m.status === marketStatus)
          );
        }
        
        return events.slice(0, limit);
      }
      throw error;
    }
  }

  // ============================================
  // MARKETS API
  // ============================================

  async getMarket(ticker: string): Promise<DFlowMarket | null> {
    this.checkConfiguration();
    const parts = ticker.split('-');
    const eventTicker = parts.length >= 3 ? parts.slice(0, -1).join('-') : ticker;
    
    const response = await this.client.get('/api/v1/markets', {
      params: { eventTicker, limit: 100 },
    });
    
    const markets = response.data.markets || [];
    const market = markets.find((m: DFlowMarket) => m.ticker === ticker);
    
    if (!market) {
      const eventsResponse = await this.client.get('/api/v1/events', {
        params: { withNestedMarkets: true, limit: 100 },
      });
      
      for (const event of eventsResponse.data.events || []) {
        const found = event.markets?.find((m: DFlowMarket) => m.ticker === ticker);
        if (found) {
          return found;
        }
      }
      
      return null;
    }
    
    return market;
  }

  async getMarkets(params?: {
    eventTicker?: string;
    status?: 'active' | 'inactive' | 'finalized';
    limit?: number;
    cursor?: string;
  }): Promise<{ markets: DFlowMarket[]; cursor?: string }> {
    this.checkConfiguration();
    const response = await this.client.get('/api/v1/markets', { params });
    return response.data;
  }

  async getOutcomeMints(marketTicker: string): Promise<{
    yes: string;
    no: string;
    settlement: string;
  }> {
    this.checkConfiguration();
    const response = await this.client.get(`/api/v1/markets/${marketTicker}/mints`);
    return response.data;
  }

  // ============================================
  // MARKET INITIALIZATION & REDEMPTION STATUS
  // ============================================

  async checkMarketInitialization(
    ticker: string,
    settlementMint: string = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
  ): Promise<{
    isInitialized: boolean;
    marketTicker: string;
    yesMint?: string;
    noMint?: string;
    marketLedger?: string;
    status: string;
    note: string;
  }> {
    this.checkConfiguration();
    const market = await this.getMarket(ticker);
    
    if (!market) {
      return {
        isInitialized: false,
        marketTicker: ticker,
        status: 'NOT_FOUND',
        note: 'Market not found in DFlow. Check the ticker.',
      };
    }

    const accountInfo = market.accounts?.[settlementMint];
    
    if (!accountInfo) {
      return {
        isInitialized: false,
        marketTicker: ticker,
        status: 'NO_SETTLEMENT_MINT',
        note: `No account info for settlement mint ${settlementMint}. Market may not support this settlement token.`,
      };
    }

    return {
      isInitialized: accountInfo.isInitialized ?? false,
      marketTicker: ticker,
      yesMint: accountInfo.yesMint,
      noMint: accountInfo.noMint,
      marketLedger: accountInfo.marketLedger,
      status: accountInfo.isInitialized ? 'INITIALIZED' : 'NOT_INITIALIZED',
      note: accountInfo.isInitialized 
        ? 'Market is tokenized and ready for trading.'
        : 'Market needs initialization. First trade or explicit initialization will create the outcome tokens on-chain.',
    };
  }

  async checkRedemptionStatus(
    ticker: string,
    settlementMint: string = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  ): Promise<{
    isRedeemable: boolean;
    marketTicker: string;
    marketStatus: string;
    result?: 'yes' | 'no' | null;
    redemptionStatus?: string | null;
    winningMint?: string;
    losingMint?: string;
    note: string;
  }> {
    this.checkConfiguration();
    const market = await this.getMarket(ticker);
    
    if (!market) {
      return {
        isRedeemable: false,
        marketTicker: ticker,
        marketStatus: 'NOT_FOUND',
        note: 'Market not found.',
      };
    }

    const accountInfo = market.accounts?.[settlementMint];
    
    if (!accountInfo) {
      return {
        isRedeemable: false,
        marketTicker: ticker,
        marketStatus: market.status,
        note: 'No settlement account found for this market.',
      };
    }

    const marketStatus = market.status;
    const result = market.result;
    const redemptionStatus = accountInfo.redemptionStatus;
    
    const isSettled = marketStatus === 'finalized';
    const isRedemptionOpen = redemptionStatus === 'open';
    const isRedeemable = isSettled && isRedemptionOpen;

    let winningMint: string | undefined;
    let losingMint: string | undefined;
    
    if (result === 'yes') {
      winningMint = accountInfo.yesMint;
      losingMint = accountInfo.noMint;
    } else if (result === 'no') {
      winningMint = accountInfo.noMint;
      losingMint = accountInfo.yesMint;
    }

    let note: string;
    if (!isSettled) {
      note = `Market is ${marketStatus}. Wait for settlement before redemption.`;
    } else if (!isRedemptionOpen) {
      note = `Market is settled but redemption status is "${redemptionStatus}". Vault may still be funding.`;
    } else if (isRedeemable) {
      note = result 
        ? `Redemption is open. ${result.toUpperCase()} tokens can be redeemed for full value.`
        : 'Scalar outcome - both YES and NO tokens may be partially redeemable.';
    } else {
      note = 'Cannot redeem at this time.';
    }

    return {
      isRedeemable,
      marketTicker: ticker,
      marketStatus,
      result,
      redemptionStatus,
      winningMint,
      losingMint,
      note,
    };
  }
}

// Singleton
let marketServiceInstance: DFlowMarketService | null = null;

export function getDFlowMarketService(): DFlowMarketService {
  if (!marketServiceInstance) {
    marketServiceInstance = new DFlowMarketService();
  }
  return marketServiceInstance;
}
