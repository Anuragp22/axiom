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

  // Known popular token addresses for batch fetching
  private popularTokenAddresses: string[] = [
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF  
    'A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump', // POPCAT
    '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4', // JTO
    'HezGWsxCCpBfbHwKNbKHzGWoRGUkg7KkqGWnhFyq3V3y', // LAUNCHCOIN
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // BONK (alternative)
    'Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump', // CHILLGUY
    'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump'  // Fartcoin
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
        `/latest/dex/search/?q=${encodeURIComponent(query)}`
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
        `/latest/dex/tokens/${tokenAddress}`
      );

      return this.transformTokens(response);
    } catch (error) {
      logger.error('Failed to fetch token pairs from DexScreener', { tokenAddress, error });
      throw new ExternalApiError('DexScreener', `Token pairs fetch failed: ${error}`);
    }
  }

  /**
   * Get multiple token pairs by addresses using batch API
   */
  async getMultipleTokens(tokenAddresses: string[]): Promise<Token[]> {
    try {
      // DexScreener allows up to 30 addresses per request
      const batches = this.chunkArray(tokenAddresses, 30);
      const allTokens: Token[] = [];

      // Process batches in parallel for maximum speed
      const batchPromises = batches.map(async (batch) => {
        const addressesParam = batch.join(',');
        logger.info('Fetching batch of tokens from DexScreener', { 
          count: batch.length,
          addresses: addressesParam.substring(0, 100) + '...' // Log truncated addresses
        });

        try {
          // Use the correct DexScreener batch endpoint
          const response = await this.httpClient.get<DexScreenerToken[]>(
            `/latest/dex/tokens/${addressesParam}`
          );

          logger.debug('Batch API response received', {
            responseLength: response?.length || 0,
            hasData: !!response
          });

          return this.transformTokens(response || []);
        } catch (error) {
          logger.warn('Failed to fetch batch of tokens', { 
            batchSize: batch.length,
            endpoint: `/latest/dex/tokens/${addressesParam}`,
            error: error instanceof Error ? error.message : error
          });
          return [];
        }
      });

      // Execute all batches in parallel
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect successful results
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          allTokens.push(...result.value);
        }
      });

      logger.info('Successfully fetched multiple tokens from DexScreener', {
        totalTokens: allTokens.length,
        requestedAddresses: tokenAddresses.length
      });

      return this.removeDuplicates(allTokens);
    } catch (error) {
      logger.error('Failed to fetch multiple tokens from DexScreener', { 
        tokenAddresses: tokenAddresses.length, 
        error 
      });
      throw new ExternalApiError('DexScreener', `Multiple tokens fetch failed: ${error}`);
    }
  }

  /**
   * Get trending tokens using parallel search for reliable results
   */
  async getTrendingTokens(): Promise<Token[]> {
    try {
      logger.info('Fetching trending tokens from DexScreener using parallel search');
      
      // Use parallel search for popular tokens (more reliable than batch API)
      const popularTokens = [
        'BONK', 'WIF', 'POPCAT', 'JTO', 'PYTH', 'JUP', 
        'ORCA', 'RAY', 'SAMO', 'FIDA', 'SRM', 'COPE',
        'MNGO', 'STEP', 'MEDIA', 'ROPE'
      ];
      
      logger.info('Starting parallel search for trending tokens', { 
        tokenCount: popularTokens.length 
      });
      
      const searchPromises = popularTokens.map(async (tokenName) => {
        try {
          const searchResults = await this.searchTokens(tokenName);
          // Return the best result (highest volume)
          if (searchResults.length > 0) {
            return searchResults.sort((a, b) => (b.volume_usd || 0) - (a.volume_usd || 0))[0];
          }
          return null;
        } catch (error) {
          logger.warn(`Failed to search for ${tokenName}`, { error });
          return null;
        }
      });

      // Execute all searches in parallel (much faster than sequential)
      const searchResults = await Promise.allSettled(searchPromises);
      const validTokens = searchResults
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => (result as PromiseFulfilledResult<Token>).value);

      // Remove duplicates and sort by volume
      const uniqueTokens = this.removeDuplicates(validTokens);
      
      logger.info('Successfully fetched trending tokens via parallel search', { 
        searchedTokens: popularTokens.length,
        foundTokens: uniqueTokens.length 
      });

      return uniqueTokens
        .sort((a, b) => (b.volume_usd || 0) - (a.volume_usd || 0))
        .slice(0, 50);
    } catch (error) {
      logger.error('Failed to fetch trending tokens', { error });
      throw new ExternalApiError('DexScreener', `Trending tokens fetch failed: ${error}`);
    }
  }

  /**
   * Get featured tokens using batch API calls
   */
  async getFeaturedTokens(): Promise<Token[]> {
    try {
      logger.info('Fetching featured tokens from DexScreener using batch API');
      
      // Use first few addresses from popular tokens for featured
      const featuredAddresses = this.popularTokenAddresses.slice(0, 4); // BONK, WIF, POPCAT, JTO
      
      const featuredTokens = await this.getMultipleTokens(featuredAddresses);
      
      return featuredTokens.sort((a, b) => (b.market_cap_usd || 0) - (a.market_cap_usd || 0));
    } catch (error) {
      logger.error('Failed to fetch featured tokens from DexScreener', { error });
      throw new ExternalApiError('DexScreener', `Featured tokens fetch failed: ${error}`);
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

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 