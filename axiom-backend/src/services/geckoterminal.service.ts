import { HttpClient } from '@/utils/http-client';
import { GeckoTerminalResponse, GeckoTerminalToken, Token } from '@/types/token';
import config from '@/config';
import logger from '@/utils/logger';
import { ExternalApiError } from '@/utils/errors';
import { AxiosRequestConfig } from 'axios';
import { response } from 'express';

export class GeckoTerminalService {
  private httpClient: HttpClient;
  private apiVersion: string;

  constructor() {
    this.httpClient = new HttpClient(config.apis.geckoTerminal);
    this.apiVersion = config.apis.geckoTerminal.apiVersion || '20230302';
  }

  /**
   * Get request headers with proper API version
   */
  private getHeaders(): AxiosRequestConfig['headers'] {
    return {
      'Accept': `application/json;version=${this.apiVersion}`,
    };
  }

  /**
   * Search for pools using the official search endpoint
   */
  async searchTokens(query: string): Promise<Token[]> {
    try {
      logger.info('Searching tokens on GeckoTerminal', { query });
      
      const response = await this.httpClient.get<any>(
        `/api/v2/search/pools?query=${encodeURIComponent(query)}`,
        { headers: this.getHeaders() }
      );

      return this.extractTokensFromPoolsResponse(response);
    } catch (error) {
      logger.error('Failed to search tokens on GeckoTerminal', { query, error });
      throw new ExternalApiError('GeckoTerminal', `Search failed: ${error}`);
    }
  }

  /**
   * Get trending tokens from GeckoTerminal using the official trending pools endpoint
   */
  async getTrendingTokens(limit: number = 50): Promise<Token[]> {
    try {
      logger.info('Fetching trending tokens from GeckoTerminal', { limit });
      
      const response = await this.httpClient.get<any>(
        `/api/v2/networks/solana/trending_pools?include=tokens`,
        { headers: this.getHeaders() }
      );

      // GeckoTerminal pools API returns pools with included tokens
      const tokens = this.extractTokensFromPoolsResponse(response);
      return tokens.slice(0, Math.min(limit, tokens.length));
    } catch (error) {
      logger.error('Failed to fetch trending tokens from GeckoTerminal', { error });
      throw new ExternalApiError('GeckoTerminal', `Trending tokens fetch failed: ${error}`);
    }
  }

  /**
   * Get new tokens using the official new pools endpoint
   */
  async getNewTokens(limit: number = 30): Promise<Token[]> {
    try {
      logger.info('Fetching new tokens from GeckoTerminal', { limit });
      
      const response = await this.httpClient.get<any>(
        `/api/v2/networks/solana/new_pools?include=tokens`,
        { headers: this.getHeaders() }
      );

      const tokens = this.extractTokensFromPoolsResponse(response);
      return tokens.slice(0, Math.min(limit, tokens.length));
    } catch (error) {
      logger.error('Failed to fetch new tokens from GeckoTerminal', { error });
      throw new ExternalApiError('GeckoTerminal', `New tokens fetch failed: ${error}`);
    }
  }

  /**
   * Get token data by address using the official tokens endpoint
   */
  async getTokenByAddress(tokenAddress: string): Promise<Token | null> {
    try {
      logger.info('Fetching token from GeckoTerminal', { tokenAddress });
      
      const response = await this.httpClient.get<GeckoTerminalResponse>(
        `/api/v2/networks/solana/tokens/${tokenAddress}`,
        { headers: this.getHeaders() }
      );

      const tokens = this.transformTokens(response.data);
      return tokens.length > 0 ? tokens[0]! : null;
    } catch (error) {
      logger.error('Failed to fetch token from GeckoTerminal', { tokenAddress, error });
      return null;
    }
  }

