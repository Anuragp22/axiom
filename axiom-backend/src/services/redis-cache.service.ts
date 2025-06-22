import Redis from 'ioredis';
import config from '@/config';
import logger from '@/utils/logger';

export class RedisCacheService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    const redisConfig: any = {
      host: config.redis.host,
      port: config.redis.port,
      db: config.redis.db,
      keyPrefix: config.redis.keyPrefix,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    };

    if (config.redis.password) {
      redisConfig.password = config.redis.password;
    }

    this.redis = new Redis(redisConfig);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis client error', { error: error.message });
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      logger.warn('Redis client connection closed');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache get', { key });
        return null;
      }

      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }

      const parsed = JSON.parse(value);
      logger.debug('Cache hit', { key, dataSize: value.length });
      return parsed;
    } catch (error) {
      logger.error('Failed to get from Redis cache', { key, error });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache set', { key });
        return false;
      }

      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      logger.debug('Cache set', { key, ttl: ttlSeconds, dataSize: serialized.length });
      return true;
    } catch (error) {
      logger.error('Failed to set Redis cache', { key, error });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache delete', { key });
        return false;
      }

      const result = await this.redis.del(key);
      logger.debug('Cache delete', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete from Redis cache', { key, error });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check Redis key existence', { key, error });
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, skipping cache clear');
        return false;
      }

      await this.redis.flushdb();
      logger.info('Redis cache cleared');
      return true;
    } catch (error) {
      logger.error('Failed to clear Redis cache', { error });
      return false;
    }
  }

  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keys: number;
    info: any;
  }> {
    try {
      if (!this.isConnected) {
        return {
          connected: false,
          memory: '0',
          keys: 0,
          info: null
        };
      }

      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();
      
      // Parse memory info
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory = memoryMatch?.[1] || '0';

      return {
        connected: this.isConnected,
        memory,
        keys: dbSize,
        info: this.parseRedisInfo(info)
      };
    } catch (error) {
      logger.error('Failed to get Redis stats', { error });
      return {
        connected: false,
        memory: '0',
        keys: 0,
        info: null
      };
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const parsed: Record<string, string> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (key && value !== undefined) {
          parsed[key] = value;
        }
      }
    }
    
    return parsed;
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed', { error });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis client', { error });
    }
  }

  // Helper method for cache-aside pattern
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch data
    logger.debug('Cache miss, fetching fresh data', { key });
    const freshData = await fetchFunction();
    
    // Set in cache for next time
    await this.set(key, freshData, ttlSeconds);
    
    return freshData;
  }

  // Batch operations
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.isConnected || keys.length === 0) {
        return keys.map(() => null);
      }

      const values = await this.redis.mget(...keys);
      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error('Failed to mget from Redis', { keys, error });
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      if (!this.isConnected || keyValuePairs.length === 0) {
        return false;
      }

      const pipeline = this.redis.pipeline();
      
      for (const { key, value, ttl } of keyValuePairs) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await pipeline.exec();
      logger.debug('Batch cache set completed', { count: keyValuePairs.length });
      return true;
    } catch (error) {
      logger.error('Failed to mset to Redis', { error });
      return false;
    }
  }
} 