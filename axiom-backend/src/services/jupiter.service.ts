import { HttpClient } from '@/utils/http-client';
import { JupiterPriceResponse, Token } from '@/types/token';
import config from '@/config';
import logger from '@/utils/logger';
import { ExternalApiError } from '@/utils/errors';

export class JupiterService {
  private httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient(config.apis.jupiter);
  }

  /**
   * Get token prices from Jupiter API
   */
  async getTokenPrices(tokenAddresses: string[]): Promise<{ [address: string]: number }> {
    try {
      if (tokenAddresses.length === 0) {
        return {};
      }

      // Jupiter v2 API allows multiple token addresses in a single request
      const addressesParam = tokenAddresses.join(',');
      const endpoint = `/price/v2?ids=${addressesParam}`;
      
      // console.log('🚀 JUPITER DEBUG: Using endpoint:', endpoint);
      // console.log('🚀 JUPITER DEBUG: Base URL:', config.apis.jupiter.baseUrl);
      
      // logger.info('Fetching token prices from Jupiter', { 
      //   addresses: addressesParam,
      //   count: tokenAddresses.length,
      //   endpoint: endpoint
      // });

      const response = await this.httpClient.get<JupiterPriceResponse>(endpoint);

      const prices: { [address: string]: number } = {};
      
      if (response.data) {
        Object.entries(response.data).forEach(([address, priceData]) => {
          if (priceData && priceData.price) {
            prices[address] = parseFloat(priceData.price);
          }
        });
      }

      logger.info('Successfully fetched prices from Jupiter', { 
        requestedCount: tokenAddresses.length,
        receivedCount: Object.keys(prices).length 
      });

      return prices;
    } catch (error: any) {
      console.log('🚨 JUPITER ERROR DETAILS:');
      console.log('🚨 Error message:', error.message);
      console.log('🚨 Error status:', error.response?.status);
      console.log('🚨 Error data:', error.response?.data);
      console.log('🚨 Full error:', error);
      
      logger.error('Failed to fetch token prices from Jupiter', { 
        tokenAddresses, 
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url
        }
      });
      throw new ExternalApiError('Jupiter', `Price fetch failed: ${error}`);
    }
  }

  /**
   * Get single token price
   */
  async getTokenPrice(tokenAddress: string): Promise<number | null> {
    try {
      const prices = await this.getTokenPrices([tokenAddress]);
      return prices[tokenAddress] || null;
    } catch (error) {
      logger.error('Failed to fetch single token price from Jupiter', { 
        tokenAddress, 
        error 
      });
      return null;
    }
  }

  /**
   * Enrich tokens with Jupiter price data
   */
  async enrichTokensWithPrices(tokens: Token[]): Promise<Token[]> {
    try {
      const tokenAddresses = tokens.map(token => token.token_address);
      const prices = await this.getTokenPrices(tokenAddresses);

      return tokens.map(token => {
        const jupiterPrice = prices[token.token_address];
        if (jupiterPrice) {
          return {
            ...token,
            price_usd: jupiterPrice,
            // Update market cap and volume in USD if we have price
            market_cap_usd: token.market_cap_sol * jupiterPrice * (token.price_sol || 1),
            volume_usd: token.volume_sol * jupiterPrice * (token.price_sol || 1),
            liquidity_usd: token.liquidity_sol * jupiterPrice * (token.price_sol || 1),
            updated_at: Date.now(),
          };
        }
        return token;
      });
    } catch (error) {
      logger.warn('Failed to enrich tokens with Jupiter prices', { error });
      // Return original tokens if Jupiter fails
      return tokens;
    }
  }

  /**
   * Check if Jupiter API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to get SOL price as a health check
      const solPrice = await this.getTokenPrice('So11111111111111111111111111111111111111112');
      return solPrice !== null && solPrice > 0;
    } catch (error) {
      logger.error('Jupiter health check failed', { error });
      return false;
    }
  }
} 