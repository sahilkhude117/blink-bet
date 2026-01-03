/**
 * Kalshi API Types
 * Type definitions for Kalshi prediction markets
 */

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  market_type: 'binary' | 'spread';
  title: string;
  subtitle?: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  created_time?: string;
  open_time?: string;
  close_time?: string;
  expiration_time?: string;
  latest_expiration_time?: string;
  settlement_timer_seconds?: number;
  status: 'initialized' | 'unopened' | 'open' | 'paused' | 'closed' | 'settled';
  response_price_units?: 'usd_cent';
  yes_bid?: number;
  yes_bid_dollars?: string;
  yes_ask?: number;
  yes_ask_dollars?: string;
  no_bid?: number;
  no_bid_dollars?: string;
  no_ask?: number;
  no_ask_dollars?: string;
  last_price?: number;
  last_price_dollars?: string;
  volume?: number;
  volume_24h?: number;
  result?: 'yes' | 'no' | null;
  can_close_early?: boolean;
  open_interest?: number;
  notional_value?: number;
  notional_value_dollars?: string;
  previous_yes_bid?: number;
  previous_yes_bid_dollars?: string;
  previous_yes_ask?: number;
  previous_yes_ask_dollars?: string;
  previous_price?: number;
  previous_price_dollars?: string;
  liquidity?: number;
  liquidity_dollars?: string;
  expiration_value?: string;
  category?: string;
  risk_limit_cents?: number;
  tick_size?: number;
  rules_primary?: string;
  rules_secondary?: string;
  price_level_structure?: string;
  price_ranges?: PriceRange[];
  expected_expiration_time?: string;
  settlement_value?: number;
  settlement_value_dollars?: string;
  settlement_ts?: string;
  fee_waiver_expiration_time?: string;
  early_close_condition?: string;
  strike_type?: 'greater' | 'less';
  floor_strike?: number;
  cap_strike?: number;
  functional_strike?: string;
}

export interface PriceRange {
  start: string;
  end: string;
  step: string;
}

export interface KalshiEvent {
  event_ticker: string;
  series_ticker?: string;
  sub_title?: string;
  title: string;
  collateral_return_type?: string;
  mutually_exclusive?: boolean;
  category?: string;
  available_on_brokers?: boolean;
  product_metadata?: Record<string, any>;
  strike_date?: string;
  strike_period?: string;
  markets?: KalshiMarket[];
}

export interface KalshiSeries {
  series_ticker: string;
  title: string;
  category?: string;
  frequency?: string;
}

export interface KalshiOrder {
  order_id: string;
  user_id: string;
  client_order_id?: string;
  ticker: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  type: 'limit' | 'market';
  status: 'resting' | 'pending' | 'canceled' | 'executed' | 'expired';
  yes_price?: number;
  no_price?: number;
  yes_price_dollars?: string;
  no_price_dollars?: string;
  fill_count?: number;
  remaining_count?: number;
  initial_count?: number;
  taker_fees?: number;
  maker_fees?: number;
  taker_fill_cost?: number;
  maker_fill_cost?: number;
  taker_fill_cost_dollars?: string;
  maker_fill_cost_dollars?: string;
  queue_position?: number;
  taker_fees_dollars?: string;
  maker_fees_dollars?: string;
  expiration_time?: string;
  created_time?: string;
  updated_time?: string;
}

export interface CreateOrderParams {
  ticker: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  count: number;
  client_order_id?: string;
  type?: 'limit' | 'market';
  yes_price?: number;
  no_price?: number;
  yes_price_dollars?: string;
  no_price_dollars?: string;
  expiration_ts?: number;
  time_in_force?: 'fill_or_kill' | 'good_till_canceled' | 'immediate_or_cancel';
  buy_max_cost?: number;
  post_only?: boolean;
  reduce_only?: boolean;
  sell_position_floor?: number;
  self_trade_prevention_type?: 'taker_at_cross' | 'maker';
  order_group_id?: string;
}

export interface KalshiFill {
  fill_id: string;
  trade_id: string;
  order_id: string;
  ticker: string;
  market_ticker: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  count: number;
  price: number;
  yes_price: number;
  no_price: number;
  yes_price_fixed?: string;
  no_price_fixed?: string;
  is_taker: boolean;
  client_order_id?: string;
  created_time: string;
  ts: number;
}

