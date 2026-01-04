/**
 * Kalshi Prediction Market Service
 * Handles market discovery, event data, and market information
 * 
 * API Reference: https://demo-api.kalshi.co/trade-api/v2
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { config } from '../config';
import { KalshiEvent, KalshiMarket, KalshiSeries, LiveData, MarketCandlestick } from './kalshi.types';

export class KalshiMarketService {
  private client: AxiosInstance;
  private apiKey?: string;
  private privateKey?: string;

  constructor(apiKey?: string, privateKey?: string) {
    this.apiKey = apiKey;
    this.privateKey = privateKey;

    this.client = axios.create({
      baseURL: config.kalshi.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Generate authentication signature for Kalshi API
   */
  private generateSignature(timestamp: string, method: string, path: string): string {
    if (!this.privateKey) {
      throw new Error('Private key required for authenticated requests');
    }

    const message = `${timestamp}${method}${path}`;
    const signature = crypto.sign('sha256', Buffer.from(message), {
      key: this.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    });

    return signature.toString('base64');
  }

  /**
   * Get authenticated headers
   */
  private getAuthHeaders(method: string, path: string): Record<string, string> {
    if (!this.apiKey || !this.privateKey) {
      return {};
    }

    const timestamp = Date.now().toString();
    // Path for signature must include full path: /trade-api/v2/endpoint
    const fullPath = `/trade-api/v2${path}`;
    const signature = this.generateSignature(timestamp, method, fullPath);

    return {
      'KALSHI-ACCESS-KEY': this.apiKey,
      'KALSHI-ACCESS-SIGNATURE': signature,
      'KALSHI-ACCESS-TIMESTAMP': timestamp,
    };
  }

  /**
   * Get multiple events with optional filters
   */
  async getEvents(params?: {
    limit?: number;
    cursor?: string;
    with_nested_markets?: boolean;
    with_milestones?: boolean;
    status?: 'open' | 'closed' | 'settled';
    series_ticker?: string;
    min_close_ts?: number;
  }): Promise<{ events: KalshiEvent[]; cursor: string }> {
    const response = await this.client.get('/events', { params });
    return response.data;
  }

  /**
   * Get a single event by ticker
   */
  async getEvent(eventTicker: string, withNestedMarkets: boolean = true): Promise<KalshiEvent> {
    const response = await this.client.get(`/events/${eventTicker}`, {
      params: { with_nested_markets: withNestedMarkets },
    });
    return response.data.event;
  }

  /**
   * Search events by title or ticker
   */
  async searchEvents(query: string, limit: number = 20, status?: 'open' | 'closed' | 'settled'): Promise<KalshiEvent[]> {
    const allEvents: KalshiEvent[] = [];
    let cursor: string | undefined = undefined;
    const lowerQuery = query.toLowerCase();

    // Fetch events with filters
    const params: any = {
      limit: 200,
      with_nested_markets: true,
    };

    if (status) {
      params.status = status;
    }

    do {
      if (cursor) {
        params.cursor = cursor;
      }

      const response = await this.getEvents(params);
      const filtered = response.events.filter(
        (event) =>
          event.title.toLowerCase().includes(lowerQuery) ||
          event.event_ticker.toLowerCase().includes(lowerQuery) ||
          event.sub_title?.toLowerCase().includes(lowerQuery)
      );

      allEvents.push(...filtered);
      cursor = response.cursor;

      if (allEvents.length >= limit) {
        break;
      }
    } while (cursor);

    return allEvents.slice(0, limit);
  }

  /**
   * Get event forecast percentile history
   */
  async getEventForecastHistory(eventTicker: string): Promise<any> {
    const response = await this.client.get(`/events/${eventTicker}/forecast-percentile`);
    return response.data;
  }

  /**
   * Get event candlestick data
   */
  async getEventCandlesticks(
    eventTicker: string,
    params?: {
      resolution?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
      from?: string;
      to?: string;
    }
  ): Promise<MarketCandlestick[]> {
    const response = await this.client.get(`/events/${eventTicker}/candles`, { params });
    return response.data.candles || [];
  }

  /**
   * Get a single market by ticker
   */
  async getMarket(ticker: string): Promise<KalshiMarket> {
    const response = await this.client.get(`/markets/${ticker}`);
    return response.data.market;
  }

  /**
   * Get multiple markets
   */
  async getMarkets(params?: {
    limit?: number;
    cursor?: string;
    event_ticker?: string;
    series_ticker?: string;
    min_created_ts?: number;
    max_created_ts?: number;
    max_close_ts?: number;
    min_close_ts?: number;
    min_settled_ts?: number;
    max_settled_ts?: number;
    status?: 'unopened' | 'open' | 'paused' | 'closed' | 'settled';
    tickers?: string;
    mve_filter?: 'only' | 'exclude';
  }): Promise<{ markets: KalshiMarket[]; cursor: string }> {
    const response = await this.client.get('/markets', { params });
    return response.data;
  }

  /**
   * Get market candlestick data
   */
  async getMarketCandlesticks(
    ticker: string,
    params?: {
      resolution?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
      from?: string;
      to?: string;
    }
  ): Promise<MarketCandlestick[]> {
    const response = await this.client.get(`/markets/${ticker}/candlesticks`, { params });
    return response.data.candles || [];
  }

  /**
   * Batch get market candlesticks for multiple markets
   */
  async batchGetMarketCandlesticks(
    tickers: string[],
    params?: {
      resolution?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
      from?: string;
      to?: string;
    }
  ): Promise<Record<string, MarketCandlestick[]>> {
    const response = await this.client.post('/markets/candlesticks/batch', {
      tickers,
      ...params,
    });
    return response.data;
  }

  /**
   * Get market orderbook
   */
  async getMarketOrderbook(ticker: string, depth?: number): Promise<{
    yes: Array<{ price: number; count: number }>;
    no: Array<{ price: number; count: number }>;
  }> {
    const response = await this.client.get(`/markets/${ticker}/orderbook`, {
      params: { depth },
    });
    return response.data;
  }

  /**
   * Get recent trades for a market
   */
  async getTrades(
    ticker?: string,
    params?: {
      limit?: number;
      cursor?: string;
      min_ts?: number;
      max_ts?: number;
    }
  ): Promise<{
    trades: Array<{
      trade_id: string;
      ticker: string;
      yes_price: number;
      no_price: number;
      count: number;
      taker_side: 'yes' | 'no';
      created_time: string;
      ts: number;
    }>;
    cursor: string;
  }> {
    const response = await this.client.get('/markets/trades', {
      params: { ticker, ...params },
    });
    return response.data;
  }

  /**
   * Get all series
   */
  async getSeries(): Promise<KalshiSeries[]> {
    const response = await this.client.get('/series');
    return response.data.series || [];
  }

  /**
   * Get series by ticker
   */
  async getSeriesByTicker(seriesTicker: string): Promise<KalshiSeries> {
    const response = await this.client.get(`/series/${seriesTicker}`);
    return response.data.series;
  }


  /**
   * Get live data for a market (constructed from market data)
   */
  async getLiveData(marketTicker: string): Promise<LiveData | null> {
    try {
      const market = await this.getMarket(marketTicker);

      return {
        ticker: market.ticker,
        yesPrice: market.last_price,
        noPrice: market.last_price ? 100 - market.last_price : undefined,
        volume24h: market.volume_24h,
        openInterest: market.open_interest,
        yesBid: market.yes_bid,
        yesAsk: market.yes_ask,
        noBid: market.no_bid,
        noAsk: market.no_ask,
        status: market.status,
        lastPrice: market.last_price,
      };
    } catch (error) {
      console.error(`Failed to get live data for ${marketTicker}:`, error);
      return null;
    }
  }

  /**
   * Get live data for an event (all markets)
   */
  async getLiveDataByEvent(eventTicker: string): Promise<LiveData[]> {
    const event = await this.getEvent(eventTicker, true);

    if (!event.markets || event.markets.length === 0) {
      return [];
    }

    return event.markets.map((market) => ({
      ticker: market.ticker,
      yesPrice: market.last_price,
      noPrice: market.last_price ? 100 - market.last_price : undefined,
      volume24h: market.volume_24h,
      openInterest: market.open_interest,
      yesBid: market.yes_bid,
      yesAsk: market.yes_ask,
      noBid: market.no_bid,
      noAsk: market.no_ask,
      status: market.status,
      lastPrice: market.last_price,
    }));
  }


  /**
   * Get tags organized by categories
   */
  async getTagsForCategories(): Promise<Record<string, string[]>> {
    const response = await this.client.get('/search/tags');
    return response.data.tags || {};
  }

  /**
   * Get filters for sports
   */
  async getFiltersForSports(): Promise<any> {
    const response = await this.client.get('/search/filters/sports');
    return response.data;
  }


  /**
   * Get exchange status
   */
  async getExchangeStatus(): Promise<{
    exchange_active: boolean;
    trading_active: boolean;
    maintenance_message?: string;
  }> {
    const response = await this.client.get('/exchange/status');
    return response.data;
  }
}

// Singleton
let marketServiceInstance: KalshiMarketService | null = null;

export function getKalshiMarketService(apiKey?: string, privateKey?: string): KalshiMarketService {
  if (!marketServiceInstance) {
    // Use provided credentials or fall back to config (shared account)
    const key = apiKey || config.kalshi.apiKey;
    const pkey = privateKey || config.kalshi.privateKey;
    marketServiceInstance = new KalshiMarketService(key, pkey);
  }
  return marketServiceInstance;
}
