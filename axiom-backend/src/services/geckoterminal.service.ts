import { HttpClient } from '@/utils/http-client';
import { 
  Token, 
  GeckoTerminalTokenResponse, 
  GeckoTerminalPoolResponse,
  GeckoTerminalToken,
  GeckoTerminalPool 
} from '@/types/token';
import config from '@/config';
import logger from '@/utils/logger';
import { ExternalApiError } from '@/utils/errors';

export class GeckoTerminalService {
  private httpClient: HttpClient;
  
  // Famous tokens with their contract addresses on Solana (reduced to avoid rate limits)
  private famousTokens: Array<{ address: string; symbol: string; name: string }> = [
    // Major cryptocurrencies on Solana
    { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana' },
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin' },
    { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', name: 'Bonk' }
  ];

  constructor() {
    this.httpClient = new HttpClient(config.apis.geckoTerminal);
  }

  /**
   * Get famous tokens with their current data using multi-token endpoint
   */
  async getFamousTokens(): Promise<Token[]> {
    try {
      logger.info('Fetching famous tokens from GeckoTerminal using multi-token endpoint');
      
      // Use the multi-token endpoint to get all tokens in one call
      const addresses = this.famousTokens.map(token => token.address).join(',');
      
      const response = await this.httpClient.get<GeckoTerminalTokenResponse>(
        `/networks/solana/tokens/multi/${addresses}`,
        {
          headers: {
            'Accept': `application/json;version=${config.apis.geckoTerminal.version}`
          }
        }
      );

      if (!response.data || response.data.length === 0) {
        logger.warn('No token data returned from multi-token endpoint');
        return [];
      }

      const tokens: Token[] = [];

      // Transform each token
      for (const tokenData of response.data) {
        try {
          const token = this.transformTokenFromDirect(tokenData);
          if (token) {
            tokens.push(token);
          }
        } catch (error) {
          logger.warn(`Failed to transform token data`, { 
            address: tokenData.attributes.address, 
            error: error instanceof Error ? error.message : error
          });
        }
      }

      logger.info('Successfully fetched famous tokens from GeckoTerminal', { 
        requested: this.famousTokens.length,
        received: tokens.length 
      });

      return tokens.sort((a, b) => (b.market_cap_usd || 0) - (a.market_cap_usd || 0));
    } catch (error) {
      logger.error('Failed to fetch famous tokens from GeckoTerminal', { error });
      // Return empty array instead of throwing to not break the whole aggregation
      return [];
    }
  }

  /**
   * Get token data from GeckoTerminal
   */
  async getTokenData(tokenAddress: string): Promise<Token | null> {
    try {
      logger.info('Fetching token data from GeckoTerminal', { tokenAddress });

      // Get token pools on Solana network - add headers for versioning
      const response = await this.httpClient.get<GeckoTerminalPoolResponse>(
        `/networks/solana/tokens/${tokenAddress}/pools`,
        {
          headers: {
            'Accept': `application/json;version=${config.apis.geckoTerminal.version}`
          }
        }
      );

      if (!response.data || response.data.length === 0) {
        logger.warn('No pools found for token', { tokenAddress });
        return null;
      }

      // Find the pool with highest liquidity
      const bestPool = response.data.reduce((prev, current) => {
        const prevLiquidity = parseFloat(prev.attributes.reserve_in_usd || '0');
        const currentLiquidity = parseFloat(current.attributes.reserve_in_usd || '0');
        return currentLiquidity > prevLiquidity ? current : prev;
      });

      // Try to get token info from included data first
      let tokenInfo: GeckoTerminalToken | undefined;
      
      if (response.included) {
        tokenInfo = response.included.find(item => 
          item.type === 'token' && 
          (item as GeckoTerminalToken).attributes.address === tokenAddress
        ) as GeckoTerminalToken | undefined;
      }

      if (!tokenInfo) {
        // Fallback: get token info directly
        const tokenResponse = await this.httpClient.get<GeckoTerminalTokenResponse>(
          `/networks/solana/tokens/${tokenAddress}`,
          {
            headers: {
              'Accept': `application/json;version=${config.apis.geckoTerminal.version}`
            }
          }
        );
        
        if (tokenResponse.data && tokenResponse.data.length > 0) {
          tokenInfo = tokenResponse.data[0];
        }
      }

      if (!tokenInfo) {
        logger.warn('Token info not found', { tokenAddress });
        return null;
      }

      return this.transformToken(bestPool, tokenInfo);
    } catch (error) {
      logger.error('Failed to fetch token data from GeckoTerminal', { 
        tokenAddress, 
        error: error instanceof Error ? error.message : error 
      });
      throw new ExternalApiError('GeckoTerminal', `Token data fetch failed: ${error}`);
    }
  }

  /**
   * Get trending pools across all networks (simplified to avoid rate limits)
   */
  async getTrendingPools(): Promise<Token[]> {
    try {
      logger.info('Skipping trending pools from GeckoTerminal due to rate limits');
      // Return famous tokens instead to avoid additional API calls
      return this.getFamousTokens();
    } catch (error) {
      logger.error('Failed to fetch trending pools from GeckoTerminal', { error });
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Find token in included data
   */
  private findTokenInIncluded(
    included: Array<GeckoTerminalToken | GeckoTerminalPool> | undefined,
    tokenAddress: string
  ): GeckoTerminalToken | null {
    if (!included) return null;

    const token = included.find(item => 
      item.type === 'token' && 
      (item as GeckoTerminalToken).attributes.address === tokenAddress
    ) as GeckoTerminalToken | undefined;

          return token ?? null;
  }

  /**
   * Transform token data from direct token endpoint
   */
  private transformTokenFromDirect(tokenData: GeckoTerminalToken): Token | null {
    try {
      const attr = tokenData.attributes;

      // Use available data from token attributes
      const priceUsd = parseFloat(attr.price_usd || '0');
      const marketCapUsd = parseFloat(attr.market_cap_usd || '0');
      const volumeUsd = parseFloat(attr.volume_usd?.h24 || '0');
      const priceChange1h = parseFloat(attr.price_change_percentage?.h1 || '0');
      const priceChange24h = parseFloat(attr.price_change_percentage?.h24 || '0');

      // Calculate SOL equivalents (approximate)
      const solPrice = 150; // Approximate SOL price
      const volumeSol = volumeUsd / solPrice;
      const marketCapSol = marketCapUsd / solPrice;
      const priceSol = priceUsd / solPrice;

      return {
        token_address: attr.address,
        token_name: attr.name,
        token_ticker: attr.symbol,
        price_sol: priceSol,
        price_usd: priceUsd,
        market_cap_sol: marketCapSol,
        market_cap_usd: marketCapUsd,
        volume_sol: volumeSol,
        volume_usd: volumeUsd,
        liquidity_sol: 0, // Not available from direct endpoint
        liquidity_usd: 0, // Not available from direct endpoint
        transaction_count: 0, // Not available from direct endpoint
        price_1hr_change: priceChange1h,
        price_24hr_change: priceChange24h,
        price_7d_change: 0, // Not available
        protocol: 'GeckoTerminal',
        dex_id: 'geckoterminal',
        pair_address: '', // Not available from direct endpoint
        created_at: Date.now() / 1000,
        updated_at: Date.now() / 1000,
        source: 'geckoterminal' as const,
      };
    } catch (error) {
      logger.error('Failed to transform token from direct endpoint', { 
        tokenAddress: tokenData.attributes.address, 
        error 
      });
      return null;
    }
  }

  /**
   * Transform GeckoTerminal data to our Token format
   */
  private transformToken(pool: GeckoTerminalPool, tokenInfo: GeckoTerminalToken): Token | null {
    try {
      const attr = pool.attributes;
      const tokenAttr = tokenInfo.attributes;

      // Calculate transaction count
      const transactionCount = (attr.transactions.h24.buys || 0) + (attr.transactions.h24.sells || 0);

      // Calculate price in SOL (assuming base currency is SOL)
      const priceSol = parseFloat(attr.base_token_price_native_currency || '0');
      const priceUsd = parseFloat(tokenAttr.price_usd || attr.base_token_price_usd || '0');

      // Get volume and market cap
      const volumeUsd = parseFloat(attr.volume_usd.h24 || '0');
      const marketCapUsd = parseFloat(tokenAttr.market_cap_usd || attr.market_cap_usd || '0');
      const liquidityUsd = parseFloat(attr.reserve_in_usd || '0');

      // Calculate SOL equivalents
      const solPrice = 150; // Approximate SOL price, this could be fetched dynamically
      const volumeSol = volumeUsd / solPrice;
      const marketCapSol = marketCapUsd / solPrice;
      const liquiditySol = liquidityUsd / solPrice;

      // Get price changes
      const priceChange1h = parseFloat(attr.price_change_percentage.h1 || '0');
      const priceChange24h = parseFloat(attr.price_change_percentage.h24 || '0');

      return {
        token_address: tokenAttr.address,
        token_name: tokenAttr.name,
        token_ticker: tokenAttr.symbol,
        price_sol: priceSol,
        price_usd: priceUsd,
        market_cap_sol: marketCapSol,
        market_cap_usd: marketCapUsd,
        volume_sol: volumeSol,
        volume_usd: volumeUsd,
        liquidity_sol: liquiditySol,
        liquidity_usd: liquidityUsd,
        transaction_count: transactionCount,
        price_1hr_change: priceChange1h,
        price_24hr_change: priceChange24h,
        protocol: 'GeckoTerminal',
        pair_address: pool.attributes.address,
        created_at: new Date(pool.attributes.pool_created_at).getTime(),
        updated_at: Date.now(),
        source: 'geckoterminal'
      };
    } catch (error) {
      logger.error('Failed to transform token data', { 
        poolId: pool.id, 
        tokenId: tokenInfo.id, 
        error 
      });
      return null;
    }
  }

  /**
   * Delay helper to respect rate limits
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 