import { DexScreenerService } from './dexscreener.service';
import { JupiterService } from './jupiter.service';
import { GeckoTerminalService } from './geckoterminal.service';
import { RedisCacheService } from './redis-cache.service';
import { Token, TokenFilters, TokenSortOptions, PaginationOptions, TokenListResponse } from '@/types/token';
import config from '@/config';
import logger from '@/utils/logger';
import { ValidationError } from '@/utils/errors';

export class TokenAggregationService {
  private dexScreenerService: DexScreenerService;
  private jupiterService: JupiterService;
  private geckoTerminalService: GeckoTerminalService;
  private redisCache: RedisCacheService;
  private readonly CACHE_TTL = config.cache.ttl; // Use config value
  private readonly GECKO_CACHE_TTL = 600; // 10 minutes for GeckoTerminal to reduce API calls
  private geckoTerminalCache: Token[] | null = null;
  private geckoTerminalCacheTime: number = 0;
  
  // Request deduplication - prevent multiple concurrent API calls
  private ongoingRequests: Map<string, Promise<Token[]>> = new Map();

  constructor() {
    this.dexScreenerService = new DexScreenerService();
    this.jupiterService = new JupiterService();
    this.geckoTerminalService = new GeckoTerminalService();
    this.redisCache = new RedisCacheService();
  }

  /**
   * Get GeckoTerminal tokens with aggressive caching to avoid rate limits
   */
  private async getCachedGeckoTerminalTokens(): Promise<Token[]> {
    const now = Date.now();
    
    // Check if we have cached data that's still valid
    if (this.geckoTerminalCache && 
        this.geckoTerminalCacheTime && 
        (now - this.geckoTerminalCacheTime) < (this.GECKO_CACHE_TTL * 1000)) {
      logger.debug('Using in-memory cached GeckoTerminal tokens');
      return this.geckoTerminalCache;
    }

    try {
      logger.info('Fetching fresh GeckoTerminal tokens');
      const tokens = await this.geckoTerminalService.getFamousTokens();
      
      // Update cache
      this.geckoTerminalCache = tokens;
      this.geckoTerminalCacheTime = now;
      
      return tokens;
    } catch (error) {
      logger.warn('Failed to fetch GeckoTerminal tokens, using cached data or empty array', { error });
      
      // Return cached data even if expired, or empty array
      return this.geckoTerminalCache || [];
    }
  }

  async getTokens(
    filters?: TokenFilters,
    sort?: TokenSortOptions,
    pagination?: PaginationOptions
  ): Promise<TokenListResponse> {
    try {
      logger.info('Fetching tokens with filters and pagination', { filters, sort, pagination });

      // Get cached or fresh token data
      let allTokens = await this.getCachedOrFreshTokens();

      // Apply filters
      if (filters) {
        allTokens = this.applyFilters(allTokens, filters);
      }

      // Apply sorting
      if (sort) {
        allTokens = this.applySorting(allTokens, sort);
      }

      // Apply pagination and return
      return this.applyPagination(allTokens, pagination);
    } catch (error) {
      logger.error('Failed to get tokens', { error, filters, sort, pagination });
      throw error;
    }
  }

  async searchTokens(
    query: string,
    sort?: TokenSortOptions,
    pagination?: PaginationOptions
  ): Promise<TokenListResponse> {
    try {
      logger.info('Searching tokens', { query, sort, pagination });

      // Search tokens using DexScreener
      let searchResults = await this.dexScreenerService.searchTokens(query);

      // Apply sorting if specified
      if (sort) {
        searchResults = this.applySorting(searchResults, sort);
      }

      // Apply pagination and return
      return this.applyPagination(searchResults, pagination);
    } catch (error) {
      logger.error('Failed to search tokens', { error, query, sort, pagination });
      throw error;
    }
  }

  async getTrendingTokens(limit: number = 50): Promise<Token[]> {
    const cacheKey = `trending_tokens_${limit}`;
    
    // Check if there's already an ongoing request
    const existingRequest = this.ongoingRequests.get(cacheKey);
    if (existingRequest) {
      logger.debug('Request deduplication - waiting for ongoing trending fetch');
      return existingRequest.then(tokens => tokens.slice(0, limit));
    }

    try {
      logger.info('Fetching trending tokens from multiple sources', { limit });
      
      const fetchPromise = this.fetchTrendingTokensInternal(limit);
      this.ongoingRequests.set(cacheKey, fetchPromise);
      
      const result = await fetchPromise;
      this.ongoingRequests.delete(cacheKey);
      
      return result;
    } catch (error) {
      this.ongoingRequests.delete(cacheKey);
      logger.error('Failed to fetch trending tokens', { error });
      throw error;
    }
  }