  /**
   * Get multiple tokens by addresses using the official multi tokens endpoint
   */
  async getMultipleTokens(tokenAddresses: string[]): Promise<Token[]> {
    try {
      logger.info('Fetching multiple tokens from GeckoTerminal', { 
        tokenAddresses,
        count: tokenAddresses.length 
      });

      // GeckoTerminal supports multi token requests
      const addressesParam = tokenAddresses.join(',');
      const response = await this.httpClient.get<GeckoTerminalResponse>(
        `/api/v2/networks/solana/tokens/multi/${addressesParam}`,
        { headers: this.getHeaders() }
      );

      return this.transformTokens(response.data);
    } catch (error) {
      logger.error('Failed to fetch multiple tokens from GeckoTerminal', { 
        tokenAddresses, 
        error 
      });
      throw new ExternalApiError('GeckoTerminal', `Multiple tokens fetch failed: ${error}`);
    }
  }

  /**
   * Get token prices using the simple price endpoint
   */
  async getTokenPrices(tokenAddresses: string[]): Promise<{ [address: string]: number }> {
    try {
      logger.info('Fetching token prices from GeckoTerminal', { 
        tokenAddresses,
        count: tokenAddresses.length 
      });

      const addressesParam = tokenAddresses.join(',');
      const response = await this.httpClient.get<any>(
        `/api/v2/simple/networks/solana/token_price/${addressesParam}`,
        { headers: this.getHeaders() }
      );

      const prices: { [address: string]: number } = {};
      if (response.data && response.data.attributes) {
        Object.entries(response.data.attributes.token_prices).forEach(([address, priceData]: [string, any]) => {
          prices[address] = parseFloat(priceData.price_usd || '0');
        });
      }

      return prices;
    } catch (error) {
      logger.error('Failed to fetch token prices from GeckoTerminal', { 
        tokenAddresses, 
        error 
      });
      throw new ExternalApiError('GeckoTerminal', `Price fetch failed: ${error}`);
    }
  }

  /**
   * Extract tokens from GeckoTerminal pools API response
   */
  private extractTokensFromPoolsResponse(response: any): Token[] {
    try {
      const pools = response.data || [];
      const uniqueTokens = new Map<string, any>();
      
      // Extract base and quote tokens from pool relationships
      pools.forEach((pool: any) => {
        if (pool.relationships) {
          // Extract base token
          if (pool.relationships.base_token?.data?.id) {
            const tokenId = pool.relationships.base_token.data.id;
            const tokenAddress = this.extractTokenAddressFromId(tokenId);
            if (tokenAddress && !uniqueTokens.has(tokenAddress)) {
              uniqueTokens.set(tokenAddress, {
                address: tokenAddress,
                price_usd: pool.attributes.base_token_price_usd,
                pool_id: pool.id,
                pool_name: pool.attributes.name,
                volume_usd: pool.attributes.volume_usd?.h24 || '0',
                market_cap_usd: pool.attributes.market_cap_usd,
                fdv_usd: pool.attributes.fdv_usd
              });
            }
          }
          
          // Extract quote token (usually SOL, but we'll include it anyway)
          if (pool.relationships.quote_token?.data?.id) {
            const tokenId = pool.relationships.quote_token.data.id;
            const tokenAddress = this.extractTokenAddressFromId(tokenId);
            if (tokenAddress && !uniqueTokens.has(tokenAddress)) {
              uniqueTokens.set(tokenAddress, {
                address: tokenAddress,
                price_usd: pool.attributes.quote_token_price_usd,
                pool_id: pool.id,
                pool_name: pool.attributes.name,
                volume_usd: pool.attributes.volume_usd?.h24 || '0',
                market_cap_usd: pool.attributes.market_cap_usd,
                fdv_usd: pool.attributes.fdv_usd
              });
            }
          }
        }
      });
      
      logger.info('Extracted tokens from GeckoTerminal pools response', { 
        poolCount: pools.length,
        uniqueTokenCount: uniqueTokens.size 
      });
      
      // Convert to our Token format
      return Array.from(uniqueTokens.values()).map(tokenData => this.transformPoolTokenData(tokenData));
    } catch (error) {
      logger.warn('Failed to extract tokens from GeckoTerminal pools response', { error });
      return [];
    }
  }

