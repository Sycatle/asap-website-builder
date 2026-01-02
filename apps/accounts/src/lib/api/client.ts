import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends APIError {
  public attempts: number;
  
  constructor(
    message: string = 'Erreur réseau. Vérifiez votre connexion.',
    attempts: number = 0
  ) {
    super(0, message);
    this.name = 'NetworkError';
    this.attempts = attempts;
  }
}

export class RateLimitError extends APIError {
  public retryAfter: number;
  public limit: number;
  public remaining: number;
  
  constructor(
    retryAfter: number,
    limit: number = 5,
    remaining: number = 0,
    message: string = 'Trop de tentatives. Veuillez réessayer plus tard.'
  ) {
    super(429, message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.remaining = remaining;
  }
}

// CSRF token storage key
const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';

// Methods that require CSRF protection
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatuses: [408, 500, 502, 503, 504],
  retryableMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
};

const RETRY_COUNT_HEADER = 'X-Retry-Count';

function isNetworkError(error: AxiosError): boolean {
  return !error.response && Boolean(error.request);
}

function isRetryableStatus(status: number): boolean {
  return RETRY_CONFIG.retryableStatuses.includes(status);
}

function isRetryableMethod(method?: string): boolean {
  if (!method) return false;
  return RETRY_CONFIG.retryableMethods.includes(method.toUpperCase());
}

function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  const delay = exponentialDelay + jitter;
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class APIClient {
  private client: AxiosInstance;
  private baseURL: string;
  private csrfToken: string | null = null;

  constructor() {
    this.baseURL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      // CRITICAL: Enable cookies for cross-domain requests
      // This is required for secure HttpOnly auth cookies to work
      withCredentials: true,
      timeout: 30000,
    });

    if (typeof window !== 'undefined') {
      this.csrfToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
    }

    // Request interceptor
    this.client.interceptors.request.use(async (config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (config.method && CSRF_PROTECTED_METHODS.includes(config.method.toUpperCase())) {
          if (!this.csrfToken) {
            await this.fetchCsrfToken();
          }
          if (this.csrfToken) {
            config.headers[CSRF_HEADER] = this.csrfToken;
          }
        }
      }
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { [RETRY_COUNT_HEADER]?: number };
        const retryCount = config?.[RETRY_COUNT_HEADER] || 0;
        
        const shouldRetry = this.shouldRetryRequest(error, retryCount);
        
        if (shouldRetry && config) {
          config[RETRY_COUNT_HEADER] = retryCount + 1;
          const delay = calculateBackoffDelay(retryCount);
          await sleep(delay);
          return this.client.request(config);
        }
        
        if (error.response) {
          // Handle 401 - token refresh
          if (error.response.status === 401 && !config?.headers?.['X-Token-Refresh-Retry']) {
            const refreshToken = typeof window !== 'undefined' 
              ? localStorage.getItem('refresh_token') 
              : null;
            
            if (refreshToken) {
              try {
                const refreshResponse = await axios.post<{ access_token: string; refresh_token: string }>(
                  `${this.baseURL}/auth/refresh`,
                  { refresh_token: refreshToken }
                );
                
                if (typeof window !== 'undefined') {
                  localStorage.setItem('auth_token', refreshResponse.data.access_token);
                  localStorage.setItem('refresh_token', refreshResponse.data.refresh_token);
                }
                
                if (config) {
                  config.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
                  config.headers['X-Token-Refresh-Retry'] = 'true';
                  return this.client.request(config);
                }
              } catch {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('refresh_token');
                }
              }
            }
          }
          
          // Handle rate limiting
          if (error.response.status === 429) {
            const retryAfter = parseInt(
              error.response.headers['retry-after'] || '60',
              10
            );
            const limit = parseInt(
              error.response.headers['x-ratelimit-limit'] || '5',
              10
            );
            const remaining = parseInt(
              error.response.headers['x-ratelimit-remaining'] || '0',
              10
            );
            const data = error.response.data as any;
            throw new RateLimitError(retryAfter, limit, remaining, data?.error);
          }
          
          throw new APIError(
            error.response.status,
            error.response.statusText,
            error.response.data
          );
        }
        
        throw new NetworkError('Erreur réseau. Vérifiez votre connexion.', retryCount);
      }
    );
  }

  private shouldRetryRequest(error: AxiosError, retryCount: number): boolean {
    if (retryCount >= RETRY_CONFIG.maxRetries) return false;
    const config = error.config;
    if (!config) return false;
    
    if (!isRetryableMethod(config.method)) {
      if (!isNetworkError(error)) return false;
    }
    
    if (isNetworkError(error)) return true;
    if (error.response && isRetryableStatus(error.response.status)) return true;
    
    return false;
  }

  async fetchCsrfToken(): Promise<string | null> {
    try {
      const response = await axios.get<{ csrf_token: string }>(
        `${this.baseURL}/auth/csrf-token`
      );
      this.csrfToken = response.data.csrf_token;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(CSRF_TOKEN_KEY, this.csrfToken);
      }
      return this.csrfToken;
    } catch {
      return null;
    }
  }

  clearCsrfToken(): void {
    this.csrfToken = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CSRF_TOKEN_KEY);
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.client.get<T>(endpoint);
    return response.data;
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.client.post<T>(endpoint, data);
    return response.data;
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.client.put<T>(endpoint, data);
    return response.data;
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<T>(endpoint, data);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.client.delete<T>(endpoint);
    return response.data;
  }
}

export const apiClient = new APIClient();
