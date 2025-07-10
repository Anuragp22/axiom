export interface Token {
  token_address: string;
  token_name: string;
  token_ticker: string;
  price_sol: number;
  price_usd?: number;
  market_cap_sol: number;
  market_cap_usd?: number;
  volume_sol: number;
  volume_usd?: number;
  liquidity_sol: number;
  liquidity_usd?: number;
  transaction_count: number;
  price_1hr_change: number;
  price_24hr_change?: number;
  price_7d_change?: number;
  protocol: string;
  dex_id?: string;
  pair_address?: string;
  created_at?: number;
  updated_at: number;
  source: 'dexscreener' | 'websocket';
}

export interface WebSocketMessage {
  type: 'price_update' | 'volume_update' | 'new_token' | 'error';
  data: any;
  timestamp: number;
} 