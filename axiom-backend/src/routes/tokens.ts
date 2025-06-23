import { Router, Request, Response, NextFunction } from 'express';
import { TokenAggregationService } from '@/services/token-aggregation.service';
import { ApiResponse } from '@/types/api';
import { TokenFilters, TokenSortOptions, PaginationOptions } from '@/types/token';
import { validateQuery } from '@/middleware/validation';
import { tokenQuerySchema, searchQuerySchema, trendingQuerySchema } from '@/middleware/validation';
import logger from '@/utils/logger';

const router = Router();
const tokenService = new TokenAggregationService();

/**
 * GET /api/tokens
 * Get paginated list of tokens with filtering and sorting
 */
router.get(
  '/',
  validateQuery(tokenQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query;
      
      // Parse filters
      const filters: TokenFilters = {};
      if (query.timeframe) filters.timeframe = query.timeframe as '1h' | '24h' | '7d';
      if (query.min_volume) filters.min_volume = Number(query.min_volume);
      if (query.min_market_cap) filters.min_market_cap = Number(query.min_market_cap);
      if (query.min_liquidity) filters.min_liquidity = Number(query.min_liquidity);
      if (query.protocols) {
        filters.protocols = typeof query.protocols === 'string' 
          ? query.protocols.split(',').map(p => p.trim())
          : [];
      }

      // Parse sorting
      let sort: TokenSortOptions | undefined;
      if (query.sort_by) {
        sort = {
          field: query.sort_by as any,
          direction: (query.sort_direction as 'asc' | 'desc') || 'desc',
        };
      }

      // Parse pagination
      const pagination: PaginationOptions = {};
      if (query.limit) pagination.limit = Number(query.limit);
      if (query.cursor) pagination.cursor = query.cursor as string;

      const result = await tokenService.getTokens(filters, sort, pagination);

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: Date.now(),
        request_id: req.headers['x-request-id'] as string,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tokens/search
 * Search tokens by name or symbol
 */
router.get(
  '/search',
  validateQuery(searchQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query;
      const searchQuery = query.q as string;

      // Parse sorting
      let sort: TokenSortOptions | undefined;
      if (query.sort_by) {
        sort = {
          field: query.sort_by as any,
          direction: (query.sort_direction as 'asc' | 'desc') || 'desc',
        };
      }

      // Parse pagination
      const pagination: PaginationOptions = {};
      if (query.limit) pagination.limit = Number(query.limit);
      if (query.cursor) pagination.cursor = query.cursor as string;

      const result = await tokenService.searchTokens(searchQuery, sort, pagination);

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: Date.now(),
        request_id: req.headers['x-request-id'] as string,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tokens/trending
 * Get trending tokens
 */
router.get(
  '/trending',
  validateQuery(trendingQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const tokens = await tokenService.getTrendingTokens(limit);

      const response: ApiResponse = {
        success: true,
        data: { tokens },
        timestamp: Date.now(),
        request_id: req.headers['x-request-id'] as string,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tokens/featured
 * Get featured tokens (specific popular tokens from DexScreener)
 */
router.get(
  '/featured',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await tokenService.getFeaturedTokens();

      const response: ApiResponse = {
        success: true,
        data: { tokens },
        timestamp: Date.now(),
        request_id: req.headers['x-request-id'] as string,
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/tokens/cache/clear
 * Clear token cache (admin endpoint)
 */
router.post('/cache/clear', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await tokenService.clearCache();
    
    const response: ApiResponse = {
      success: true,
      data: { message: 'Cache cleared successfully' },
      timestamp: Date.now(),
      request_id: req.headers['x-request-id'] as string,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tokens/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await tokenService.getCacheStats();
    
    const response: ApiResponse = {
      success: true,
      data: stats,
      timestamp: Date.now(),
      request_id: req.headers['x-request-id'] as string,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router; 