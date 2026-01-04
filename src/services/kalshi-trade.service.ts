/**
 * Kalshi Trade API Service
 * Handles order creation, execution, and portfolio management
 * 
 * API Reference: https://demo-api.kalshi.co/trade-api/v2
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { config } from '../config';
import { CreateOrderParams, KalshiBalance, KalshiEventPosition, KalshiFill, KalshiMarketPosition, KalshiOrder, KalshiSettlement } from './kalshi.types';


export class KalshiTradeService {
  private client: AxiosInstance;
  private apiKey: string;
  private privateKey: string;

  constructor(apiKey: string, privateKey: string) {
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
   * Create a new order
   */
  async createOrder(params: CreateOrderParams): Promise<KalshiOrder> {
    const path = '/portfolio/orders';
    const headers = this.getAuthHeaders('POST', path);

    const response = await this.client.post(path, params, { headers });
    return response.data.order;
  }

  /**
   * Get orders with optional filters
   */
  async getOrders(params?: {
    ticker?: string;
    event_ticker?: string;
    min_ts?: number;
    max_ts?: number;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ orders: KalshiOrder[]; cursor: string }> {
    const path = '/portfolio/orders';
    const headers = this.getAuthHeaders('GET', path);

    const response = await this.client.get(path, { headers, params });
    return response.data;
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<KalshiOrder> {
    const path = `/portfolio/orders/${orderId}`;
    const headers = this.getAuthHeaders('GET', path);

    const response = await this.client.get(path, { headers });
    return response.data.order;
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<{
    order_id: string;
    status: string;
  }> {
    const path = `/portfolio/orders/${orderId}`;
    const headers = this.getAuthHeaders('DELETE', path);

    const response = await this.client.delete(path, { headers });
    return response.data;
  }

  /**
   * Buy YES outcome for a market
   */
  async buyYes(
    ticker: string,
    count: number,
    price?: number,
    orderType: 'limit' | 'market' = 'market'
  ): Promise<KalshiOrder> {
    const params: CreateOrderParams = {
      ticker,
      side: 'yes',
      action: 'buy',
      count,
      type: orderType,
    };

    if (orderType === 'limit' && price !== undefined) {
      params.yes_price = price;
    }

    return this.createOrder(params);
  }

  /**
   * Buy NO outcome for a market
   */
  async buyNo(
    ticker: string,
    count: number,
    price?: number,
    orderType: 'limit' | 'market' = 'market'
  ): Promise<KalshiOrder> {
    const params: CreateOrderParams = {
      ticker,
      side: 'no',
      action: 'buy',
      count,
      type: orderType,
    };

    if (orderType === 'limit' && price !== undefined) {
      params.no_price = price;
    }

    return this.createOrder(params);
  }

  /**
   * Sell YES outcome for a market
   */
  async sellYes(
    ticker: string,
    count: number,
    price?: number,
    orderType: 'limit' | 'market' = 'market'
  ): Promise<KalshiOrder> {
    const params: CreateOrderParams = {
      ticker,
      side: 'yes',
      action: 'sell',
      count,
      type: orderType,
    };

    if (orderType === 'limit' && price !== undefined) {
      params.yes_price = price;
    }

    return this.createOrder(params);
  }

  /**
   * Sell NO outcome for a market
   */
  async sellNo(
    ticker: string,
    count: number,
    price?: number,
    orderType: 'limit' | 'market' = 'market'
  ): Promise<KalshiOrder> {
    const params: CreateOrderParams = {
      ticker,
      side: 'no',
      action: 'sell',
      count,
      type: orderType,
    };

    if (orderType === 'limit' && price !== undefined) {
      params.no_price = price;
    }

    return this.createOrder(params);
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<KalshiBalance> {
    const path = '/portfolio/balance';
    const headers = this.getAuthHeaders('GET', path);

    const response = await this.client.get(path, { headers });
    return response.data;
  }

  /**
   * Get positions
   */
  async getPositions(params?: {
    cursor?: string;
    limit?: number;
    count_filter?: string;
    ticker?: string;
    event_ticker?: string;
  }): Promise<{
    market_positions: KalshiMarketPosition[];
    event_positions: KalshiEventPosition[];
    cursor?: string;
  }> {
    const path = '/portfolio/positions';
    const headers = this.getAuthHeaders('GET', path);

    const response = await this.client.get(path, { headers, params });
    return response.data;
  }

  /**
   * Get fills (trade history)
   */
  async getFills(params?: {
    ticker?: string;
    order_id?: string;
    min_ts?: number;
    max_ts?: number;
    limit?: number;
    cursor?: string;
  }): Promise<{ fills: KalshiFill[]; cursor: string }> {
    const path = '/portfolio/fills';
    const headers = this.getAuthHeaders('GET', path);

    const response = await this.client.get(path, { headers, params });
    return response.data;
  }

  /**
   * Get settlements
   */
  async getSettlements(params?: {
    ticker?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ settlements: KalshiSettlement[]; cursor: string }> {
    const path = '/portfolio/settlements';
    const headers = this.getAuthHeaders('GET', path);

    const response = await this.client.get(path, { headers, params });
    return response.data;
  }

  /**
   * Get all active positions
   */
  async getActivePositions(): Promise<KalshiMarketPosition[]> {
    const positions = await this.getPositions({ count_filter: 'position' });
    return positions.market_positions.filter((pos) => pos.position !== 0);
  }

  /**
   * Get position for specific market
   */
  async getMarketPosition(ticker: string): Promise<KalshiMarketPosition | null> {
    const positions = await this.getPositions({ ticker });
    
    if (positions.market_positions.length > 0) {
      return positions.market_positions[0];
    }

    return null;
  }

  /**
   * Get recent fills for a market
   */
  async getMarketFills(ticker: string, limit: number = 20): Promise<KalshiFill[]> {
    const fills = await this.getFills({ ticker, limit });
    return fills.fills;
  }

  /**
   * Calculate total portfolio value
   */
  async getPortfolioSummary(): Promise<{
    balance: number;
    portfolioValue: number;
    activePositions: number;
    totalPnL: number;
  }> {
    const balance = await this.getBalance();
    const positions = await this.getActivePositions();

    const totalPnL = positions.reduce((sum, pos) => sum + (pos.realized_pnl || 0), 0);

    return {
      balance: balance.balance,
      portfolioValue: balance.portfolio_value,
      activePositions: positions.length,
      totalPnL,
    };
  }

  /**
   * Place a limit order with price in cents
   */
  async placeLimitOrder(
    ticker: string,
    side: 'yes' | 'no',
    action: 'buy' | 'sell',
    count: number,
    priceInCents: number
  ): Promise<KalshiOrder> {
    const params: CreateOrderParams = {
      ticker,
      side,
      action,
      count,
      type: 'limit',
    };

    if (side === 'yes') {
      params.yes_price = priceInCents;
    } else {
      params.no_price = priceInCents;
    }

    return this.createOrder(params);
  }

  /**
   * Place a market order
   */
  async placeMarketOrder(
    ticker: string,
    side: 'yes' | 'no',
    action: 'buy' | 'sell',
    count: number,
    maxCostInCents?: number
  ): Promise<KalshiOrder> {
    const params: CreateOrderParams = {
      ticker,
      side,
      action,
      count,
      type: 'market',
    };

    if (maxCostInCents !== undefined) {
      params.buy_max_cost = maxCostInCents;
    }

    return this.createOrder(params);
  }

  /**
   * Cancel all orders for a specific market
   */
  async cancelAllMarketOrders(ticker: string): Promise<Array<{ order_id: string; status: string }>> {
    const orders = await this.getOrders({ ticker, status: 'resting' });
    
    const cancelPromises = orders.orders.map((order) => 
      this.cancelOrder(order.order_id).catch((error) => ({
        order_id: order.order_id,
        status: 'failed',
        error: error.message,
      }))
    );

    return Promise.all(cancelPromises);
  }
}

// Singleton factory
let tradeServiceInstance: KalshiTradeService | null = null;

export function getKalshiTradeService(apiKey?: string, privateKey?: string): KalshiTradeService {
  // Use provided credentials or fall back to config (shared account)
  const key = apiKey || config.kalshi.apiKey;
  const pkey = privateKey || config.kalshi.privateKey;
  
  if (!key || !pkey) {
    throw new Error('Kalshi API credentials not provided and not found in config');
  }
  
  if (!tradeServiceInstance || 
      tradeServiceInstance['apiKey'] !== key || 
      tradeServiceInstance['privateKey'] !== pkey) {
    tradeServiceInstance = new KalshiTradeService(key, pkey);
  }
  return tradeServiceInstance;
}
