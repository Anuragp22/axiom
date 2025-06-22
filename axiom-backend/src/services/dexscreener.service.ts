import { HttpClient } from '@/utils/http-client';
import { DexScreenerResponse, DexScreenerToken, Token } from '@/types/token';
import config from '@/config';
import logger from '@/utils/logger';
import { ExternalApiError } from '@/utils/errors';

export class DexScreenerService {
  private httpClient: HttpClient;
  private solanaTokenAddresses: string[] = [
    'So11111111111111111111111111111111111111112', // SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  ];

  constructor() {
    this.httpClient = new HttpClient(config.apis.dexScreener);
  }

  /**
   * Search for token pairs by query
   */
  async searchTokens(query: string): Promise<Token[]> {
    try {
      logger.info('Searching tokens on DexScreener', { query });
      
      const response = await this.httpClient.get<DexScreenerResponse>(
        `/latest/dex/search?q=${encodeURIComponent(query)}`
      );

      return this.transformTokens(response.pairs);
    } catch (error) {
      logger.error('Failed to search tokens on DexScreener', { query, error });
      throw new ExternalApiError('DexScreener', `Search failed: ${error}`);
    }
  }

  /**
   * Get token pairs by token address
   */
  async getTokenPairs(tokenAddress: string): Promise<Token[]> {
    try {
      logger.info('Fetching token pairs from DexScreener', { tokenAddress });
      
      const response = await this.httpClient.get<DexScreenerToken[]>(
        `/latest/dex/tokens/solana/${tokenAddress}`
      );

      return this.transformTokens(response);
    } catch (error) {
      logger.error('Failed to fetch token pairs from DexScreener', { tokenAddress, error });
      throw new ExternalApiError('DexScreener', `Token pairs fetch failed: ${error}`);
    }
  }

  /**
   * Get multiple token pairs by addresses
   */
  async getMultipleTokens(tokenAddresses: string[]): Promise<Token[]> {
    try {
      // DexScreener allows up to 30 addresses per request
      const batches = this.chunkArray(tokenAddresses, 30);
      const allTokens: Token[] = [];

      for (const batch of batches) {
        const addressesParam = batch.join(',');
        logger.info('Fetching multiple tokens from DexScreener', { 
          addresses: addressesParam,
          count: batch.length 
        });

        const response = await this.httpClient.get<DexScreenerToken[]>(
          `/latest/dex/tokens/solana/${addressesParam}`
        );

        const tokens = this.transformTokens(response);
        allTokens.push(...tokens);
      }

      return allTokens;
    } catch (error) {
      logger.error('Failed to fetch multiple tokens from DexScreener', { 
        tokenAddresses, 
        error 
      });
      throw new ExternalApiError('DexScreener', `Multiple tokens fetch failed: ${error}`);
    }
  }

  /**
   * Get trending tokens (latest boosted tokens)
   */
  async getTrendingTokens(): Promise<Token[]> {
    try {
      logger.info('Fetching trending tokens from DexScreener');
      
      // Use search with popular Solana tokens to get trending data
      const trendingQueries = ['SOL', 'USDC', 'meme', 'pump'];
      const allTokens: Token[] = [];

      for (const query of trendingQueries) {
        try {
          const tokens = await this.searchTokens(query);
          allTokens.push(...tokens);
        } catch (error) {
          logger.warn('Failed to fetch trending tokens for query', { query, error });
        }
      }

      // Remove duplicates and sort by volume
      const uniqueTokens = this.removeDuplicates(allTokens);
      return uniqueTokens
        .sort((a, b) => b.volume_sol - a.volume_sol)
        .slice(0, 50); // Return top 50
    } catch (error) {
      logger.error('Failed to fetch trending tokens from DexScreener', { error });
      throw new ExternalApiError('DexScreener', `Trending tokens fetch failed: ${error}`);
    }
  }

  /**
   * Transform DexScreener API response to our Token format
   */
  private transformTokens(pairs: DexScreenerToken[]): Token[] {
    return pairs
      .filter(pair => pair.chainId === 'solana') // Only Solana pairs
      .map(pair => this.transformSingleToken(pair))
      .filter(token => token !== null) as Token[];
  }

  private transformSingleToken(pair: DexScreenerToken): Token | null {
    try {
      // Determine which token is the meme coin (not SOL/USDC)
      const isBaseTokenMeme = !this.solanaTokenAddresses.includes(pair.baseToken.address);
      const token = isBaseTokenMeme ? pair.baseToken : pair.quoteToken;
      const priceInSol = isBaseTokenMeme ? 
        parseFloat(pair.priceNative) : 
        1 / parseFloat(pair.priceNative);

      // Calculate transaction count
      const transactionCount = Object.values(pair.txns).reduce(
        (total, txn) => total + txn.buys + txn.sells, 
        0
      );

      // Get volume and price changes
      const volume24h = pair.volume?.h24 || 0;
      const priceChange1h = pair.priceChange?.h1 || 0;
      const priceChange24h = pair.priceChange?.h24 || 0;

      return {
        token_address: token.address,
        token_name: token.name,
        token_ticker: token.symbol,
        price_sol: priceInSol,
        price_usd: parseFloat(pair.priceUsd) || 0,
        market_cap_sol: pair.marketCap ? pair.marketCap / parseFloat(pair.priceUsd || '1') : 0,
        market_cap_usd: pair.marketCap,
        volume_sol: volume24h / (parseFloat(pair.priceUsd) || 1), // Convert USD volume to SOL
        volume_usd: volume24h,
        liquidity_sol: pair.liquidity?.base || 0,
        liquidity_usd: pair.liquidity?.usd || 0,
        transaction_count: transactionCount,
        price_1hr_change: priceChange1h,
        price_24hr_change: priceChange24h,
        protocol: pair.dexId,
        dex_id: pair.dexId,
        pair_address: pair.pairAddress,
        created_at: pair.pairCreatedAt,
        updated_at: Date.now(),
        source: 'dexscreener' as const,
      };
    } catch (error) {
      logger.warn('Failed to transform DexScreener token', { 
        pairAddress: pair.pairAddress,
        error 
      });
      return null;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private removeDuplicates(tokens: Token[]): Token[] {
    const seen = new Set<string>();
    return tokens.filter(token => {
      if (seen.has(token.token_address)) {
        return false;
      }
      seen.add(token.token_address);
      return true;
    });
  }
} 