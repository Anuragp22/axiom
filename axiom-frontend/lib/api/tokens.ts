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
  source: 'dexscreener' | 'jupiter' | 'geckoterminal';
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
      pairAddress: backendToken.pair_address || backendToken.token_address, // Fallback to token address if no pair address
      dexId: backendToken.dex_id || backendToken.protocol,
      url: `https://dexscreener.com/solana/${backendToken.pair_address || backendToken.token_address}`,
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
 * TODO: Replace with real audit API calls (RugCheck, GoPlus, etc.)
 */
function generateAuditInfo(token: BackendToken): any {
  // Return minimal audit info without random data
  // In production, this should call real audit APIs
  return {
    honeypot: false, // Default to safe
    honeypotPercentage: undefined,
    isVerified: false, // Default to unverified
    isScam: false, // Default to not scam
    rugRisk: 'unknown', // Default to unknown risk
    liquidityLocked: token.liquidity_usd ? token.liquidity_usd > 100000 : false,
    mintDisabled: undefined, // Unknown without real audit data
    riskScore: undefined, // No score without real audit
    burnPercentage: undefined, // Unknown without real audit data
    isPaid: false, // Default to unpaid
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
function filtersToQueryParams(filters: Partial<TableFilters>): Record<string, any> {
  const params: Record<string, any> = {};

  // Map frontend timeframes to backend timeframes
  if (filters.timeframe) {
    const timeframeMapping = {
      '5m': '1h', // Map 5m to 1h since backend doesn't support 5m
      '1h': '1h',
      '6h': '24h', // Map 6h to 24h since backend doesn't support 6h
      '24h': '24h',
    };
    params.timeframe = timeframeMapping[filters.timeframe] || '24h';
  }
  
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
    params.sort_by = sortMapping[filters.sortBy] || filters.sortBy;
  }
  if (filters.sortDirection) params.sort_direction = filters.sortDirection;

  return params;
}

/**
 * Token API service class
 */
export class TokenApiService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  async getTokens(
    filters: Partial<TableFilters> = {},
    page = 1,
    pageSize = 50,
    cursor?: string
  ): Promise<TokenListResponse> {
    try {
      // Fetch more tokens than needed for client-side pagination
      // Backend has a max limit of 100, so we'll use that
      const apiLimit = 100; // Maximum allowed by backend
      
      const params = new URLSearchParams({
        limit: apiLimit.toString(),
        ...filtersToQueryParams(filters),
      });

      if (cursor) {
        params.set('cursor', cursor);
      }

      const response = await apiClient.get<BackendTokenListResponse>(`/tokens?${params}`);

      const { tokens, pagination } = response;
      
      return {
        tokens: tokens.map(transformToken),
        pagination: {
          page,
          pageSize,
          total: pagination.total || 0,
          totalPages: Math.ceil((pagination.total || 0) / pageSize),
          cursor: pagination.next_cursor,
          hasMore: pagination.has_more,
        },
        filters: filters as TableFilters,
      };
    } catch (error) {
      console.error('Error fetching tokens:', error);
      throw error;
    }
  }

  async searchTokens(
    query: string,
    filters: Partial<TableFilters> = {},
    page = 1,
    pageSize = 50,
    cursor?: string
  ): Promise<TokenListResponse> {
    try {
      // Fetch more tokens than needed for client-side pagination
      // Backend has a max limit of 100
      const apiLimit = 100;
      
      const params = new URLSearchParams({
        q: query,
        limit: apiLimit.toString(),
        ...filtersToQueryParams(filters),
      });

      if (cursor) {
        params.set('cursor', cursor);
      }

      const response = await apiClient.get<BackendTokenListResponse>(`/tokens/search?${params}`);

      const { tokens, pagination } = response;
      
      return {
        tokens: tokens.map(transformToken),
        pagination: {
          page,
          pageSize,
          total: pagination.total || 0,
          totalPages: Math.ceil((pagination.total || 0) / pageSize),
          cursor: pagination.next_cursor,
          hasMore: pagination.has_more,
        },
        filters: filters as TableFilters,
      };
    } catch (error) {
      console.error('Error searching tokens:', error);
      throw error;
    }
  }

  /**
   * Get trending tokens
   */
  async getTrendingTokens(limit = 50): Promise<{ tokens: Token[] }> {
    // Fetch more tokens for client-side pagination
    // Backend has a max limit of 100
    const apiLimit = 100;
    
    const params = new URLSearchParams({
      limit: apiLimit.toString(),
    });
    
    const response = await apiClient.get<{ tokens: BackendToken[] }>(`/tokens/trending?${params}`);
    
    return {
      tokens: response.tokens.map(transformToken),
    };
  }

  /**
   * Get featured tokens (specific popular tokens from DexScreener)
   */
  async getFeaturedTokens(): Promise<{ tokens: Token[] }> {
    const response = await apiClient.get<{ tokens: BackendToken[] }>('/tokens/featured');
    
    return {
      tokens: response.tokens.map(transformToken),
    };
  }

  /**
   * Get token details by ID/address
   */
  async getTokenDetails(tokenId: string): Promise<Token> {
    // Use search to find the token by address/symbol
    const result = await this.searchTokens(tokenId, {}, 1, 1);
    
    if (result.tokens.length === 0) {
      throw new Error('Token not found');
    }
    
    return result.tokens[0];
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