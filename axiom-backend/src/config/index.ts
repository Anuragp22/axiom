import dotenv from 'dotenv';

dotenv.config();

const config = {
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  apis: {
    dexScreener: {
      baseUrl: process.env.DEXSCREENER_BASE_URL || 'https://api.dexscreener.com',
      timeout: 15000,
      retries: 2, // Fewer retries to avoid hitting rate limits
      retryDelay: 5000, // Longer delay between retries
      rateLimit: parseInt(process.env.DEXSCREENER_RATE_LIMIT || '60', 10), // Much lower rate limit
    },
    jupiter: {
      baseUrl: process.env.JUPITER_BASE_URL || 'https://lite-api.jup.ag',
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
      rateLimit: parseInt(process.env.JUPITER_RATE_LIMIT || '600', 10),
    },
    geckoTerminal: {
      baseUrl: process.env.GECKO_TERMINAL_BASE_URL || 'https://api.geckoterminal.com/api/v2',
      timeout: 10000,
      retries: 2,
      retryDelay: 2000, // 2 second delay between retries
      rateLimit: parseInt(process.env.GECKO_TERMINAL_RATE_LIMIT || '30', 10), // 30 calls per minute as per docs
      version: '20230302', // API version as specified in docs
    },
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL_SECONDS || '60', 10),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    updateInterval: 5000,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'axiom:',
  },

  websocket: {
    port: parseInt(process.env.WS_PORT || '3002', 10),
    path: process.env.WS_PATH || '/ws',
    corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
    pingInterval: 25000,
    pingTimeout: 5000,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
};

export default config; 