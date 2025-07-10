import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from '@/websocket/websocket-server';
import { errorHandler } from '@/middleware/error-handler';
// Removed unused route imports - only WebSocket is used
import config from '@/config';
import logger from '@/utils/logger';
import { Request, Response, NextFunction } from 'express';

class AxiomServer {
  private app: express.Application;
  private httpServer: any;
  private wsServer: WebSocketServer | null = null;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
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
      origin: config.websocket.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-timestamp'],
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
    // Only WebSocket is used - REST API routes removed

    // WebSocket stats endpoint
    this.app.get('/api/websocket/stats', (req, res) => {
      const stats = this.wsServer?.getStats() || {
        connectedClients: 0,
        rooms: [],
        uptime: 0,
      };

      res.json({
        success: true,
        data: stats,
        timestamp: Date.now(),
        request_id: req.headers['x-request-id'],
      });
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
            websocket: 'ws://localhost:' + config.server.port,
            stats: '/api/websocket/stats',
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

      // Log available endpoints
      logger.info('Available endpoints', {
        websocket: `ws://localhost:${config.server.port}`,
        stats: `http://localhost:${config.server.port}/api/websocket/stats`,
      });
    });
  }

  private shutdown(): void {
    logger.info('Shutting down server...');
    
    // Stop WebSocket server
    if (this.wsServer) {
      this.wsServer.stop();
    }

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