  private async fetchTrendingTokensInternal(limit: number): Promise<Token[]> {
    // Get tokens from both DexScreener and GeckoTerminal  
    const [dexScreenerTokens, geckoTerminalTokens] = await Promise.allSettled([
      this.dexScreenerService.getTrendingTokens(),
      this.getCachedGeckoTerminalTokens()
    ]);

    let allTokens: Token[] = [];

    // Add DexScreener tokens if successful
    if (dexScreenerTokens.status === 'fulfilled') {
      allTokens.push(...dexScreenerTokens.value);
    } else {
      logger.warn('Failed to fetch DexScreener trending tokens', { 
        error: dexScreenerTokens.reason 
      });
    }

    // Add GeckoTerminal tokens if successful
    if (geckoTerminalTokens.status === 'fulfilled') {
      allTokens.push(...geckoTerminalTokens.value);
    } else {
      logger.warn('Failed to fetch GeckoTerminal famous tokens', { 
        error: geckoTerminalTokens.reason 
      });
    }

    // Remove duplicates based on token address
    allTokens = this.removeDuplicates(allTokens);
    
    // Enrich with Jupiter prices
    allTokens = await this.jupiterService.enrichTokensWithPrices(allTokens);
    
    logger.info('Successfully fetched trending tokens from all sources', { 
      count: allTokens.length 
    });

    return allTokens
      .sort((a, b) => (b.volume_usd || 0) - (a.volume_usd || 0))
      .slice(0, limit);
  }

  async getFeaturedTokens(): Promise<Token[]> {
    try {
      logger.info('Fetching featured tokens from multiple sources');

      // Get tokens from both DexScreener and GeckoTerminal
      const [dexScreenerTokens, geckoTerminalTokens] = await Promise.allSettled([
        this.dexScreenerService.getFeaturedTokens(),
        this.getCachedGeckoTerminalTokens()
      ]);

      let allTokens: Token[] = [];

      // Add DexScreener tokens if successful
      if (dexScreenerTokens.status === 'fulfilled') {
        allTokens.push(...dexScreenerTokens.value);
      } else {
        logger.warn('Failed to fetch DexScreener featured tokens', { 
          error: dexScreenerTokens.reason 
        });
      }

      // Add GeckoTerminal tokens if successful
      if (geckoTerminalTokens.status === 'fulfilled') {
        allTokens.push(...geckoTerminalTokens.value);
      } else {
        logger.warn('Failed to fetch GeckoTerminal famous tokens', { 
          error: geckoTerminalTokens.reason 
        });
      }

      // Remove duplicates based on token address
      allTokens = this.removeDuplicates(allTokens);

      // Enrich with Jupiter prices
      allTokens = await this.jupiterService.enrichTokensWithPrices(allTokens);

      return allTokens
        .sort((a, b) => (b.market_cap_usd || 0) - (a.market_cap_usd || 0));
    } catch (error) {
      logger.error('Failed to fetch featured tokens', { error });
      throw error;
    }
  }