  /**
   * Extract token address from GeckoTerminal token ID format (solana_ADDRESS)
   */
  private extractTokenAddressFromId(tokenId: string): string | null {
    try {
      const parts = tokenId.split('_');
      if (parts.length === 2 && parts[0] === 'solana') {
        return parts[1] || null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Transform pool token data to our Token format
   */
  private transformPoolTokenData(tokenData: any): Token {
    const priceUsd = parseFloat(tokenData.price_usd) || 0;
    const marketCapUsd = parseFloat(tokenData.market_cap_usd) || 0;
    const fdvUsd = parseFloat(tokenData.fdv_usd) || 0;
    const volume24hUsd = parseFloat(tokenData.volume_usd) || 0;

    // Estimate SOL price (rough conversion)
    const solPriceUsd = 128; // Approximate, should be fetched from an API
    const priceSol = priceUsd / solPriceUsd;
    const marketCapSol = marketCapUsd / solPriceUsd;
    const volumeSol = volume24hUsd / solPriceUsd;

    return {
      token_address: tokenData.address,
      token_name: tokenData.pool_name.split(' / ')[0] || 'Unknown', // Extract token name from pool name
      token_ticker: tokenData.pool_name.split(' / ')[0] || 'UNKNOWN',
      price_sol: priceSol,
      price_usd: priceUsd,
      market_cap_sol: marketCapSol,
      market_cap_usd: marketCapUsd,
      volume_sol: volumeSol,
      volume_usd: volume24hUsd,
      liquidity_sol: 0, // Not available from pool data
      liquidity_usd: 0, // Not available from pool data
      transaction_count: 0, // Not available from pool data
      price_1hr_change: 0, // Would need historical data
      price_24hr_change: 0, // Would need historical data
      protocol: 'GeckoTerminal',
      created_at: Date.now(),
      updated_at: Date.now(),
      source: 'geckoterminal' as const,
    };
  }

  /**
   * Transform GeckoTerminal API response to our Token format
   */
  private transformTokens(tokens: GeckoTerminalToken[]): Token[] {
    return tokens
      .map(token => this.transformSingleToken(token))
      .filter((token): token is Token => token !== null);
  }

  private transformSingleToken(geckoToken: GeckoTerminalToken): Token | null {
    try {
      const attrs = geckoToken.attributes;
      
      // Parse numeric values
      const priceUsd = parseFloat(attrs.price_usd) || 0;
      const marketCapUsd = parseFloat(attrs.market_cap_usd) || 0;
      const fdvUsd = parseFloat(attrs.fdv_usd) || 0;
      const volume24hUsd = parseFloat(attrs.volume_usd?.h24 || '0') || 0;
      const liquidityUsd = parseFloat(attrs.total_reserve_in_usd) || 0;

      // Estimate SOL price (rough conversion, could be improved with real-time SOL price)
      const solPriceUsd = 100; // Approximate, should be fetched from an API
      const priceSol = priceUsd / solPriceUsd;
      const marketCapSol = marketCapUsd / solPriceUsd;
      const volumeSol = volume24hUsd / solPriceUsd;
      const liquiditySol = liquidityUsd / solPriceUsd;

      return {
        token_address: attrs.address,
        token_name: attrs.name,
        token_ticker: attrs.symbol,
        price_sol: priceSol,
        price_usd: priceUsd,
        market_cap_sol: marketCapSol,
        market_cap_usd: marketCapUsd,
        volume_sol: volumeSol,
        volume_usd: volume24hUsd,
        liquidity_sol: liquiditySol,
        liquidity_usd: liquidityUsd,
        transaction_count: 0, // GeckoTerminal doesn't provide this
        price_1hr_change: 0, // Would need historical data
        price_24hr_change: 0, // Would need historical data
        protocol: 'GeckoTerminal',
        created_at: Date.now(),
        updated_at: Date.now(),
        source: 'geckoterminal' as const,
      };
    } catch (error) {
      logger.warn('Failed to transform GeckoTerminal token', { 
        tokenAddress: geckoToken.attributes?.address,
        error 
      });
      return null;
    }
  }

  /**
   * Check if GeckoTerminal API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const tokens = await this.searchTokens('sol');
      return tokens.length > 0;
    } catch (error) {
      logger.error('GeckoTerminal health check failed', { error });
      return false;
    }
  }
} 