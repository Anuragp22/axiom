import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types/api';
import { isApiError } from '@/utils/errors';
import logger from '@/utils/logger';

// Error counter for deterministic IDs
let errorCounter = 0;

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate deterministic error ID
  errorCounter = (errorCounter + 1) % 10000;
  const errorId = `ERR-${Date.now()}-${errorCounter.toString().padStart(4, '0')}`;
  
  const requestId = (req.headers['x-request-id'] as string) || 'unknown';

  // Log error with context
  logger.error('Request error', {
    errorId,
    requestId,
    message: err.message || 'Unknown error',
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Send structured error response
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      error_id: errorId,
    },
    timestamp: Date.now(),
    request_id: requestId,
  });
}; 