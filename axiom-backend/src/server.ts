import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import { createServer } from 'http';
import { WebSocketServer } from '@/websocket/websocket-server';
import { errorHandler } from '@/middleware/error-handler';
import config from '@/config';
import logger from '@/utils/logger';
import { Request, Response, NextFunction } from 'express';
import RedisCacheService from '@/services/redis-cache.service';

class AxiomServer {
  private app: express.Application;
  private httpServer: any;
  private wsServer: WebSocketServer | null = null;
  private cache: RedisCacheService;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.cache = new RedisCacheService({
      url: config.cache.redisUrl,
      host: config.cache.redisHost,
      port: config.cache.redisPort,
      password: config.cache.redisPassword,
      ttlSeconds: config.cache.ttlSeconds,
      keyPrefix: config.cache.keyPrefix,
    });
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-timestamp', 'ngrok-skip-browser-warning'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        timestamp: Date.now(),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request counter for deterministic IDs
    let requestCounter = 0;

    // Enhanced request logging middleware with deterministic ID
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      requestCounter = (requestCounter + 1) % 10000;
      const requestId = `${Date.now()}-${process.pid || 0}-${requestCounter.toString().padStart(4, '0')}`;
      req.headers['x-request-id'] = requestId;
      
      logger.info('Request received', {
        requestId: requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
      });
      
