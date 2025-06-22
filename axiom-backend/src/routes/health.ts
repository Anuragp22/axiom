import { Router } from 'express';
import { DexScreenerService } from '@/services/dexscreener.service';
import { JupiterService } from '@/services/jupiter.service';
import { RedisCacheService } from '@/services/redis-cache.service';
import logger from '@/utils/logger';

const router = Router();

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    dexscreener: { status: 'up' | 'down'; error?: string };
    jupiter: { status: 'up' | 'down'; error?: string };
    redis: { status: 'up' | 'down'; error?: string };
  };
  cache: {
    status: 'up' | 'down';
    connected: boolean;
    memory?: string;
    keys?: number;
  };
}

router.get('/', async (req, res) => {
  const startTime = Date.now();
  logger.info('Health check started');

  try {
    // Initialize services
    const dexScreenerService = new DexScreenerService();
    const jupiterService = new JupiterService();
    const redisCacheService = new RedisCacheService();

    // Check service health in parallel
    const [dexScreenerHealth, jupiterHealth, redisHealth] = await Promise.allSettled([
      checkServiceHealth('DexScreener', async () => {
        // Simple health check - try to search for a common token
        const tokens = await dexScreenerService.searchTokens('SOL');
        return tokens.length > 0;
      }),
      checkServiceHealth('Jupiter', () => jupiterService.healthCheck()),
      checkServiceHealth('Redis', () => redisCacheService.ping()),
    ]);

    // Build response
    const services: HealthResponse['services'] = {
      dexscreener: { status: 'down' },
      jupiter: { status: 'down' },
      redis: { status: 'down' },
    };

    let healthyCount = 0;
    const totalServices = 3;

    // Process DexScreener
    if (dexScreenerHealth.status === 'fulfilled') {
      services.dexscreener = dexScreenerHealth.value;
      if (dexScreenerHealth.value.status === 'up') healthyCount++;
    } else {
      services.dexscreener = { status: 'down', error: 'Health check failed' };
    }

    // Process Jupiter
    if (jupiterHealth.status === 'fulfilled') {
      services.jupiter = jupiterHealth.value;
      if (jupiterHealth.value.status === 'up') healthyCount++;
    } else {
      services.jupiter = { status: 'down', error: 'Health check failed' };
    }

    // Process Redis
    if (redisHealth.status === 'fulfilled') {
      services.redis = redisHealth.value;
      if (redisHealth.value.status === 'up') healthyCount++;
    } else {
      services.redis = { status: 'down', error: 'Health check failed' };
    }

    // Get Redis cache stats
    const cacheStats = await redisCacheService.getStats();

    // Determine overall status
    const overallStatus: HealthResponse['status'] = 
      healthyCount === totalServices ? 'healthy' :
      healthyCount > 0 ? 'degraded' : 'unhealthy';

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      cache: {
        status: cacheStats.connected ? 'up' : 'down',
        connected: cacheStats.connected,
        memory: cacheStats.memory,
        keys: cacheStats.keys,
      },
    };

    const duration = Date.now() - startTime;
    logger.info('Health check completed', { 
      status: overallStatus, 
      duration,
      healthyServices: healthyCount,
      totalServices
    });

    // Return appropriate HTTP status
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(httpStatus).json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Health check failed', { error, duration });

    const response: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        dexscreener: { status: 'down', error: 'Health check error' },
        jupiter: { status: 'down', error: 'Health check error' },
        redis: { status: 'down', error: 'Health check error' },
      },
      cache: {
        status: 'down',
        connected: false,
      },
    };

    res.status(503).json(response);
  }
});

async function checkServiceHealth(
  serviceName: string,
  healthCheckFn: () => Promise<boolean>
): Promise<{ status: 'up' | 'down'; error?: string }> {
  try {
    const isHealthy = await healthCheckFn();
    const status = isHealthy ? 'up' : 'down';
    
    logger.debug(`${serviceName} health check completed`, { status });
    
    return { status };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`${serviceName} health check failed`, { error: errorMessage });
    
    return { 
      status: 'down', 
      error: errorMessage 
    };
  }
}

export default router; 