import { TokenAggregationService } from '../services/token-aggregation.service';
import { DexScreenerService } from '../services/dexscreener.service';
import { JupiterService } from '../services/jupiter.service';
import { RedisCacheService } from '../services/redis-cache.service';
import { Token } from '../types/token';

// Mock all dependencies
jest.mock('../services/dexscreener.service');
jest.mock('../services/jupiter.service');
jest.mock('../services/redis-cache.service');

const MockedDexScreenerService = DexScreenerService as jest.MockedClass<typeof DexScreenerService>;
const MockedJupiterService = JupiterService as jest.MockedClass<typeof JupiterService>;
const MockedRedisCacheService = RedisCacheService as jest.MockedClass<typeof RedisCacheService>;

describe('TokenAggregationService', () => {
  let service: TokenAggregationService;
  let mockDexScreener: jest.Mocked<DexScreenerService>;
  let mockJupiter: jest.Mocked<JupiterService>;
  let mockRedisCache: jest.Mocked<RedisCacheService>;

  const mockToken: Token = {
    token_address: 'test-address',
    token_name: 'Test Token',
    token_ticker: 'TEST',
    price_sol: 0.001,
    price_usd: 0.128,
    market_cap_sol: 1000,
    market_cap_usd: 128000,
    volume_sol: 100,
    volume_usd: 12800,
    liquidity_sol: 50,
    liquidity_usd: 6400,
    transaction_count: 100,
    price_1hr_change: 5.5,
    price_24hr_change: -2.3,
    protocol: 'raydium',
    dex_id: 'raydium',
    pair_address: 'test-pair',
    created_at: Date.now(),
    updated_at: Date.now(),
    source: 'dexscreener'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDexScreener = {
      searchTokens: jest.fn(),
      getTokenPairs: jest.fn(),
      getMultipleTokens: jest.fn(),
      getTrendingTokens: jest.fn(),
      getFeaturedTokens: jest.fn()
    } as any;

    mockJupiter = {
      enrichTokensWithPrices: jest.fn(),
      getTokenPrice: jest.fn(),
      getMultipleTokenPrices: jest.fn()
    } as any;

    mockRedisCache = {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn()
    } as any;

    MockedDexScreenerService.mockImplementation(() => mockDexScreener);
    MockedJupiterService.mockImplementation(() => mockJupiter);
    MockedRedisCacheService.mockImplementation(() => mockRedisCache);

    service = new TokenAggregationService();
  });

  describe('getTrendingTokens', () => {
    it('should fetch tokens from DexScreener as primary source', async () => {
      const mockTokens = [mockToken];
      const enrichedTokens = [{ ...mockToken, price_usd: 0.256 }];

      mockDexScreener.getTrendingTokens.mockResolvedValue(mockTokens);
      mockJupiter.enrichTokensWithPrices.mockResolvedValue(enrichedTokens);

      const result = await service.getTrendingTokens(10);

      expect(mockDexScreener.getTrendingTokens).toHaveBeenCalled();
      expect(mockJupiter.enrichTokensWithPrices).toHaveBeenCalledWith(mockTokens);
      expect(result).toEqual(enrichedTokens);
    });

    it('should handle DexScreener errors', async () => {
      mockDexScreener.getTrendingTokens.mockRejectedValue(new Error('DexScreener error'));

      await expect(service.getTrendingTokens(10)).rejects.toThrow('DexScreener error');
    });

    it('should sort tokens by volume and limit results', async () => {
      const mockTokens = [
        { ...mockToken, token_address: 'token1', volume_usd: 1000 },
        { ...mockToken, token_address: 'token2', volume_usd: 2000 },
        { ...mockToken, token_address: 'token3', volume_usd: 500 }
      ];
      mockDexScreener.getTrendingTokens.mockResolvedValue(mockTokens);
      mockJupiter.enrichTokensWithPrices.mockResolvedValue(mockTokens);

      const result = await service.getTrendingTokens(2);

      expect(result).toHaveLength(2);
      expect(result[0]?.token_address).toBe('token2'); // Highest volume first
      expect(result[1]?.token_address).toBe('token1');
    });
  });

  describe('getFeaturedTokens', () => {
    it('should fetch featured tokens from DexScreener', async () => {
      const mockTokens = [{ ...mockToken, source: 'dexscreener' as const }];
      const enrichedTokens = [{ ...mockToken, price_usd: 0.256 }];

      mockDexScreener.getFeaturedTokens.mockResolvedValue(mockTokens);
      mockJupiter.enrichTokensWithPrices.mockResolvedValue(enrichedTokens);

      const result = await service.getFeaturedTokens();

      expect(mockDexScreener.getFeaturedTokens).toHaveBeenCalled();
      expect(mockJupiter.enrichTokensWithPrices).toHaveBeenCalledWith(mockTokens);
      expect(result).toEqual(enrichedTokens);
    });

    it('should handle errors in featured tokens fetch', async () => {
      mockDexScreener.getFeaturedTokens.mockRejectedValue(new Error('Featured tokens error'));

      await expect(service.getFeaturedTokens()).rejects.toThrow('Featured tokens error');
    });
  });

  describe('getTokens', () => {
    it('should return cached tokens when available', async () => {
      const cachedTokens = [mockToken];
      mockRedisCache.get.mockResolvedValue(cachedTokens);

      const result = await service.getTokens();

      expect(mockRedisCache.get).toHaveBeenCalledWith('all_tokens');
      expect(result.tokens).toEqual(cachedTokens);
      expect(mockDexScreener.getTrendingTokens).not.toHaveBeenCalled();
    });

    it('should fetch fresh tokens when cache miss', async () => {
      const freshTokens = [mockToken];
      mockRedisCache.get.mockResolvedValue(null);
      mockDexScreener.getTrendingTokens.mockResolvedValue(freshTokens);
      mockJupiter.enrichTokensWithPrices.mockResolvedValue(freshTokens);

      const result = await service.getTokens();

      expect(mockRedisCache.get).toHaveBeenCalledWith('all_tokens');
      expect(mockDexScreener.getTrendingTokens).toHaveBeenCalled();
      expect(mockRedisCache.set).toHaveBeenCalledWith('all_tokens', freshTokens, expect.any(Number));
      expect(result.tokens).toEqual(freshTokens);
    });

    it('should apply filters correctly', async () => {
      const tokens = [
        { ...mockToken, token_address: 'token1', volume_usd: 1000, market_cap_usd: 50000 },
        { ...mockToken, token_address: 'token2', volume_usd: 2000, market_cap_usd: 100000 },
        { ...mockToken, token_address: 'token3', volume_usd: 500, market_cap_usd: 25000 }
      ];
      mockRedisCache.get.mockResolvedValue(tokens);

      const result = await service.getTokens({
        min_volume: 750,
        min_market_cap: 40000
      });

      expect(result.tokens).toHaveLength(2);
      expect(result.tokens.map(t => t.token_address)).toEqual(['token1', 'token2']);
    });

    it('should apply sorting correctly', async () => {
      const tokens = [
        { ...mockToken, token_address: 'token1', market_cap_usd: 50000 },
        { ...mockToken, token_address: 'token2', market_cap_usd: 100000 },
        { ...mockToken, token_address: 'token3', market_cap_usd: 25000 }
      ];
      mockRedisCache.get.mockResolvedValue(tokens);

      const result = await service.getTokens(undefined, {
        field: 'market_cap',
        direction: 'asc'
      });

      expect(result.tokens.map(t => t.token_address)).toEqual(['token3', 'token1', 'token2']);
    });

    it('should apply pagination correctly', async () => {
      const tokens = Array.from({ length: 50 }, (_, i) => ({
        ...mockToken,
        token_address: `token${i}`
      }));
      mockRedisCache.get.mockResolvedValue(tokens);

      const result = await service.getTokens(undefined, undefined, {
        limit: 10
      });

      expect(result.tokens).toHaveLength(10);
      expect(result.pagination.has_more).toBe(true);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.next_cursor).toBeDefined();
    });
  });

  describe('searchTokens', () => {
    it('should search tokens using DexScreener', async () => {
      const searchResults = [mockToken];
      mockDexScreener.searchTokens.mockResolvedValue(searchResults);

      const result = await service.searchTokens('test query');

      expect(mockDexScreener.searchTokens).toHaveBeenCalledWith('test query');
      expect(result.tokens).toEqual(searchResults);
    });

    it('should handle search errors', async () => {
      mockDexScreener.searchTokens.mockRejectedValue(new Error('Search error'));

      await expect(service.searchTokens('test')).rejects.toThrow('Search error');
    });
  });

  describe('clearCache', () => {
    it('should clear Redis cache', async () => {
      await service.clearCache();

      expect(mockRedisCache.clear).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        connected: true,
        memory: '1MB',
        keys: 5,
        info: {}
      };
      mockRedisCache.getStats.mockResolvedValue(mockStats);

      const result = await service.getCacheStats();

      expect(mockRedisCache.getStats).toHaveBeenCalled();
      expect(result.connected).toBe(true);
      expect(result.memory).toBe('1MB');
      expect(result.keys).toBe(5);
    });
  });
}); 