      next();
    });
  }

  private setupRoutes(): void {
    // Health endpoint
    this.app.get('/api/health', (_req, res) => {
      res.json({ success: true, data: { status: 'ok' }, timestamp: Date.now() });
    });

    // Minimal token listing endpoint (aggregate trending addresses and fetch pairs)
    this.app.get('/api/tokens', async (req, res) => {
      try {
        const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), config.pagination.maxLimit);
        const addresses = await this.getTrendingAddresses();
        const addrList = Array.from(addresses).slice(0, 100);
        const cacheKey = `pairs:${addrList.join(',')}`;
        const pairs = await this.cache.withCache<any[]>(cacheKey, () => this.fetchPairsByAddresses(addrList), config.cache.ttlSeconds);

        // Optional filters
        const minVolume = req.query.min_volume ? Number(req.query.min_volume) : undefined;
        const minMarketCap = req.query.min_market_cap ? Number(req.query.min_market_cap) : undefined;
        const minLiquidity = req.query.min_liquidity ? Number(req.query.min_liquidity) : undefined;

        let filtered = pairs.filter(p => !!p?.baseToken?.address);
        if (minVolume) filtered = filtered.filter(p => (p?.volume?.h24 || 0) >= minVolume);
        if (minMarketCap) filtered = filtered.filter(p => (p?.fdv || 0) >= minMarketCap);
        if (minLiquidity) filtered = filtered.filter(p => (p?.liquidity?.usd || 0) >= minLiquidity);

        // Sort mapping
        const sortBy = String(req.query.sort_by || 'volume');
        const sortDirection = String(req.query.sort_direction || 'desc');
        const direction = sortDirection === 'asc' ? 1 : -1;
        const sorters: Record<string, (p: Record<string, any>) => number> = {
          market_cap: (p) => p?.fdv || 0,
          liquidity: (p) => p?.liquidity?.usd || 0,
          volume: (p) => p?.volume?.h24 || 0,
          price_change: (p) => p?.priceChange?.h24 || 0,
        };
        const sorterFn = (sorters[sortBy] ?? sorters.volume) as (p: Record<string, any>) => number;
        filtered = filtered.sort((a: Record<string, any>, b: Record<string, any>) => (sorterFn(a) - sorterFn(b)) * direction);

        const limited = filtered.slice(0, limit);

        const tokens = limited;

        res.json({
          success: true,
          data: {
            tokens,
            pagination: { next_cursor: undefined, has_more: false, total: tokens.length },
          },
          timestamp: Date.now(),
          request_id: req.headers['x-request-id'],
        });
      } catch (error: any) {
        logger.error('Failed to fetch tokens', { error: error?.message });
        res.status(502).json({
          success: false,
          error: { message: 'Upstream fetch failed', code: 'EXTERNAL_API_ERROR' },
          timestamp: Date.now(),
        });
      }
    });

    // Search endpoint
    this.app.get('/api/tokens/search', async (req, res) => {
      const q = String(req.query.q || '').trim();
      if (!q) {
        return res.json({ success: true, data: { tokens: [], pagination: { has_more: false, total: 0 } }, timestamp: Date.now() });
      }
      try {
        const { data } = await axios.get(`${config.apis.dexScreener.baseUrl}/latest/dex/search`, {
          params: { q },
          timeout: config.apis.dexScreener.timeout,
        });
        const pairs: any[] = Array.isArray(data?.pairs) ? data.pairs : [];
        const tokens = pairs.slice(0, config.pagination.maxLimit);
        res.json({
          success: true,
          data: { tokens, pagination: { next_cursor: undefined, has_more: false, total: tokens.length } },
          timestamp: Date.now(),
        });
      } catch (error: any) {
        logger.error('Failed to search tokens', { error: error?.message });
        res.status(502).json({ success: false, error: { message: 'Upstream fetch failed', code: 'EXTERNAL_API_ERROR' }, timestamp: Date.now() });
      }
    });

    // Trending/featured (simple aliases to /tokens)
    this.app.get('/api/tokens/trending', (req, res) => this.forwardToTokens(req, res));
    this.app.get('/api/tokens/featured', (req, res) => this.forwardToTokens(req, res));

    // Cache endpoints (no-op)
    this.app.post('/api/tokens/cache/clear', (_req, res) => {
      res.json({ success: true, data: { message: 'cache cleared' }, timestamp: Date.now() });
    });
    this.app.get('/api/tokens/cache/stats', (_req, res) => {
      res.json({ success: true, data: { hit_rate: 0, size: 0, max_size: 0 }, timestamp: Date.now() });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        data: {
          message: 'Axiom Backend API',
          version: '1.0.0',
          environment: config.server.nodeEnv,
          endpoints: {
            health: '/api/health',
            tokens: '/api/tokens',
          },
        },
        timestamp: Date.now(),
        request_id: req.headers['x-request-id'],
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Endpoint not found',
          code: 'NOT_FOUND',
        },
        timestamp: Date.now(),
        request_id: req.headers['x-request-id'],
      });
    });
  }

  // removed transform – raw upstream JSON is returned via REST and socket

  // Helper to forward to /api/tokens to avoid duplicating logic
  private async forwardToTokens(req: Request, res: Response) {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), config.pagination.maxLimit);
      const addresses = await this.getTrendingAddresses();
      const addrList = Array.from(addresses).slice(0, 100);
      const cacheKey = `pairs:${addrList.join(',')}`;
      const pairs = await this.cache.withCache<any[]>(cacheKey, () => this.fetchPairsByAddresses(addrList), config.cache.ttlSeconds);
      const tokens = pairs.slice(0, limit);
      res.json({ success: true, data: { tokens }, timestamp: Date.now() });
    } catch (error: any) {
      logger.error('Failed to fetch trending tokens', { error: error?.message });
      res.status(502).json({ success: false, error: { message: 'Upstream fetch failed', code: 'EXTERNAL_API_ERROR' }, timestamp: Date.now() });
    }
  }

  private async getTrendingAddresses(): Promise<Set<string>> {
    const addresses = new Set<string>();
    try {
      const top = await axios.get('https://api.dexscreener.com/token-boosts/top/v1', { timeout: 150000 }).then(r => r.data);
      const latest = await axios.get('https://api.dexscreener.com/token-boosts/latest/v1', { timeout: 150000 }).then(r => r.data);
      const gecko = await axios.get('https://api.geckoterminal.com/api/v2/networks/solana/trending_pools', { timeout: 150000 }).then(r => r.data);
      const addAddr = (arr: any[]) => arr.forEach((x: any) => {
        const addr = (x?.tokenAddress || x?.attributes?.base_token_address || '').toString();
        if (addr) addresses.add(addr);
      });
      if (Array.isArray(top)) addAddr(top);
      if (Array.isArray(latest)) addAddr(latest);
      if (Array.isArray(gecko?.data)) addAddr(gecko.data);
    } catch (e: any) {
      logger.warn('getTrendingAddresses failed', { error: e?.message });
    }
    return addresses;
  }

  private async fetchPairsByAddresses(addresses: string[]): Promise<any[]> {
    if (!addresses.length) return [];
    const batch = addresses.slice(0, 30).join(',');
    try {
      const { data } = await axios.get(`${config.apis.dexScreener.baseUrl}/latest/dex/tokens/${batch}`, { timeout: config.apis.dexScreener.timeout });
      return Array.isArray(data?.pairs) ? data.pairs : [];
    } catch (e: any) {
      logger.warn('fetchPairsByAddresses failed', { error: e?.message });
      return [];
    }
  }

  private setupWebSocket(): void {
    this.wsServer = new WebSocketServer(this.httpServer);
    logger.info('WebSocket server initialized');
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection', { reason, promise });
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully');
      this.shutdown();
    });
  }

  public start(): void {
    this.httpServer.listen(config.server.port, () => {
      logger.info('Server started successfully', {
        port: config.server.port,
        environment: config.server.nodeEnv,
        nodeVersion: process.version,
        pid: process.pid,
      });

      const publicHttp = process.env.PUBLIC_HTTP_URL || (config.server.nodeEnv === 'production' ? '' : `http://localhost:${config.server.port}`);
      const publicWs = process.env.PUBLIC_WS_URL || (config.server.nodeEnv === 'production' ? '' : `ws://localhost:${config.server.port}`);
      logger.info('Available endpoints', {
        health: publicHttp ? `${publicHttp}/api/health` : 'set PUBLIC_HTTP_URL to log public endpoints',
        tokens: publicHttp ? `${publicHttp}/api/tokens` : 'set PUBLIC_HTTP_URL to log public endpoints',
        websocket: publicWs || 'set PUBLIC_WS_URL to log public WS endpoint',
      });
    });
  }

  private shutdown(): void {
    logger.info('Shutting down server...');
    
    // Close HTTP server
    this.httpServer.close((error: any) => {
      if (error) {
        logger.error('Error during server shutdown', { error });
        process.exit(1);
      }
      
      logger.info('Server shut down successfully');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Force shutdown after timeout');
      process.exit(1);
    }, 30000);
  }
}

