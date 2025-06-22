import { HttpClient } from '../utils/http-client';
import { ExternalApiConfig } from '../types/api';

describe('HttpClient', () => {
  let client: HttpClient;
  
  const config: ExternalApiConfig = {
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    retries: 3,
    retryDelay: 1000,
    rateLimit: 100
  };

  beforeEach(() => {
    client = new HttpClient(config);
  });

  describe('initialization', () => {
    it('should create HttpClient instance', () => {
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(HttpClient);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const invalidConfig: ExternalApiConfig = {
        baseUrl: 'https://invalid-url-that-does-not-exist.test',
        timeout: 1000,
        retries: 0,
        retryDelay: 100,
        rateLimit: 10
      };
      
      const invalidClient = new HttpClient(invalidConfig);
      
      await expect(invalidClient.get('/test')).rejects.toThrow();
    });
  });
}); 