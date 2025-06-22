export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  timestamp: number;
  request_id?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  exponentialBackoff: boolean;
  maxBackoffTime: number;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  updateInterval: number;
}

export interface ApiError extends Error {
  code: string;
  statusCode: number;
  details?: any;
}

export interface ExternalApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  apiVersion?: string;
  rateLimit?: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  services: {
    [serviceName: string]: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
  };
}

export interface MetricsResponse {
  cache: {
    hit_rate: number;
    size: number;
    max_size: number;
  };
  api_calls: {
    total: number;
    by_source: {
      [source: string]: number;
    };
    rate_limited: number;
  };
  websocket: {
    active_connections: number;
    messages_sent: number;
  };
} 