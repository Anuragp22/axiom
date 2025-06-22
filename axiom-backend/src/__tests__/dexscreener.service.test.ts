import { DexScreenerService } from '../services/dexscreener.service';
import { HttpClient } from '../utils/http-client';
import { Token } from '../types/token';
import { describe, beforeEach, it } from 'node:test';

// Mock the HttpClient
jest.mock('../utils/http-client');
const MockedHttpClient = HttpClient as jest.MockedClass<typeof HttpClient>;

describe('DexScreenerService', () => {
  let service: DexScreenerService;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;
    
    MockedHttpClient.mockImplementation(() => mockHttpClient);
    service = new DexScreenerService();
  });

  describe('searchTokens', () => {
    it('should return formatted tokens for valid search query', async () => {
      const mockResponse = {
        pairs: [
          {
            chainId: 'solana',
            dexId: 'raydium',
            pairAddress: 'test-pair-address',
            baseToken: {
              address: 'test-token-address',
              name: 'Test Token',
              symbol: 'TEST'
            },
            quoteToken: {
              address: 'So11111111111111111111111111111111111111112',
              name: 'Solana',
              symbol: 'SOL'
            },
            priceNative: '0.001',
            priceUsd: '0.128',
            txns: {
              h24: { buys: 100, sells: 50 }
            },
            volume: {
              h24: 1000
            },
            priceChange: {
              h1: 5.5,
              h24: -2.3
            },
            liquidity: {
              usd: 50000,
              base: 1000,
              quote: 500
            },
            marketCap: 128000,
            pairCreatedAt: 1640995200000
          }
        ]
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.searchTokens('test');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        token_address: 'test-token-address',
        token_name: 'Test Token',
        token_ticker: 'TEST',
        price_1hr_change: 5.5,
        price_24hr_change: -2.3,
        source: 'dexscreener'
      });
    });

    it('should filter out non-Solana pairs', async () => {
      const mockResponse = {
        pairs: [
          {
            chainId: 'ethereum',
            dexId: 'uniswap',
            baseToken: { address: 'eth-token', name: 'ETH Token', symbol: 'ETH' },
            quoteToken: { address: 'usdc-token', name: 'USDC', symbol: 'USDC' }
          }
        ]
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.searchTokens('test');

      expect(result).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('API Error'));

      await expect(service.searchTokens('test')).rejects.toThrow('DexScreener');
    });

    it('should handle empty search results', async () => {
      const mockResponse = { pairs: [] };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.searchTokens('nonexistent');

      expect(result).toHaveLength(0);
    });
  });

  describe('getTokenPairs', () => {
    it('should fetch token pairs by address', async () => {
      const mockResponse = [
        {
          chainId: 'solana',
          dexId: 'raydium',
          pairAddress: 'test-pair',
          baseToken: {
            address: 'test-token-address',
            name: 'Test Token',
            symbol: 'TEST'
          },
          quoteToken: {
            address: 'So11111111111111111111111111111111111111112',
            name: 'Solana',
            symbol: 'SOL'
          },
          priceNative: '0.001',
          priceUsd: '0.128',
          txns: { h24: { buys: 50, sells: 25 } },
          volume: { h24: 500 },
          priceChange: { h1: 2.5, h24: -1.2 },
          liquidity: { usd: 25000, base: 500, quote: 250 },
          marketCap: 64000,
          pairCreatedAt: 1640995200000
        }
      ];

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await service.getTokenPairs('test-token-address');

      expect(result).toHaveLength(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/latest/dex/tokens/solana/test-token-address');
    });
  });

  describe('getMultipleTokens', () => {
    it('should handle batching for large token lists', async () => {
      const tokenAddresses = Array.from({ length: 35 }, (_, i) => `token-${i}`);
      
      mockHttpClient.get.mockResolvedValue([]);

      await service.getMultipleTokens(tokenAddresses);

      // Should make 2 requests for 35 tokens (30 + 5)
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('should combine results from multiple batches', async () => {
      const tokenAddresses = ['token1', 'token2'];
      const mockBatch1 = [
        {
          chainId: 'solana',
          dexId: 'raydium',
          pairAddress: 'pair1',
          baseToken: { address: 'token1', name: 'Token 1', symbol: 'TK1' },
          quoteToken: { address: 'So11111111111111111111111111111111111111112', name: 'Solana', symbol: 'SOL' },
          priceNative: '0.001',
          priceUsd: '0.128',
          txns: { h24: { buys: 10, sells: 5 } },
          volume: { h24: 100 },
          priceChange: { h1: 1, h24: -1 },
          liquidity: { usd: 1000, base: 10, quote: 5 },
          marketCap: 1280,
          pairCreatedAt: 1640995200000
        }
      ];

      mockHttpClient.get.mockResolvedValue(mockBatch1);

      const result = await service.getMultipleTokens(tokenAddresses);

      expect(result).toHaveLength(1);
    });
  });

  describe('getTrendingTokens', () => {
    it('should fetch and deduplicate trending tokens', async () => {
      const mockSearchResponse = {
        pairs: [
          {
            chainId: 'solana',
            dexId: 'raydium',
            pairAddress: 'trending-pair',
            baseToken: { address: 'trending-token', name: 'Trending Token', symbol: 'TREND' },
            quoteToken: { address: 'So11111111111111111111111111111111111111112', name: 'Solana', symbol: 'SOL' },
            priceNative: '0.01',
            priceUsd: '1.28',
            txns: { h24: { buys: 1000, sells: 500 } },
            volume: { h24: 10000 },
            priceChange: { h1: 10, h24: 25 },
            liquidity: { usd: 100000, base: 1000, quote: 500 },
            marketCap: 128000,
            pairCreatedAt: 1640995200000
          }
        ]
      };

      mockHttpClient.get.mockResolvedValue(mockSearchResponse);

      const result = await service.getTrendingTokens();

      expect(result.length).toBeGreaterThan(0);
      if (result.length > 0) {
        expect(result[0]?.source).toBe('dexscreener');
      }
    });

    it('should handle partial failures in trending queries', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ pairs: [] }) // SOL query succeeds but empty
        .mockRejectedValueOnce(new Error('API Error')) // USDC query fails
        .mockResolvedValueOnce({ pairs: [] }) // meme query succeeds but empty
        .mockResolvedValueOnce({ pairs: [] }); // pump query succeeds but empty

      const result = await service.getTrendingTokens();

      expect(result).toHaveLength(0);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(4);
    });
  });
}); 