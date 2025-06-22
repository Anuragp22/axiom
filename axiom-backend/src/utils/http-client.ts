import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ExternalApiConfig } from '@/types/api';
import { ExternalApiError } from '@/utils/errors';
import logger from '@/utils/logger';

export class HttpClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private retries: number;
  private retryDelay: number;

  constructor(config: ExternalApiConfig) {
    this.baseUrl = config.baseUrl;
    this.retries = config.retries;
    this.retryDelay = config.retryDelay;

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Axiom-Backend/1.0.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('HTTP Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logger.error('HTTP Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('HTTP Response', {
          status: response.status,
          url: response.config.url,
          duration: this.calculateDuration(response),
        });
        return response;
      },
      (error) => {
        logger.error('HTTP Response Error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  private calculateDuration(response: AxiosResponse): number {
    const start = response.config.metadata?.startTime;
    return start ? Date.now() - start : 0;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateBackoffDelay(attempt: number, baseDelay: number): number {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const requestConfig: AxiosRequestConfig = {
          method,
          url,
          data,
          ...config,
          metadata: { startTime: Date.now() },
        };

        const response = await this.client.request<T>(requestConfig);
        return response.data;
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except for rate limiting (429)
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          if (error.response.status !== 429) {
            throw new ExternalApiError(
              this.baseUrl,
              `Client error: ${error.response.statusText}`,
              error.response.status,
              error.response.data
            );
          }
        }

        // If this is the last attempt, throw the error
        if (attempt === this.retries) {
          break;
        }

        // Calculate backoff delay
        const backoffDelay = this.calculateBackoffDelay(attempt, this.retryDelay);
        
        logger.warn('Retrying HTTP request', {
          attempt: attempt + 1,
          maxAttempts: this.retries + 1,
          delay: backoffDelay,
          error: error.message,
          url,
        });

        await this.delay(backoffDelay);
      }
    }

    // If we get here, all retries failed
    throw new ExternalApiError(
      this.baseUrl,
      `Failed after ${this.retries + 1} attempts: ${lastError.message}`,
      lastError.response?.status || 500,
      lastError.response?.data
    );
  }
}

// Extend the axios config type to include metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
} 