import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query);
    if (error) {
      return next(error);
    }
    next();
  };
};

export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return next(error);
    }
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return next(error);
    }
    next();
  };
};

// Common validation schemas
export const tokenQuerySchema = Joi.object({
  timeframe: Joi.string().valid('1h', '24h', '7d').optional(),
  min_volume: Joi.number().min(0).optional(),
  min_market_cap: Joi.number().min(0).optional(),
  min_liquidity: Joi.number().min(0).optional(),
  protocols: Joi.string().optional(),
  sort_by: Joi.string().valid('volume', 'market_cap', 'price_change', 'liquidity', 'created_at').optional(),
  sort_direction: Joi.string().valid('asc', 'desc').optional(),
  limit: Joi.number().min(1).max(100).optional(),
  cursor: Joi.string().optional(),
});

export const searchQuerySchema = Joi.object({
  q: Joi.string().min(2).max(100).required(),
  sort_by: Joi.string().valid('volume', 'market_cap', 'price_change', 'liquidity', 'created_at').optional(),
  sort_direction: Joi.string().valid('asc', 'desc').optional(),
  limit: Joi.number().min(1).max(100).optional(),
  cursor: Joi.string().optional(),
});

export const trendingQuerySchema = Joi.object({
  limit: Joi.number().min(1).max(100).optional(),
}); 