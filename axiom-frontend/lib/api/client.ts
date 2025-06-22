import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_VERSION = '/api';

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 10000;

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
 * HTTP Client class for API communication
 */
class HttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}${API_VERSION}`,
      timeout: REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        // Add request ID for tracking
        config.headers['x-request-id'] = this.generateRequestId();
        
        // Add timestamp
        config.headers['x-timestamp'] = Date.now().toString();
        
        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          const logData: any = {};
          if (config.params && Object.keys(config.params).length > 0) {
            logData.params = config.params;
          }
          if (config.data) {
            logData.data = config.data;
          }
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, 
            Object.keys(logData).length > 0 ? logData : 'No params/data'
          );
        }
        
        return config;
      },
      (error: any) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        // // Log response in development
        // if (process.env.NODE_ENV === 'development') {
        //   console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        //     status: response.status,
        //     data: response.data,
        //   });
        // }
        
        return response;
      },
      (error: any) => {
        // Enhanced error handling
        const errorResponse = {
          message: 'An unexpected error occurred',
          code: 'UNKNOWN_ERROR',
          status: error.response?.status || 0,
          data: error.response?.data,
        };

        if (error.response) {
          // Server responded with error status
          errorResponse.message = error.response.data?.error?.message || error.response.data?.message || 'Server error';
          errorResponse.code = error.response.data?.error?.code || 'SERVER_ERROR';
        } else if (error.request) {
          // Request was made but no response received
          errorResponse.message = 'Network error - please check your connection';
          errorResponse.code = 'NETWORK_ERROR';
        } else {
          // Something else happened
          errorResponse.message = error.message || 'Request failed';
          errorResponse.code = 'REQUEST_ERROR';
        }

        console.error('❌ API Error:', errorResponse);
        return Promise.reject(errorResponse);
      }
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generic GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  /**
   * Generic POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  /**
   * Generic PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    return this.get('/health');
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