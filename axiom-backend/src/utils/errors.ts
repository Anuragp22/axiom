import { ApiError } from '@/types/api';

export class CustomError extends Error implements ApiError {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 'NOT_FOUND', 404, details);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded', details?: any) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
  }
}

export class ExternalApiError extends CustomError {
  constructor(service: string, message: string, statusCode: number = 502, details?: any) {
    super(`${service} API error: ${message}`, 'EXTERNAL_API_ERROR', statusCode, details);
  }
}

export class CacheError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 'CACHE_ERROR', 500, details);
  }
}

export const createApiError = (
  message: string,
  code: string = 'INTERNAL_ERROR',
  statusCode: number = 500,
  details?: any
): ApiError => {
  return new CustomError(message, code, statusCode, details);
};

export const isApiError = (error: any): error is ApiError => {
  return error && typeof error.code === 'string' && typeof error.statusCode === 'number';
}; 