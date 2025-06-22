import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@/types/api';
import { isApiError } from '@/utils/errors';
import logger from '@/utils/logger';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || 
    Math.random().toString(36).substring(2, 15);

  // Log the error
  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.url,
    error: error.message,
    stack: error.stack,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Prepare response
  const response: ApiResponse = {
    success: false,
    timestamp: Date.now(),
    request_id: requestId,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  };

  // Handle known API errors
  if (isApiError(error)) {
    response.error = {
      message: error.message,
      code: error.code,
      details: error.details,
    };
    res.status(error.statusCode).json(response);
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    response.error = {
      message: error.message,
      code: 'VALIDATION_ERROR',
      details: error.details,
    };
    res.status(400).json(response);
    return;
  }

  // Handle Joi validation errors
  if (error.isJoi) {
    response.error = {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
      })),
    };
    res.status(400).json(response);
    return;
  }

  // Handle rate limiting errors
  if (error.type === 'entity.too.large') {
    response.error = {
      message: 'Request payload too large',
      code: 'PAYLOAD_TOO_LARGE',
    };
    res.status(413).json(response);
    return;
  }

  // Default to 500 for unknown errors
  res.status(500).json(response);
}; 