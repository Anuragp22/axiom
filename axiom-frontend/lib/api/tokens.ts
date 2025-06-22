import { apiClient } from './client';
import { Token, TableFilters, TokenListResponse } from '@/lib/types';

// Backend token interface (to be transformed to frontend Token interface)
interface BackendToken {
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

interface BackendTokenListResponse {
  tokens: BackendToken[];
  pagination: {
    next_cursor?: string;
    has_more: boolean;
    total?: number;
  };
}

/**
 * Transform backend token to frontend token format
 */
function transformToken(backendToken: BackendToken): Token {
  const age = backendToken.created_at 
    ? formatAge(Date.now() - backendToken.created_at * 1000) 
    : 'Unknown';

  return {
    id: backendToken.token_address,
    name: backendToken.token_name,
    symbol: backendToken.token_ticker,
    imageUrl: generateTokenImage(backendToken.token_ticker),
    pairInfo: {
      baseToken: {
        id: backendToken.token_address,
        symbol: backendToken.token_ticker,
        name: backendToken.token_name,
        image: generateTokenImage(backendToken.token_ticker),
        chainId: 101, // Solana
        address: backendToken.token_address,
        decimals: 9,
      },
      quoteToken: {
        id: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        image: '/images/solana.png',
        chainId: 101,
        address: 'So11111111111111111111111111111111111111112',
        decimals: 9,
      },
      pairAddress: backendToken.pair_address || '',
      dexId: backendToken.dex_id || backendToken.protocol,
      url: `https://dexscreener.com/solana/${backendToken.pair_address}`,
    },
    priceData: {
      current: backendToken.price_usd || backendToken.price_sol,
      change24h: backendToken.price_24hr_change || backendToken.price_1hr_change,
      change1h: backendToken.price_1hr_change,
      change5m: 0, // Not available from backend
      high24h: 0, // Not available from backend
      low24h: 0, // Not available from backend
    },
    volumeData: {
      h24: backendToken.volume_usd || backendToken.volume_sol,
      h6: 0, // Not available from backend
      h1: 0, // Not available from backend
      m5: 0, // Not available from backend
    },
    transactionData: {
      buys24h: Math.floor(backendToken.transaction_count * 0.6), // Estimated
      sells24h: Math.floor(backendToken.transaction_count * 0.4), // Estimated
      total24h: backendToken.transaction_count,
      makers: 0, // Not available from backend
      swaps: backendToken.transaction_count,
    },
    liquidityData: {
      usd: backendToken.liquidity_usd || backendToken.liquidity_sol,
      base: backendToken.liquidity_sol,
      quote: 0, // Not available from backend
    },
    marketCap: backendToken.market_cap_usd || backendToken.market_cap_sol,
    liquidity: backendToken.liquidity_usd || backendToken.liquidity_sol,
    volume24h: backendToken.volume_usd || backendToken.volume_sol,
    transactions24h: backendToken.transaction_count,
    buys24h: Math.floor(backendToken.transaction_count * 0.6),
    sells24h: Math.floor(backendToken.transaction_count * 0.4),
    priceChange24h: backendToken.price_24hr_change || backendToken.price_1hr_change,
    fdv: backendToken.market_cap_usd || backendToken.market_cap_sol,
    audit: generateAuditInfo(backendToken),
    socialLinks: generateSocialLinks(backendToken.token_ticker),
    age,
    communityUrl: `https://t.me/${backendToken.token_ticker.toLowerCase()}`,
    isPumpFun: backendToken.protocol.toLowerCase().includes('pump'),
    isGraduated: backendToken.liquidity_usd ? backendToken.liquidity_usd > 50000 : false,
    createdAt: new Date(backendToken.created_at ? backendToken.created_at * 1000 : Date.now()).toISOString(),
    updatedAt: new Date(backendToken.updated_at * 1000).toISOString(),
  };
}

/**
 * Generate token image URL (placeholder implementation)
 * Using a service that returns PNG images instead of SVG
 */
function generateTokenImage(symbol: string): string {
  // Use a service that returns PNG images, or fallback to a simple data URL
  const colors = [
    'FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 
    'DDA0DD', 'FFB347', '87CEEB', 'F0E68C', 'FF69B4'
  ];
  
  const colorIndex = symbol.length % colors.length;
  const bgColor = colors[colorIndex];
  const textColor = 'FFFFFF';
  
  // Create a simple image URL using an avatar service that returns PNG
  return `https://ui-avatars.com/api/?name=${symbol}&size=64&background=${bgColor}&color=${textColor}&bold=true&format=png`;
}

/**
 * Generate audit information (placeholder implementation)
 */
function generateAuditInfo(token: BackendToken): any {
  const riskScore = Math.floor(Math.random() * 100);
  return {
    honeypot: riskScore > 80,
    honeypotPercentage: riskScore > 80 ? riskScore : undefined,
    isVerified: riskScore < 30,
    isScam: riskScore > 90,
    rugRisk: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
    liquidityLocked: token.liquidity_usd ? token.liquidity_usd > 100000 : false,
    mintDisabled: Math.random() > 0.3,
    riskScore,
    burnPercentage: Math.floor(Math.random() * 100),
    isPaid: Math.random() > 0.7,
  };
}

/**
 * Generate social links (placeholder implementation)
 */
function generateSocialLinks(symbol: string): any {
  return {
    website: `https://${symbol.toLowerCase()}.com`,
    twitter: `https://twitter.com/${symbol.toLowerCase()}`,
    telegram: `https://t.me/${symbol.toLowerCase()}`,
  };
}

/**
 * Format age timestamp to human readable string
 */
function formatAge(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Convert frontend filters to backend query parameters
 */
function filtersToQueryParams(filters: TableFilters): Record<string, any> {
  const params: Record<string, any> = {};

  if (filters.timeframe) params.timeframe = filters.timeframe;
  if (filters.minVolume) params.min_volume = filters.minVolume;
  if (filters.minMarketCap) params.min_market_cap = filters.minMarketCap;
  if (filters.minLiquidity) params.min_liquidity = filters.minLiquidity;
  if (filters.sortBy) {
    const sortMapping = {
      marketCap: 'market_cap',
      liquidity: 'liquidity',
      volume: 'volume',
      priceChange: 'price_change',
      age: 'created_at',
      transactions: 'volume', // Use volume as proxy
    };
    params.sort_by = sortMapping[filters.sortBy] || 'market_cap';
  }
  if (filters.sortDirection) params.sort_direction = filters.sortDirection;

  return params;
}

/**
 * Token API service class
 */
export class TokenApiService {
  /**
   * Get paginated list of tokens with filtering and sorting
   */
  async getTokens(
    filters: Partial<TableFilters> = {},
    page = 1,
    pageSize = 50
  ): Promise<TokenListResponse> {
    const params = {
      ...filtersToQueryParams(filters as TableFilters),
      limit: pageSize,
      // Note: Backend uses cursor-based pagination, frontend uses page-based
      // This is a simplified mapping
    };

    const response = await apiClient.get<BackendTokenListResponse>('/tokens', { params });
    
    return {
      tokens: response.tokens.map(transformToken),
      pagination: {
        page,
        pageSize,
        total: response.pagination.total || 0,
        totalPages: Math.ceil((response.pagination.total || 0) / pageSize),
      },
      filters: filters as TableFilters,
    };
  }

  /**
   * Search tokens by name or symbol
   */
  async searchTokens(
    query: string,
    filters: Partial<TableFilters> = {},
    page = 1,
    pageSize = 50
  ): Promise<TokenListResponse> {
    const params = {
      q: query,
      ...filtersToQueryParams(filters as TableFilters),
      limit: pageSize,
    };

    const response = await apiClient.get<BackendTokenListResponse>('/tokens/search', { params });
    
    return {
      tokens: response.tokens.map(transformToken),
      pagination: {
        page,
        pageSize,
        total: response.pagination.total || 0,
        totalPages: Math.ceil((response.pagination.total || 0) / pageSize),
      },
      filters: filters as TableFilters,
    };
  }

  /**
   * Get trending tokens
   */
  async getTrendingTokens(limit = 50): Promise<{ tokens: Token[] }> {
    const response = await apiClient.get<{ tokens: BackendToken[] }>('/tokens/trending', {
      params: { limit },
    });
    
    return {
      tokens: response.tokens.map(transformToken),
    };
  }

  /**
   * Get token details by ID/address
   */
  async getTokenDetails(tokenId: string): Promise<Token> {
    // This endpoint might not exist in backend, so we'll get it from the list
    const response = await apiClient.get<BackendTokenListResponse>('/tokens', {
      params: { token_address: tokenId, limit: 1 },
    });
    
    if (response.tokens.length === 0) {
      throw new Error('Token not found');
    }
    
    return transformToken(response.tokens[0]);
  }

  /**
   * Clear cache (admin function)
   */
  async clearCache(): Promise<{ message: string }> {
    return apiClient.post('/tokens/cache/clear');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    return apiClient.get('/tokens/cache/stats');
  }
}

// Export singleton instance
export const tokenApi = new TokenApiService();
export default tokenApi; 