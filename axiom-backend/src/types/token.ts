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
  source: 'dexscreener' | 'jupiter' | 'geckoterminal';
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

export interface GeckoTerminalToken {
  id: string;
  type: string;
  attributes: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    total_supply: string;
    price_usd: string;
    fdv_usd: string;
    total_reserve_in_usd: string;
    volume_usd: {
      h1: string;
      h24: string;
    };
    market_cap_usd: string;
    price_change_percentage: {
      h1: string;
      h24: string;
    };
  };
  relationships: {
    top_pools: {
      data: Array<{
        id: string;
        type: string;
      }>;
    };
  };
}

export interface GeckoTerminalPool {
  id: string;
  type: string;
  attributes: {
    name: string;
    address: string;
    base_token_price_usd: string;
    quote_token_price_usd: string;
    base_token_price_native_currency: string;
    quote_token_price_native_currency: string;
    pool_created_at: string;
    reserve_in_usd: string;
    fdv_usd: string;
    market_cap_usd: string;
    price_change_percentage: {
      h1: string;
      h24: string;
    };
    transactions: {
      h1: {
        buys: number;
        sells: number;
      };
      h24: {
        buys: number;
        sells: number;
      };
    };
    volume_usd: {
      h1: string;
      h24: string;
    };
  };
  relationships: {
    base_token: {
      data: {
        id: string;
        type: string;
      };
    };
    quote_token: {
      data: {
        id: string;
        type: string;
      };
    };
    dex: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

export interface GeckoTerminalNetworkResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: {
      name: string;
      identifier: string;
      chain_identifier: string;
    };
  }>;
}

export interface GeckoTerminalTokenResponse {
  data: GeckoTerminalToken[];
  included?: Array<GeckoTerminalToken | GeckoTerminalPool>;
}

export interface GeckoTerminalPoolResponse {
  data: GeckoTerminalPool[];
  included?: Array<GeckoTerminalToken | GeckoTerminalPool>;
} 