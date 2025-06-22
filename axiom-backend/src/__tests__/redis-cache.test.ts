import { RedisCacheService } from '../services/redis-cache.service';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    flushdb: jest.fn(),
    info: jest.fn(),
    dbsize: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    mget: jest.fn(),
    pipeline: jest.fn(() => ({
      setex: jest.fn(),
      set: jest.fn(),
      exec: jest.fn(),
    })),
  }));
});

describe('RedisCacheService', () => {
  let cacheService: RedisCacheService;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new RedisCacheService();
    mockRedis = (cacheService as any).redis;
    // Simulate connected state
    (cacheService as any).isConnected = true;
  });

  describe('basic operations', () => {
    it('should get value from cache', async () => {
      const testData = { test: 'data' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test-key');

      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent-key');

      expect(result).toBeNull();
    });

    it('should set value in cache with TTL', async () => {
      const testData = { test: 'data' };
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', testData, 60);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        60,
        JSON.stringify(testData)
      );
      expect(result).toBe(true);
    });

    it('should delete value from cache', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.del('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
      expect(result).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      (cacheService as any).isConnected = false;

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should handle Redis operation errors', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('advanced operations', () => {
    it('should ping Redis', async () => {
      mockRedis.ping.mockResolvedValue('PONG');

      const result = await cacheService.ping();

      expect(result).toBe(true);
    });

    it('should use getOrSet for cache-aside pattern', async () => {
      const testData = { fresh: 'data' };
      mockRedis.get.mockResolvedValue(null); // Cache miss
      mockRedis.setex.mockResolvedValue('OK');

      const fetchFunction = jest.fn().mockResolvedValue(testData);

      const result = await cacheService.getOrSet(
        'test-key',
        fetchFunction,
        60
      );

      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
      expect(fetchFunction).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'test-key',
        60,
        JSON.stringify(testData)
      );
      expect(result).toEqual(testData);
    });
  });
}); 