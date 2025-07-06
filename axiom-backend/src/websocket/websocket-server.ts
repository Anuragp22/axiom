import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { WebSocketMessage, Token } from '@/types/token';
import { RedisCacheService } from '@/services/redis-cache.service';
import config from '@/config';
import logger from '@/utils/logger';
import axios from 'axios';

interface DexScreenerPair {
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: string;
  volume: {
    h1: number;
    h24: number;
    m5: number;
  };
  txns: {
    m5: {
      buys: number;
      sells: number;
    };
    h1: {
      buys: number;
      sells: number;
    };
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  priceChange: {
    h1: number;
    h24: number;
  };
}

interface DexScreenerResponse {
  pairs: DexScreenerPair[];
}

export class WebSocketServer {
  private io: SocketIOServer;
  private redisCache: RedisCacheService;
  private connectedClients: Set<string> = new Set();
  private pollingInterval: NodeJS.Timeout | null = null;
  
  // Dynamic token discovery - no hardcoded tokens
  private trackedTokens: string[] = [];
  private lastTokenDiscovery: number = 0;

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.websocket.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingInterval: config.websocket.pingInterval,
      pingTimeout: config.websocket.pingTimeout,
    });

    this.redisCache = new RedisCacheService();
    this.setupEventHandlers();
    this.startLivePolling();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      this.connectedClients.add(clientId);
      
      logger.info('Client connected to WebSocket', { 
        clientId,
        totalClients: this.connectedClients.size 
      });

      // Send initial data
      this.sendInitialData(socket);

      // Handle subscription to token updates
      socket.on('subscribe_tokens', (tokenAddresses: string[]) => {
        if (Array.isArray(tokenAddresses)) {
          socket.join('token_updates');
          logger.debug('Client subscribed to token updates', { 
            clientId,
            tokenCount: tokenAddresses.length 
          });
        }
      });

      // Handle unsubscription
      socket.on('unsubscribe_tokens', () => {
        socket.leave('token_updates');
        logger.debug('Client unsubscribed from token updates', { clientId });
      });

      // Handle ping/pong
      socket.on('ping', (callback) => {
        if (callback && typeof callback === 'function') {
          callback('pong');
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.connectedClients.delete(clientId);
        logger.info('Client disconnected from WebSocket', { 
          clientId,
          reason,
          totalClients: this.connectedClients.size 
        });
      });
    });
  }

  private async sendInitialData(socket: any): Promise<void> {
    try {
      // Get current token data
      const tokens = await this.fetchAllTokenPairs();
      
      // Send each token as individual new_token events
      tokens.slice(0, 20).forEach(pair => {
        const message: WebSocketMessage = {
          type: 'new_token',
          data: {
            token: {
              id: pair.baseToken?.address,
              symbol: pair.baseToken?.symbol,
              name: pair.baseToken?.name,
              priceData: {
                current: parseFloat(pair.priceUsd),
                change24h: pair.priceChange?.h24 || 0,
                change1h: pair.priceChange?.h1 || 0,
              },
              volume24h: pair.volume?.h24 || 0,
              marketCap: pair.fdv,
              liquidity: pair.liquidity?.usd || 0,
              pairAddress: pair.pairAddress,
            },
            message: 'Initial token data from DexScreener',
          },
          timestamp: Date.now(),
        };
        socket.emit('new_token', message);
      });
      logger.debug('Sent initial data to client', { 
        clientId: socket.id,
        tokenCount: tokens.length 
      });
    } catch (error) {
      logger.error('Failed to send initial data', { 
        clientId: socket.id,
        error 
      });
    }
  }

  private startLivePolling(): void {
    // Start polling every 5 seconds to respect DexScreener rate limits (60/min = 1/sec max)
    this.pollingInterval = setInterval(() => {
      this.pollAndEmitChanges();
    }, 5000);

    logger.info('Started live DexScreener polling every 5 seconds (rate limit compliant)');
  }

  private async pollAndEmitChanges(): Promise<void> {
    try {
      if (this.connectedClients.size === 0) {
        return; // No clients connected, skip polling
      }

      logger.debug('Polling DexScreener for token changes...');
      
      // Fetch all token pairs from all tracked tokens
      const allCurrentPairs = await this.fetchAllTokenPairs();
      
      const changedPairs: DexScreenerPair[] = [];

             // Check each pair for changes and store cached data
       const changedPairsWithCache: Array<{ pair: DexScreenerPair, cached: DexScreenerPair | null }> = [];
       
       for (const pair of allCurrentPairs) {
         const cacheKey = `pair:${pair.pairAddress}`;
         const cached = await this.redisCache.get<DexScreenerPair>(cacheKey);

         if (!cached || this.hasChanged(cached, pair)) {
           changedPairsWithCache.push({ pair, cached });
           
           // Update cache with new data
           await this.redisCache.set(cacheKey, pair, 30); // 30 second expiry
           
           logger.info(`[CHANGED] ${pair.baseToken.symbol}/${pair.quoteToken.symbol} → $${pair.priceUsd}`, {
             pairAddress: pair.pairAddress,
             price: pair.priceUsd,
             volume_h1: pair.volume?.h1,
             liquidity: pair.liquidity?.usd
           });
         }
       }

             // Broadcast changes to all connected clients
       if (changedPairsWithCache.length > 0) {
         const updateMessage: WebSocketMessage = {
           type: 'price_update',
           data: {
             updates: changedPairsWithCache.map(({ pair, cached }) => {
               return {
                 token_address: pair.baseToken?.address,
                 pairAddress: pair.pairAddress,
                 symbol: pair.baseToken?.symbol,
                 name: pair.baseToken?.name,
                 
                 // PRICE DATA
                 old_price: cached ? parseFloat(cached.priceUsd) : 0,
                 new_price: parseFloat(pair.priceUsd),
                 price_change_percent: pair.priceChange?.h1 || 0,
                 price_change_24h: pair.priceChange?.h24 || 0,
                 
                 // MARKET CAP DATA
                 old_marketCap: cached ? cached.fdv : 0,
                 new_marketCap: pair.fdv,
                 marketCap_change_percent: cached && cached.fdv ? ((pair.fdv - cached.fdv) / cached.fdv) * 100 : 0,
                 
                 // LIQUIDITY DATA
                 old_liquidity: cached ? cached.liquidity?.usd || 0 : 0,
                 new_liquidity: pair.liquidity?.usd || 0,
                 liquidity_change_percent: cached && cached.liquidity?.usd ? ((pair.liquidity?.usd || 0) - cached.liquidity.usd) / cached.liquidity.usd * 100 : 0,
                 
                 // VOLUME DATA
                 old_volume_h1: cached ? cached.volume?.h1 || 0 : 0,
                 new_volume_h1: pair.volume?.h1 || 0,
                 volume_h1_change_percent: cached && cached.volume?.h1 ? ((pair.volume?.h1 || 0) - cached.volume.h1) / cached.volume.h1 * 100 : 0,
                 
                 old_volume_h24: cached ? cached.volume?.h24 || 0 : 0,
                 new_volume_h24: pair.volume?.h24 || 0,
                 volume_h24_change_percent: cached && cached.volume?.h24 ? ((pair.volume?.h24 || 0) - cached.volume.h24) / cached.volume.h24 * 100 : 0,
                 
                 old_volume_m5: cached ? cached.volume?.m5 || 0 : 0,
                 new_volume_m5: pair.volume?.m5 || 0,
                 volume_m5_change_percent: cached && cached.volume?.m5 ? ((pair.volume?.m5 || 0) - cached.volume.m5) / cached.volume.m5 * 100 : 0,
                 
                 // TRANSACTION DATA
                 old_txns_m5_buys: cached ? cached.txns?.m5?.buys || 0 : 0,
                 new_txns_m5_buys: pair.txns?.m5?.buys || 0,
                 txns_m5_buys_change: (pair.txns?.m5?.buys || 0) - (cached ? cached.txns?.m5?.buys || 0 : 0),
                 
                 old_txns_m5_sells: cached ? cached.txns?.m5?.sells || 0 : 0,
                 new_txns_m5_sells: pair.txns?.m5?.sells || 0,
                 txns_m5_sells_change: (pair.txns?.m5?.sells || 0) - (cached ? cached.txns?.m5?.sells || 0 : 0),
                 
                 old_txns_h1_buys: cached ? cached.txns?.h1?.buys || 0 : 0,
                 new_txns_h1_buys: pair.txns?.h1?.buys || 0,
                 txns_h1_buys_change: (pair.txns?.h1?.buys || 0) - (cached ? cached.txns?.h1?.buys || 0 : 0),
                 
                 old_txns_h1_sells: cached ? cached.txns?.h1?.sells || 0 : 0,
                 new_txns_h1_sells: pair.txns?.h1?.sells || 0,
                 txns_h1_sells_change: (pair.txns?.h1?.sells || 0) - (cached ? cached.txns?.h1?.sells || 0 : 0),
                 
                 // COMPLETE DATA FOR REFERENCE
                 complete_data: {
                   marketCap: pair.fdv,
                   liquidity: pair.liquidity?.usd || 0,
                   volume: {
                     h1: pair.volume?.h1 || 0,
                     h24: pair.volume?.h24 || 0,
                     m5: pair.volume?.m5 || 0,
                   },
                   txns: {
                     m5: pair.txns?.m5 || { buys: 0, sells: 0 },
                     h1: pair.txns?.h1 || { buys: 0, sells: 0 },
                   },
                   priceChange: pair.priceChange || { h1: 0, h24: 0 },
                 }
               };
             }),
             timestamp: Date.now(),
           },
           timestamp: Date.now(),
         };

         // Broadcast to all connected clients
         this.io.emit('price_update', updateMessage);
         
         logger.info('Broadcasted token updates to clients', {
           changedPairs: changedPairsWithCache.length,
           connectedClients: this.connectedClients.size,
         });
       }
    } catch (error) {
      logger.error('Error during polling and emit', { error });
    }
  }

  private async fetchAllTokenPairs(): Promise<DexScreenerPair[]> {
    // Discover trending tokens dynamically every 2 minutes to save API calls
    if (Date.now() - this.lastTokenDiscovery > 120000 || this.trackedTokens.length === 0) {
      await this.discoverTrendingTokens();
    }

    const allPairs: DexScreenerPair[] = [];
    
    // Use batch requests to respect rate limits - DexScreener allows comma-separated addresses
    try {
      if (this.trackedTokens.length > 0) {
        // Batch up to 30 tokens per request (DexScreener limit)
        const batchSize = Math.min(this.trackedTokens.length, 30);
        const tokenBatch = this.trackedTokens.slice(0, batchSize).join(',');
        
        const response = await axios.get<DexScreenerResponse>(
          `https://api.dexscreener.com/latest/dex/tokens/${tokenBatch}`,
          { timeout: 15000 }
        );
        
        if (response.data?.pairs) {
          allPairs.push(...response.data.pairs);
          logger.debug(`Fetched ${response.data.pairs.length} pairs for ${batchSize} tokens`);
        }
      }
    } catch (error: any) {
      if (error.status === 429) {
        logger.warn('Rate limited by DexScreener - backing off');
        // Exponential backoff on rate limit
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        logger.warn('Failed to fetch token pairs batch', { error: error.message });
      }
    }

    return allPairs;
  }

  private async discoverTrendingTokens(): Promise<void> {
    try {
      // Use fewer search terms to reduce API calls
      const trendingTerms = ['solana', 'pump'];
      const discoveredTokens = new Set<string>();
      
      // Add some stable tokens first
      discoveredTokens.add('So11111111111111111111111111111111111111112'); // SOL
      discoveredTokens.add('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
      
      for (const term of trendingTerms) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between searches
          
          const response = await axios.get<DexScreenerResponse>(
            `https://api.dexscreener.com/latest/dex/search?q=${term}`,
            { timeout: 10000 }
          );
          
          if (response.data?.pairs) {
            response.data.pairs
              .filter(pair => pair.volume?.h24 > 50000) // Higher threshold for better tokens
              .slice(0, 5) // Top 5 from each search
              .forEach(pair => {
                if (pair.baseToken?.address) {
                  discoveredTokens.add(pair.baseToken.address);
                }
              });
          }
        } catch (error: any) {
          if (error.status === 429) {
            logger.warn('Rate limited during token discovery - skipping remaining searches');
            break; // Stop searching if rate limited
          }
          logger.warn(`Failed to search for trending term: ${term}`, { error: error.message });
        }
      }
      
      this.trackedTokens = Array.from(discoveredTokens).slice(0, 15); // Limit to 15 tokens for better rate limiting
      this.lastTokenDiscovery = Date.now();
      
      logger.info('Discovered trending tokens dynamically', { 
        tokenCount: this.trackedTokens.length,
        tokens: this.trackedTokens.slice(0, 5) // Log first 5
      });
    } catch (error) {
      logger.error('Failed to discover trending tokens', { error });
      // Fallback to some known tokens
      this.trackedTokens = [
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      ];
    }
  }

  private hasChanged(oldPair: DexScreenerPair, newPair: DexScreenerPair): boolean {
    // Direct comparison like lo.ts - check meaningful changes
    return (
      oldPair?.priceUsd !== newPair.priceUsd ||
      oldPair?.volume?.h1 !== newPair.volume?.h1 ||
      oldPair?.volume?.h24 !== newPair.volume?.h24 ||
      oldPair?.volume?.m5 !== newPair.volume?.m5 ||
      oldPair?.txns?.m5?.buys !== newPair.txns?.m5?.buys ||
      oldPair?.txns?.m5?.sells !== newPair.txns?.m5?.sells ||
      oldPair?.txns?.h1?.buys !== newPair.txns?.h1?.buys ||
      oldPair?.txns?.h1?.sells !== newPair.txns?.h1?.sells ||
      oldPair?.liquidity?.usd !== newPair.liquidity?.usd ||
      oldPair?.fdv !== newPair.fdv ||
      oldPair?.marketCap !== newPair.marketCap
    );
  }

  public broadcastMessage(message: WebSocketMessage): void {
    this.io.emit('message', message);
    logger.debug('Broadcasted custom message', { 
      type: message.type,
      clientCount: this.connectedClients.size 
    });
  }

  public getConnectedClientCount(): number {
    return this.connectedClients.size;
  }

  public getStats(): {
    connectedClients: number;
    rooms: string[];
    uptime: number;
  } {
    return {
      connectedClients: this.connectedClients.size,
      rooms: Array.from(this.io.sockets.adapter.rooms.keys()),
      uptime: process.uptime(),
    };
  }

  public stop(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.io.close();
    logger.info('WebSocket server stopped');
  }
} 