  private async getCachedOrFreshTokens(): Promise<Token[]> {
    const cacheKey = 'all_tokens';
    
    // Try to get from Redis cache first
    const cached = await this.redisCache.get<Token[]>(cacheKey);
    if (cached) {
      logger.debug('Returning cached token data from Redis');
      return cached;
    }

    // Check if there's already an ongoing request for this data
    const existingRequest = this.ongoingRequests.get(cacheKey);
    if (existingRequest) {
      logger.debug('Request deduplication - waiting for ongoing fetch');
      return existingRequest;
    }

    logger.debug('Cache miss - fetching fresh token data');
    
    // Create and store the promise to prevent duplicate requests
    const fetchPromise = this.fetchTokensFromAllSources()
      .then(async (freshTokens) => {
        // Store in Redis cache with TTL
        await this.redisCache.set(cacheKey, freshTokens, this.CACHE_TTL);
        return freshTokens;
      })
      .finally(() => {
        // Clean up the ongoing request
        this.ongoingRequests.delete(cacheKey);
      });

    this.ongoingRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  private async fetchTokensFromAllSources(): Promise<Token[]> {
    try {
      logger.info('Fetching tokens from all sources');
      
      // Get tokens from both DexScreener and GeckoTerminal
      const [dexScreenerTokens, geckoTerminalTokens] = await Promise.allSettled([
        this.dexScreenerService.getTrendingTokens(),
        this.getCachedGeckoTerminalTokens()
      ]);

      let allTokens: Token[] = [];

      // Add DexScreener tokens if successful
      if (dexScreenerTokens.status === 'fulfilled') {
        allTokens.push(...dexScreenerTokens.value);
        logger.info('Successfully fetched tokens from DexScreener', { 
          count: dexScreenerTokens.value.length 
        });
      } else {
        logger.warn('Failed to fetch DexScreener tokens', { 
          error: dexScreenerTokens.reason 
        });
      }

      // Add GeckoTerminal tokens if successful
      if (geckoTerminalTokens.status === 'fulfilled') {
        allTokens.push(...geckoTerminalTokens.value);
        logger.info('Successfully fetched tokens from GeckoTerminal', { 
          count: geckoTerminalTokens.value.length 
        });
      } else {
        logger.warn('Failed to fetch GeckoTerminal tokens', { 
          error: geckoTerminalTokens.reason 
        });
      }

      // Remove duplicates based on token address
      allTokens = this.removeDuplicates(allTokens);

      // Enrich with Jupiter prices
      allTokens = await this.jupiterService.enrichTokensWithPrices(allTokens);

      logger.info('Successfully fetched and processed tokens from all sources', {
        totalTokens: allTokens.length
      });

      return allTokens;
    } catch (error) {
      logger.error('Failed to fetch tokens from all sources', { error });
      throw error;
    }
  }

  private applyFilters(tokens: Token[], filters: TokenFilters): Token[] {
    return tokens.filter(token => {
      if (filters.min_volume && (token.volume_usd || 0) < filters.min_volume) {
        return false;
      }

      if (filters.min_market_cap && (token.market_cap_usd || 0) < filters.min_market_cap) {
        return false;
      }

      if (filters.min_liquidity && (token.liquidity_usd || 0) < filters.min_liquidity) {
        return false;
      }

      if (filters.protocols && filters.protocols.length > 0) {
        return filters.protocols.includes(token.protocol);
      }

      return true;
    });
  }

  private applySorting(tokens: Token[], sort: TokenSortOptions): Token[] {
    return tokens.sort((a, b) => {
      let valueA: number;
      let valueB: number;

      switch (sort.field) {
        case 'volume':
          valueA = a.volume_usd || 0;
          valueB = b.volume_usd || 0;
          break;
        case 'market_cap':
          valueA = a.market_cap_usd || 0;
          valueB = b.market_cap_usd || 0;
          break;
        case 'price_change':
          valueA = a.price_24hr_change || 0;
          valueB = b.price_24hr_change || 0;
          break;
        case 'liquidity':
          valueA = a.liquidity_usd || 0;
          valueB = b.liquidity_usd || 0;
          break;
        case 'created_at':
          valueA = a.created_at || 0;
          valueB = b.created_at || 0;
          break;
        default:
          return 0;
      }

      return sort.direction === 'asc' ? valueA - valueB : valueB - valueA;
    });
  }

  private applyPagination(tokens: Token[], pagination?: PaginationOptions): TokenListResponse {
    const limit = Math.min(pagination?.limit || 20, 100);
    let startIndex = 0;

    if (pagination?.cursor) {
      try {
        const cursorData = JSON.parse(Buffer.from(pagination.cursor, 'base64').toString());
        startIndex = cursorData.offset || 0;
      } catch (error) {
        logger.warn('Invalid pagination cursor', { cursor: pagination.cursor });
      }
    }

    const endIndex = startIndex + limit;
    const paginatedTokens = tokens.slice(startIndex, endIndex);
    const hasMore = endIndex < tokens.length;

    let nextCursor: string | undefined;
    if (hasMore) {
      nextCursor = Buffer.from(JSON.stringify({ offset: endIndex })).toString('base64');
    }

    const result: TokenListResponse = {
      tokens: paginatedTokens,
      pagination: {
        has_more: hasMore,
        total: tokens.length,
      },
    };

    if (nextCursor) {
      result.pagination.next_cursor = nextCursor;
    }

    return result;
  }

  async clearCache(): Promise<void> {
    await this.redisCache.clear();
    
    // Clear in-memory caches
    this.geckoTerminalCache = null;
    this.geckoTerminalCacheTime = 0;
    
    // Clear ongoing requests to force fresh fetches
    this.ongoingRequests.clear();
    
    logger.info('Redis cache cleared');
  }

  async getCacheStats(): Promise<{ 
    connected: boolean; 
    memory: string; 
    keys: number; 
    size: number; 
    entries: string[] 
  }> {
    const redisStats = await this.redisCache.getStats();
    return {
      connected: redisStats.connected,
      memory: redisStats.memory,
      keys: redisStats.keys,
      size: redisStats.keys, // For backward compatibility
      entries: [], // Redis doesn't easily return all keys, would be expensive
    };
  }

  private removeDuplicates(tokens: Token[]): Token[] {
    const uniqueTokens = new Map<string, Token>();
    
    for (const token of tokens) {
      const key = token.token_address;
      const existingToken = uniqueTokens.get(key);
      
      if (!existingToken || token.updated_at > existingToken.updated_at) {
        uniqueTokens.set(key, token);
      }
    }
    
    return Array.from(uniqueTokens.values());
  }
}
