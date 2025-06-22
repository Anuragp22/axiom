import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  apis: {
    dexScreener: {
      baseUrl: process.env.DEXSCREENER_BASE_URL || 'https://api.dexscreener.com',
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
    },
    jupiter: {
      baseUrl: process.env.JUPITER_BASE_URL || 'https://lite-api.jup.ag',
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
    },
    geckoTerminal: {
      baseUrl: process.env.GECKOTERMINAL_BASE_URL || 'https://api.geckoterminal.com',
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      apiVersion: process.env.GECKOTERMINAL_API_VERSION || '20230302',
      rateLimit: 30, // 30 calls per minute as per documentation
    },
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    exponentialBackoff: true,
    maxBackoffTime: 30000,
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL_SECONDS || '60', 10), // Updated to 60 seconds to match GeckoTerminal cache
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    updateInterval: 5000, // 5 seconds
  },
  websocket: {
    corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
    pingInterval: 25000,
    pingTimeout: 5000,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
} as const;

export default config; 