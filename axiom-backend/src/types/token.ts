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
  source: 'dexscreener' | 'jupiter';
}

export interface DexScreenerToken {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    [key: string]: {
      buys: number;
      sells: number;
    };
  };
  volume: {
    [key: string]: number;
  };
  priceChange: {
    [key: string]: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
}

export interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexScreenerToken[];
}

export interface JupiterPriceResponse {
  data: {
    [tokenAddress: string]: {
      id: string;
      type: string;
      price: string;
    };
  };
  timeTaken: number;
}

export interface TokenFilters {
  timeframe?: '1h' | '24h' | '7d';
  min_volume?: number;
  min_market_cap?: number;
  min_liquidity?: number;
  protocols?: string[];
}

export interface TokenSortOptions {
  field: 'volume' | 'market_cap' | 'price_change' | 'liquidity' | 'created_at';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  limit?: number;
  cursor?: string;
}

export interface TokenListResponse {
  tokens: Token[];
  pagination: {
    next_cursor?: string;
    has_more: boolean;
    total?: number;
  };
}

export interface WebSocketMessage {
  type: 'price_update' | 'volume_update' | 'new_token' | 'error';
  data: any;
  timestamp: number;
} 