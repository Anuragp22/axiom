import { DexScreenerService } from './dexscreener.service';
import { JupiterService } from './jupiter.service';
import { GeckoTerminalService } from './geckoterminal.service';
import { Token, TokenFilters, TokenSortOptions, PaginationOptions, TokenListResponse } from '@/types/token';
import logger from '@/utils/logger';
import { ValidationError } from '@/utils/errors';

export class TokenAggregationService {
  private dexScreenerService: DexScreenerService;
  private jupiterService: JupiterService;
  private geckoTerminalService: GeckoTerminalService;
  private cache: Map<string, { data: Token[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 1000; // 30 seconds

  constructor() {
    this.dexScreenerService = new DexScreenerService();
    this.jupiterService = new JupiterService();
    this.geckoTerminalService = new GeckoTerminalService();
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

      logger.info('Searching tokens across all sources', { query });

      const [dexScreenerTokens, geckoTerminalTokens] = await Promise.allSettled([
        this.dexScreenerService.searchTokens(query.trim()),
        this.geckoTerminalService.searchTokens(query.trim()),
      ]);

      let allTokens: Token[] = [];

      if (dexScreenerTokens.status === 'fulfilled') {
        allTokens.push(...dexScreenerTokens.value);
      } else {
        logger.warn('DexScreener search failed', { error: dexScreenerTokens.reason });
      }

      if (geckoTerminalTokens.status === 'fulfilled') {
        allTokens.push(...geckoTerminalTokens.value);
      } else {
        logger.warn('GeckoTerminal search failed', { error: geckoTerminalTokens.reason });
      }

      allTokens = this.mergeAndDeduplicateTokens(allTokens);
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
      logger.info('Fetching trending tokens', { limit });

      const [dexScreenerTokens, geckoTokens] = await Promise.allSettled([
        this.dexScreenerService.getTrendingTokens(),
        this.geckoTerminalService.getTrendingTokens(limit),
      ]);

      let allTokens: Token[] = [];

      if (dexScreenerTokens.status === 'fulfilled') {
        allTokens.push(...dexScreenerTokens.value);
      }

      if (geckoTokens.status === 'fulfilled') {
        allTokens.push(...geckoTokens.value);
      }

      allTokens = this.mergeAndDeduplicateTokens(allTokens);
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
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      logger.debug('Returning cached token data');
      return cached.data;
    }

    logger.debug('Fetching fresh token data');
    const freshTokens = await this.fetchTokensFromAllSources();
    
    this.cache.set(cacheKey, {
      data: freshTokens,
      timestamp: Date.now(),
    });

    return freshTokens;
  }

  private async fetchTokensFromAllSources(): Promise<Token[]> {
    const [dexScreenerTokens, geckoTokens] = await Promise.allSettled([
      this.dexScreenerService.getTrendingTokens(),
      this.geckoTerminalService.getTrendingTokens(100),
    ]);

    let allTokens: Token[] = [];

    if (dexScreenerTokens.status === 'fulfilled') {
      allTokens.push(...dexScreenerTokens.value);
      logger.info('Successfully fetched tokens from DexScreener', { 
        count: dexScreenerTokens.value.length 
      });
    } else {
      logger.warn('Failed to fetch from DexScreener', { 
        error: dexScreenerTokens.reason 
      });
    }

    if (geckoTokens.status === 'fulfilled') {
      allTokens.push(...geckoTokens.value);
      logger.info('Successfully fetched tokens from GeckoTerminal', { 
        count: geckoTokens.value.length 
      });
    } else {
      logger.warn('Failed to fetch from GeckoTerminal', { 
        error: geckoTokens.reason 
      });
    }

    allTokens = this.mergeAndDeduplicateTokens(allTokens);

    try {
      allTokens = await this.jupiterService.enrichTokensWithPrices(allTokens);
    } catch (error) {
      logger.warn('Failed to enrich tokens with Jupiter prices', { error });
    }

    logger.info('Successfully aggregated tokens from all sources', { 
      totalTokens: allTokens.length 
    });

    return allTokens;
  }

  private mergeAndDeduplicateTokens(tokens: Token[]): Token[] {
    const tokenMap = new Map<string, Token>();
    
    // Count tokens by source for debugging
    const sourceCount = tokens.reduce((acc, token) => {
      acc[token.source] = (acc[token.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    logger.info('Token sources before deduplication', sourceCount);

    tokens.forEach(token => {
      const existing = tokenMap.get(token.token_address);
      
      if (!existing) {
        tokenMap.set(token.token_address, token);
      } else {
        logger.debug('Merging duplicate token', { 
          address: token.token_address,
          existingSource: existing.source,
          newSource: token.source 
        });
        const merged = this.mergeTokenData(existing, token);
        tokenMap.set(token.token_address, merged);
      }
    });

    const finalTokens = Array.from(tokenMap.values());
    const finalSourceCount = finalTokens.reduce((acc, token) => {
      acc[token.source] = (acc[token.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    logger.info('Token sources after deduplication', finalSourceCount);

    return finalTokens;
  }

  private mergeTokenData(token1: Token, token2: Token): Token {
    // Prefer DexScreener as primary source for most data, but keep original source info
    const preferredSource = token1.source === 'dexscreener' ? token1 : 
                           token2.source === 'dexscreener' ? token2 : token1;
    const otherSource = preferredSource === token1 ? token2 : token1;

    return {
      ...preferredSource,
      // Take the best available data from either source
      price_usd: otherSource.price_usd ?? preferredSource.price_usd,
      market_cap_usd: otherSource.market_cap_usd ?? preferredSource.market_cap_usd,
      volume_usd: otherSource.volume_usd ?? preferredSource.volume_usd,
      liquidity_usd: otherSource.liquidity_usd ?? preferredSource.liquidity_usd,
      transaction_count: otherSource.transaction_count || preferredSource.transaction_count,
      price_1hr_change: otherSource.price_1hr_change || preferredSource.price_1hr_change,
      price_24hr_change: otherSource.price_24hr_change || preferredSource.price_24hr_change,
      price_7d_change: otherSource.price_7d_change || preferredSource.price_7d_change,
      updated_at: Math.max(preferredSource.updated_at, otherSource.updated_at),
      // Keep the preferred source's identity
      source: preferredSource.source,
    };
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

  clearCache(): void {
    this.cache.clear();
    logger.info('Token cache cleared');
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}