// Start the server
const server = new AxiomServer();
server.start(); 

// Transform DexScreener pair to the frontend-expected backend token structure
(AxiomServer as any).prototype.transformPairToBackendToken = function (pair: any) {
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    token_address: pair?.baseToken?.address,
    token_name: pair?.baseToken?.name || pair?.baseToken?.symbol,
    token_ticker: pair?.baseToken?.symbol,
    price_sol: Number(pair?.priceUsd) || 0,
    price_usd: Number(pair?.priceUsd) || 0,
    market_cap_sol: pair?.fdv || 0,
    market_cap_usd: pair?.fdv || 0,
    volume_sol: pair?.volume?.h24 || 0,
    volume_usd: pair?.volume?.h24 || 0,
    liquidity_sol: pair?.liquidity?.usd || 0,
    liquidity_usd: pair?.liquidity?.usd || 0,
    transaction_count: (pair?.txns?.h1?.buys || 0) + (pair?.txns?.h1?.sells || 0),
    price_1hr_change: pair?.priceChange?.h1 || 0,
    price_24hr_change: pair?.priceChange?.h24 || 0,
    price_7d_change: 0,
    protocol: 'dexscreener',
    dex_id: 'dexscreener',
    pair_address: pair?.pairAddress,
    created_at: undefined,
    updated_at: nowSec,
    source: 'dexscreener',
  };
};