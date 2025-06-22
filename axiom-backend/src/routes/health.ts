import { Router, Request, Response, NextFunction } from 'express';
import { DexScreenerService } from '@/services/dexscreener.service';
import { JupiterService } from '@/services/jupiter.service';
import { GeckoTerminalService } from '@/services/geckoterminal.service';
import { HealthCheckResponse, ApiResponse } from '@/types/api';
import logger from '@/utils/logger';

const router = Router();

/**
 * GET /api/health
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response: ApiResponse<{ status: string; uptime: number }> = {
      success: true,
      data: {
        status: 'healthy',
        uptime: process.uptime(),
      },
      timestamp: Date.now(),
      request_id: req.headers['x-request-id'] as string,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/health/detailed
 * Detailed health check including external services
 */
router.get('/detailed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    
    // Initialize services
    const dexScreenerService = new DexScreenerService();
    const jupiterService = new JupiterService();
    const geckoTerminalService = new GeckoTerminalService();

    // Check all services in parallel
    const [dexScreenerHealth, jupiterHealth, geckoTerminalHealth] = await Promise.allSettled([
      checkServiceHealth('DexScreener', () => dexScreenerService.searchTokens('SOL')),
      checkServiceHealth('Jupiter', () => jupiterService.healthCheck()),
      checkServiceHealth('GeckoTerminal', () => geckoTerminalService.healthCheck()),
    ]);

    // Determine overall status
    const services: HealthCheckResponse['services'] = {};
    let overallStatus: HealthCheckResponse['status'] = 'healthy';

    // Process DexScreener
    if (dexScreenerHealth.status === 'fulfilled') {
      services.dexscreener = dexScreenerHealth.value;
    } else {
      services.dexscreener = { status: 'down', error: 'Health check failed' };
      overallStatus = 'degraded';
    }

    // Process Jupiter
    if (jupiterHealth.status === 'fulfilled') {
      services.jupiter = jupiterHealth.value;
    } else {
      services.jupiter = { status: 'down', error: 'Health check failed' };
      overallStatus = 'degraded';
    }

    // Process GeckoTerminal
    if (geckoTerminalHealth.status === 'fulfilled') {
      services.geckoterminal = geckoTerminalHealth.value;
    } else {
      services.geckoterminal = { status: 'down', error: 'Health check failed' };
      overallStatus = 'degraded';
    }

    // If all services are down, mark as unhealthy
    const allServicesDown = Object.values(services).every(service => service.status === 'down');
    if (allServicesDown) {
      overallStatus = 'unhealthy';
    }

    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: Date.now(),
      uptime: process.uptime(),
      services,
    };

    const response: ApiResponse<HealthCheckResponse> = {
      success: true,
      data: healthResponse,
      timestamp: Date.now(),
      request_id: req.headers['x-request-id'] as string,
    };

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check failed', { error });
    next(error);
  }
});

/**
 * Helper function to check individual service health
 */
async function checkServiceHealth(
  serviceName: string, 
  healthCheckFn: () => Promise<any>
): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    await healthCheckFn();
    const latency = Date.now() - startTime;
    
    logger.debug(`${serviceName} health check passed`, { latency });
    
    return { status: 'up', latency };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    logger.warn(`${serviceName} health check failed`, { 
      error: error.message, 
      latency 
    });
    
    return { 
      status: 'down', 
      latency,
      error: error.message 
    };
  }
}

export default router; 