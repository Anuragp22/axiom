import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { TokenAggregationService } from '@/services/token-aggregation.service';
import { WebSocketMessage, Token } from '@/types/token';
import config from '@/config';
import logger from '@/utils/logger';
import * as cron from 'node-cron';

export class WebSocketServer {
  private io: SocketIOServer;
  private tokenService: TokenAggregationService;
  private connectedClients: Set<string> = new Set();
  private priceUpdateInterval: NodeJS.Timeout | null = null;
  private lastTokenData: Token[] = [];

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

    this.tokenService = new TokenAggregationService();
    this.setupEventHandlers();
    this.startPeriodicUpdates();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      this.connectedClients.add(clientId);
      
      logger.info('Client connected to WebSocket', { 
        clientId,
        totalClients: this.connectedClients.size 
      });

      // Send initial data to the client
      this.sendInitialData(socket);

      // Handle subscription to specific tokens
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

      // Handle client requests for specific token data
      socket.on('get_token', async (tokenAddress: string, callback) => {
        try {
          // This would typically fetch specific token data
          // For now, find it in our cached data
          const token = this.lastTokenData.find(t => t.token_address === tokenAddress);
          
          if (callback && typeof callback === 'function') {
            callback({
              success: true,
              data: token || null,
            });
          }
        } catch (error) {
          logger.error('Error handling get_token request', { clientId, tokenAddress, error });
          
          if (callback && typeof callback === 'function') {
            callback({
              success: false,
              error: 'Failed to fetch token data',
            });
          }
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', (callback) => {
        if (callback && typeof callback === 'function') {
          callback('pong');
        }
      });

      // Handle client disconnect
      socket.on('disconnect', (reason) => {
        this.connectedClients.delete(clientId);
        logger.info('Client disconnected from WebSocket', { 
          clientId,
          reason,
          totalClients: this.connectedClients.size 
        });
      });

      // Handle connection errors
      socket.on('error', (error) => {
        logger.error('WebSocket client error', { clientId, error });
      });
    });

    // Handle server-level errors
    this.io.on('error', (error) => {
      logger.error('WebSocket server error', { error });
    });
  }

  private async sendInitialData(socket: any): Promise<void> {
    try {
      // Send recent trending tokens as initial data
      const trendingTokens = await this.tokenService.getTrendingTokens(20);
      
      const message: WebSocketMessage = {
        type: 'new_token',
        data: {
          tokens: trendingTokens,
          message: 'Initial token data',
        },
        timestamp: Date.now(),
      };

      socket.emit('initial_data', message);
      logger.debug('Sent initial data to client', { 
        clientId: socket.id,
        tokenCount: trendingTokens.length 
      });
    } catch (error) {
      logger.error('Failed to send initial data', { 
        clientId: socket.id,
        error 
      });
    }
  }

  private startPeriodicUpdates(): void {
    // Start periodic price updates every 5 seconds
    this.priceUpdateInterval = setInterval(async () => {
      await this.broadcastPriceUpdates();
    }, 5000);

    // Schedule cache refresh every 30 seconds using cron
    cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.refreshTokenData();
      } catch (error) {
        logger.error('Failed to refresh token data', { error });
      }
    });

    logger.info('Started periodic WebSocket updates');
  }

  private async broadcastPriceUpdates(): Promise<void> {
    try {
      if (this.connectedClients.size === 0) {
        return; // No clients connected, skip update
      }

      // Get current token data or use cached data for simulation
      let currentTokens = this.lastTokenData;
      
      // If we have existing data, simulate price movements for demo
      if (currentTokens.length > 0) {
        // Create simulated price updates for a subset of tokens
        const tokensToUpdate = currentTokens
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(currentTokens.length * 0.2)) // Update 20% of tokens
          .slice(0, 8); // Max 8 tokens per update

        const simulatedUpdates = tokensToUpdate
          .filter(token => token.price_usd != null)
          .map(token => {
            // Generate price movement (-10% to +10%)
            const priceChangePercent = (Math.random() - 0.5) * 20;
            const newPrice = token.price_usd! * (1 + priceChangePercent / 100);
            
            // Generate volume changes (-30% to +50%)
            const volumeChangePercent = (Math.random() - 0.3) * 80;
            const newVolume = (token.volume_usd || 0) * (1 + volumeChangePercent / 100);
            
            // Generate liquidity changes (-10% to +15%)
            const liquidityChangePercent = (Math.random() - 0.4) * 25;
            const newLiquidity = (token.liquidity_usd || 0) * (1 + liquidityChangePercent / 100);
            
            return {
              token_address: token.token_address,
              old_price: token.price_usd!,
              new_price: newPrice,
              price_change_percent: priceChangePercent,
              old_volume: token.volume_usd || 0,
              new_volume: Math.max(0, newVolume),
              volume_change_percent: volumeChangePercent,
              old_liquidity: token.liquidity_usd || 0,
              new_liquidity: Math.max(0, newLiquidity),
              liquidity_change_percent: liquidityChangePercent,
            };
          });

        if (simulatedUpdates.length > 0) {
          const message: WebSocketMessage = {
            type: 'price_update',
            data: {
              updates: simulatedUpdates,
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
          };

          // Broadcast to all clients subscribed to token updates
          this.io.to('token_updates').emit('price_update', message);
          
          logger.debug('Broadcasted simulated price updates', { 
            updateCount: simulatedUpdates.length,
            clientCount: this.connectedClients.size 
          });

          // Update our cached data with new prices, volume, and liquidity
          simulatedUpdates.forEach(update => {
            const tokenIndex = this.lastTokenData.findIndex(t => t.token_address === update.token_address);
            if (tokenIndex !== -1 && this.lastTokenData[tokenIndex]) {
              this.lastTokenData[tokenIndex].price_usd = update.new_price;
              this.lastTokenData[tokenIndex].volume_usd = update.new_volume;
              this.lastTokenData[tokenIndex].liquidity_usd = update.new_liquidity;
              this.lastTokenData[tokenIndex].updated_at = Date.now();
            }
          });
        }
      } else {
        // First time - get fresh data from API
        const freshTokens = await this.tokenService.getTrendingTokens(50);
        this.lastTokenData = freshTokens;
        
        logger.debug('Loaded initial token data for WebSocket', { 
          tokenCount: freshTokens.length 
        });
      }
    } catch (error) {
      logger.error('Failed to broadcast price updates', { error });
    }
  }

  private detectPriceChanges(oldTokens: Token[], newTokens: Token[]): Array<{
    token_address: string;
    old_price: number;
    new_price: number;
    change_percent: number;
  }> {
    const changes: Array<{
      token_address: string;
      old_price: number;
      new_price: number;
      change_percent: number;
    }> = [];

    const oldTokenMap = new Map(oldTokens.map(t => [t.token_address, t]));

    newTokens.forEach(newToken => {
      const oldToken = oldTokenMap.get(newToken.token_address);
      
      if (oldToken && oldToken.price_usd && newToken.price_usd) {
        const oldPrice = oldToken.price_usd;
        const newPrice = newToken.price_usd;
        const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

        // Only broadcast significant changes (>0.1%)
        if (Math.abs(changePercent) > 0.1) {
          changes.push({
            token_address: newToken.token_address,
            old_price: oldPrice,
            new_price: newPrice,
            change_percent: changePercent,
          });
        }
      }
    });

    return changes;
  }

  private async refreshTokenData(): Promise<void> {
    try {
      // Clear cache to force fresh data fetch
      this.tokenService.clearCache();
      
      // Broadcast new token discovery
      const newTokens = await this.tokenService.getTrendingTokens(100);
      
      // Find tokens that weren't in our last data set (potential new listings)
      const lastTokenAddresses = new Set(this.lastTokenData.map(t => t.token_address));
      const potentialNewTokens = newTokens.filter(t => !lastTokenAddresses.has(t.token_address));

      if (potentialNewTokens.length > 0) {
        const message: WebSocketMessage = {
          type: 'new_token',
          data: {
            tokens: potentialNewTokens,
            message: `${potentialNewTokens.length} new tokens discovered`,
          },
          timestamp: Date.now(),
        };

        this.io.emit('new_tokens', message);
        
        logger.info('Broadcasted new token discoveries', { 
          newTokenCount: potentialNewTokens.length,
          clientCount: this.connectedClients.size 
        });
      }
    } catch (error) {
      logger.error('Failed to refresh token data', { error });
    }
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
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
    }
    
    this.io.close();
    logger.info('WebSocket server stopped');
  }
} 