export interface KalshiBalance {
  balance: number;
  portfolio_value: number;
  updated_ts: number;
}

export interface KalshiMarketPosition {
  ticker: string;
  total_traded: number;
  total_traded_dollars?: string;
  position: number;
  market_exposure: number;
  market_exposure_dollars?: string;
  realized_pnl: number;
  realized_pnl_dollars?: string;
  resting_orders_count: number;
  fees_paid: number;
  fees_paid_dollars?: string;
  last_updated_ts: string;
}

export interface KalshiEventPosition {
  event_ticker: string;
  total_cost: number;
  total_cost_dollars?: string;
  fees_paid: number;
  fees_paid_dollars?: string;
  realized_pnl: number;
  realized_pnl_dollars?: string;
  resting_order_count: number;
  market_positions: KalshiMarketPosition[];
}

export interface KalshiSettlement {
  ticker: string;
  market_result: 'yes' | 'no';
  revenue: number;
  revenue_dollars?: string;
  total_traded: number;
  total_traded_dollars?: string;
  no_count: number;
  yes_count: number;
  settled_time: string;
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
  yesPrice?: number;
  noPrice?: number;
  volume24h?: number;
  openInterest?: number;
  yesBid?: number | null;
  yesAsk?: number | null;
  noBid?: number | null;
  noAsk?: number | null;
  status?: string;
  lastPrice?: number;
}

export interface OrderbookLevel {
  price: number;
  count: number;
}

export interface Orderbook {
  yes: OrderbookLevel[];
  no: OrderbookLevel[];
}

export interface Trade {
  trade_id: string;
  ticker: string;
  yes_price: number;
  no_price: number;
  count: number;
  taker_side: 'yes' | 'no';
  created_time: string;
  ts: number;
}

export interface ExchangeStatus {
  exchange_active: boolean;
  trading_active: boolean;
  maintenance_message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  cursor?: string;
}

export interface EventsResponse {
  events: KalshiEvent[];
  cursor: string;
  milestones?: any[];
}

export interface MarketsResponse {
  markets: KalshiMarket[];
  cursor: string;
}

export interface OrdersResponse {
  orders: KalshiOrder[];
  cursor: string;
}

export interface FillsResponse {
  fills: KalshiFill[];
  cursor: string;
}

export interface PositionsResponse {
  market_positions: KalshiMarketPosition[];
  event_positions: KalshiEventPosition[];
  cursor?: string;
}

export interface SettlementsResponse {
  settlements: KalshiSettlement[];
  cursor: string;
}

export interface TradesResponse {
  trades: Trade[];
  cursor: string;
}

export interface SeriesResponse {
  series: KalshiSeries[];
}

export interface GetEventsParams {
  limit?: number;
  cursor?: string;
  with_nested_markets?: boolean;
  with_milestones?: boolean;
  status?: 'open' | 'closed' | 'settled';
  series_ticker?: string;
  min_close_ts?: number;
}

export interface GetMarketsParams {
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
}

export interface GetOrdersParams {
  ticker?: string;
  event_ticker?: string;
  min_ts?: number;
  max_ts?: number;
  status?: string;
  limit?: number;
  cursor?: string;
}

export interface GetFillsParams {
  ticker?: string;
  order_id?: string;
  min_ts?: number;
  max_ts?: number;
  limit?: number;
  cursor?: string;
}

export interface GetPositionsParams {
  cursor?: string;
  limit?: number;
  count_filter?: string;
  ticker?: string;
  event_ticker?: string;
}

export interface GetSettlementsParams {
  ticker?: string;
  limit?: number;
  cursor?: string;
}

export interface GetTradesParams {
  ticker?: string;
  limit?: number;
  cursor?: string;
  min_ts?: number;
  max_ts?: number;
}

export interface CandlestickParams {
  resolution?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  from?: string;
  to?: string;
}

export type MarketStatus = 'initialized' | 'unopened' | 'open' | 'paused' | 'closed' | 'settled';
export type OrderStatus = 'resting' | 'pending' | 'canceled' | 'executed' | 'expired';
export type OrderSide = 'yes' | 'no';
export type OrderAction = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export type TimeInForce = 'fill_or_kill' | 'good_till_canceled' | 'immediate_or_cancel';
export type SelfTradePreventionType = 'taker_at_cross' | 'maker';
