import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_VERSION = '/api';

// Optimized timeout for better performance
const REQUEST_TIMEOUT = 8000;

// Request queue to prevent overwhelming the main thread
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private maxConcurrent = 6; // Limit concurrent requests
  private activeRequests = 0;

  async add<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.activeRequests++;
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processNext();
        }
      });
      
      this.processNext();
    });
  }

  private processNext(): void {
    if (this.processing || this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const nextRequest = this.queue.shift();
    
    if (nextRequest) {
      // Use requestIdleCallback if available, otherwise setTimeout
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          this.processing = false;
          nextRequest();
        });
      } else {
        setTimeout(() => {
          this.processing = false;
          nextRequest();
        }, 0);
      }
    } else {
      this.processing = false;
    }
  }
}

/**
 * API Response interface matching backend structure
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  timestamp: number;
  request_id?: string;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * Optimized HTTP Client class for API communication
 */
class HttpClient {
  private client: AxiosInstance;
  private requestQueue = new RequestQueue();

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}${API_VERSION}`,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Optimize axios performance
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });

    this.setupInterceptors();
  }

  /**
   * Setup optimized request and response interceptors
   */
  private setupInterceptors(): void {
    // Lightweight request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        // Minimal request tracking
        config.headers['x-request-id'] = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        // Only log in development and only for errors
        if (process.env.NODE_ENV === 'development' && config.url?.includes('error')) {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Optimized response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => response,
      (error: any) => {
        // Simplified error handling to reduce main-thread work
        const errorResponse = {
          message: error.response?.data?.error?.message || 
                   error.response?.data?.message || 
                   (error.request ? 'Network error' : 'Request failed'),
          code: error.response?.data?.error?.code || 
                (error.response ? 'SERVER_ERROR' : 'NETWORK_ERROR'),
          status: error.response?.status || 0,
        };

        // Only log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ API Error:', errorResponse);
        }
        
        return Promise.reject(errorResponse);
      }
    );
  }

  /**
   * Queued GET request to prevent main-thread blocking
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestQueue.add(async () => {
      const response = await this.client.get<ApiResponse<T>>(url, config);
      return response.data.data;
    });
  }

  /**
   * Queued POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.requestQueue.add(async () => {
      const response = await this.client.post<ApiResponse<T>>(url, data, config);
      return response.data.data;
    });
  }

  /**
   * Queued PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.requestQueue.add(async () => {
      const response = await this.client.put<ApiResponse<T>>(url, data, config);
      return response.data.data;
    });
  }

  /**
   * Queued DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.requestQueue.add(async () => {
      const response = await this.client.delete<ApiResponse<T>>(url, config);
      return response.data.data;
    });
  }

  /**
   * Priority request that bypasses queue (for critical requests)
   */
  async priorityGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    return this.priorityGet('/health');
  }

  /**
   * Get raw axios instance for custom requests
   */
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
export const apiClient = new HttpClient();
export default apiClient; 