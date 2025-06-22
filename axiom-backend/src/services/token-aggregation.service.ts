import { DexScreenerService } from './dexscreener.service';
import { JupiterService } from './jupiter.service';
import { RedisCacheService } from './redis-cache.service';
import { Token, TokenFilters, TokenSortOptions, PaginationOptions, TokenListResponse } from '@/types/token';
import logger from '@/utils/logger';
import { ValidationError } from '@/utils/errors';
import config from '@/config';

export class TokenAggregationService {
  private dexScreenerService: DexScreenerService;
  private jupiterService: JupiterService;
  private redisCache: RedisCacheService;
  private readonly CACHE_TTL = config.cache.ttl; // Use config value

  constructor() {
    this.dexScreenerService = new DexScreenerService();
    this.jupiterService = new JupiterService();
    this.redisCache = new RedisCacheService();
  }

  async getTokens(
    filters?: TokenFilters,
    sort?: TokenSortOptions,
    pagination?: PaginationOptions
  ): Promise<TokenListResponse> {
    try {
      logger.info('Fetching aggregated token data', { filters, sort, pagination });

      let allTokens = await this.getCachedOrFreshTokens();

      if (filters) {
        allTokens = this.applyFilters(allTokens, filters);
      }

      if (sort) {
        logger.info('Applying custom sorting', { sort });
        allTokens = this.applySorting(allTokens, sort);
      } else {
        // Apply default sorting by volume (descending) to show most relevant tokens first
        logger.info('Applying default sorting by volume (descending)');
        allTokens = this.applySorting(allTokens, { field: 'volume', direction: 'desc' });
      }

      const paginatedResult = this.applyPagination(allTokens, pagination);

      // Log the first few tokens to see the sorting effect
      logger.info('Top tokens after sorting', {
        topTokens: paginatedResult.tokens.slice(0, 3).map(t => ({
          address: t.token_address.slice(0, 8) + '...',
          name: t.token_name,
          source: t.source,
          volume_usd: t.volume_usd
        }))
      });

      logger.info('Successfully aggregated token data', {
        totalTokens: allTokens.length,
        returnedTokens: paginatedResult.tokens.length,
        hasMore: paginatedResult.pagination.has_more,
      });

      return paginatedResult;
    } catch (error) {
      logger.error('Failed to get aggregated tokens', { error });
      throw error;
    }
  }

  async searchTokens(
    query: string,
    sort?: TokenSortOptions,
    pagination?: PaginationOptions
  ): Promise<TokenListResponse> {
    try {
      if (!query || query.trim().length < 2) {
        throw new ValidationError('Search query must be at least 2 characters long');
      }

      logger.info('Searching tokens via DexScreener', { query });

      // Only search via DexScreener now
      const dexScreenerTokens = await this.dexScreenerService.searchTokens(query.trim());
      
      let allTokens: Token[] = [...dexScreenerTokens];

      // Enrich with Jupiter prices
      allTokens = await this.jupiterService.enrichTokensWithPrices(allTokens);

      if (sort) {
        allTokens = this.applySorting(allTokens, sort);
      } else {
        // Apply default sorting by volume (descending) to show most relevant tokens first
        allTokens = this.applySorting(allTokens, { field: 'volume', direction: 'desc' });
      }

      const paginatedResult = this.applyPagination(allTokens, pagination);

      logger.info('Successfully searched tokens', {
        query,
        totalFound: allTokens.length,
        returnedTokens: paginatedResult.tokens.length,
      });

      return paginatedResult;
    } catch (error) {
      logger.error('Failed to search tokens', { query, error });
      throw error;
    }
  }

  async getTrendingTokens(limit: number = 50): Promise<Token[]> {
    try {
      logger.info('Fetching trending tokens from DexScreener', { limit });

      const dexScreenerTokens = await this.dexScreenerService.getTrendingTokens();
      
      let allTokens: Token[] = [...dexScreenerTokens];

      // Enrich with Jupiter prices
      allTokens = await this.jupiterService.enrichTokensWithPrices(allTokens);

      return allTokens
        .sort((a, b) => (b.volume_usd || 0) - (a.volume_usd || 0))
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to fetch trending tokens', { error });
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

    logger.debug('Cache miss - fetching fresh token data');
    const freshTokens = await this.fetchTokensFromAllSources();
    
    // Store in Redis cache with TTL
    await this.redisCache.set(cacheKey, freshTokens, this.CACHE_TTL);

    return freshTokens;
  }

  private async fetchTokensFromAllSources(): Promise<Token[]> {
    try {
      logger.info('Fetching tokens from DexScreener');
      const dexScreenerTokens = await this.dexScreenerService.getTrendingTokens();
      
      let allTokens: Token[] = [...dexScreenerTokens];

      logger.info('Successfully fetched tokens from DexScreener', { 
        count: dexScreenerTokens.length 
      });

      // Enrich with Jupiter prices
      allTokens = await this.jupiterService.enrichTokensWithPrices(allTokens);

      logger.info('Successfully enriched tokens with Jupiter prices', {
        totalTokens: allTokens.length
      });

      return allTokens;
    } catch (error) {
      logger.error('Failed to fetch tokens from DexScreener', { error });
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
    logger.info('Redis token cache cleared');
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
}
