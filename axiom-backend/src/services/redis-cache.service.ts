import Redis from 'ioredis';
import logger from '@/utils/logger';

export interface RedisCacheOptions {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  ttlSeconds?: number; // default TTL
  keyPrefix?: string;
}

export class RedisCacheService {
  private client: Redis | null = null;
  private readonly ttlSeconds: number;
  private readonly keyPrefix: string;

  constructor(options: RedisCacheOptions = {}) {
    const url = options.url || process.env.REDIS_URL;
    const host = options.host || process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(options.port || process.env.REDIS_PORT || 6379);
    const password = options.password || process.env.REDIS_PASSWORD;

    this.ttlSeconds = Number(options.ttlSeconds || process.env.CACHE_TTL_SECONDS || 30);
    this.keyPrefix = options.keyPrefix || process.env.REDIS_KEY_PREFIX || 'axiom:';

    try {
      this.client = url ? new Redis(url) : new Redis({ host, port, password, keyPrefix: this.keyPrefix });
      this.client.on('error', (err) => logger.warn('Redis connection error', { error: err?.message }));
      this.client.on('connect', () => logger.info('Redis connected'));
    } catch (e: any) {
      logger.warn('Failed to initialize Redis client; caching disabled', { error: e?.message });
      this.client = null;
    }
  }

  public isEnabled(): boolean {
    return !!this.client;
  }

  private k(key: string): string { return `${this.keyPrefix}${key}`; }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(this.k(key));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (e: any) {
      logger.warn('Redis GET failed', { key, error: e?.message });
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      const ttl = Number(ttlSeconds ?? this.ttlSeconds);
      const payload = JSON.stringify(value);
      await this.client.set(this.k(key), payload, 'EX', Math.max(1, ttl));
    } catch (e: any) {
      logger.warn('Redis SET failed', { key, error: e?.message });
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try { await this.client.del(this.k(key)); } catch {}
  }

  async withCache<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached != null) return cached;
    const value = await fetcher();
    this.set(key, value, ttlSeconds).catch(() => {});
    return value;
  }
}

export default RedisCacheService;


