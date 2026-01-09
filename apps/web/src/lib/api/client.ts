import axios, { type AxiosInstance, type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class NetworkError extends APIError {
  /** Number of retry attempts made */
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
  /** Seconds until rate limit resets */
  public retryAfter: number;
  /** Maximum requests allowed in window */
  public limit: number;
  /** Remaining requests in current window */
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

export class CsrfError extends APIError {
  constructor(message: string = 'Erreur de sécurité CSRF. Veuillez rafraîchir la page.') {
    super(403, message);
    this.name = 'CsrfError';
  }
}

// CSRF token storage key
const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';

// Methods that require CSRF protection
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Retry configuration
const RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  maxRetries: 3,
  /** Base delay in milliseconds (will be multiplied by 2^attempt) */
  baseDelay: 1000,
  /** Maximum delay in milliseconds */
  maxDelay: 10000,
  /** HTTP status codes that should trigger a retry */
  retryableStatuses: [408, 500, 502, 503, 504],
  /** Request methods that are safe to retry (idempotent) */
  retryableMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
};

// Custom header to track retry attempts
const RETRY_COUNT_HEADER = 'X-Retry-Count';

/**
 * Check if an error is a network error (no response received)
 */
function isNetworkError(error: AxiosError): boolean {
  return !error.response && Boolean(error.request);
}

/**
 * Check if an error is retryable based on status code
 */
function isRetryableStatus(status: number): boolean {
  return RETRY_CONFIG.retryableStatuses.includes(status);
}

/**
 * Check if a request method is safe to retry
 */
function isRetryableMethod(method?: string): boolean {
  if (!method) return false;
  return RETRY_CONFIG.retryableMethods.includes(method.toUpperCase());
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(attempt: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  // Add random jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  const delay = exponentialDelay + jitter;
  // Cap at maxDelay
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * Sleep for a specified duration
 */
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
      timeout: 30000,
    });

    // Load CSRF token from storage on init
    if (typeof window !== 'undefined') {
      this.csrfToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
    }

    // Request interceptor to add auth token and CSRF token
    this.client.interceptors.request.use(async (config) => {
      if (typeof window !== 'undefined') {
        // Add auth token
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF token for state-changing requests
        if (config.method && CSRF_PROTECTED_METHODS.includes(config.method.toUpperCase())) {
          // Fetch CSRF token if we don't have one
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

    // Response interceptor for error handling and retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { [RETRY_COUNT_HEADER]?: number };
        
        // Get current retry count
        const retryCount = config?.[RETRY_COUNT_HEADER] || 0;
        
        // Check if we should retry this request
        const shouldRetry = this.shouldRetryRequest(error, retryCount);
        
        if (shouldRetry && config) {
          // Increment retry count
          config[RETRY_COUNT_HEADER] = retryCount + 1;
          
          // Calculate backoff delay
          const delay = calculateBackoffDelay(retryCount);
          
          if (import.meta.env.DEV) {
            console.log(
              `[APIClient] Retry attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries} ` +
              `for ${config.method?.toUpperCase()} ${config.url} after ${Math.round(delay)}ms`
            );
          }
          
          // Wait before retrying
          await sleep(delay);
          
          // Retry the request
          return this.client.request(config);
        }
        
        if (error.response) {
          // Handle 401 Unauthorized - attempt token refresh
          if (error.response.status === 401 && !config?.headers?.['X-Token-Refresh-Retry']) {
            const refreshToken = typeof window !== 'undefined' 
              ? localStorage.getItem('refresh_token') 
              : null;
            
            if (refreshToken) {
              try {
                // Attempt to refresh the token
                const refreshResponse = await axios.post<{ access_token: string; refresh_token: string }>(
                  `${this.baseURL}/auth/refresh`,
                  { refresh_token: refreshToken }
                );
                
                // Store new tokens
                if (typeof window !== 'undefined') {
                  localStorage.setItem('auth_token', refreshResponse.data.access_token);
                  localStorage.setItem('refresh_token', refreshResponse.data.refresh_token);
                }
                
                // Retry the original request with new token
                if (config) {
                  config.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
                  config.headers['X-Token-Refresh-Retry'] = 'true';
                  return this.client.request(config);
                }
              } catch (refreshError) {
                // Refresh failed - clear tokens and let the error propagate
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('refresh_token');
                }
              }
            }
          }
          
          // Handle CSRF errors (403 with CSRF code)
          if (error.response.status === 403) {
            const data = error.response.data as any;
            if (data?.code?.startsWith('CSRF_')) {
              // Clear invalid token and retry once
              this.clearCsrfToken();
              
              // Don't retry if this was already a retry
              if (!config?.headers?.['X-CSRF-Retry']) {
                await this.fetchCsrfToken();
                if (config && this.csrfToken) {
                  config.headers[CSRF_HEADER] = this.csrfToken;
                  config.headers['X-CSRF-Retry'] = 'true';
                  return this.client.request(config);
                }
              }
              
              throw new CsrfError(data?.error || 'CSRF validation failed');
            }
          }
          
          // Handle rate limiting (429)
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
            const message = data?.error || 'Trop de tentatives. Veuillez réessayer plus tard.';
            throw new RateLimitError(retryAfter, limit, remaining, message);
          }
          
          throw new APIError(
            error.response.status,
            error.response.statusText,
            error.response.data
          );
        }
        
        // Network error (no response) - throw NetworkError with retry count
        throw new NetworkError(
          'Erreur réseau. Vérifiez votre connexion.',
          retryCount
        );
      }
    );
  }

  /**
   * Determine if a request should be retried
   */
  private shouldRetryRequest(error: AxiosError, retryCount: number): boolean {
    // Don't retry if we've exceeded max retries
    if (retryCount >= RETRY_CONFIG.maxRetries) {
      return false;
    }
    
    const config = error.config;
    if (!config) return false;
    
    // Check if the method is safe to retry
    if (!isRetryableMethod(config.method)) {
      // For non-idempotent methods (POST), only retry on network errors
      // where the request may not have reached the server
      if (!isNetworkError(error)) {
        return false;
      }
    }
    
    // Retry on network errors (no response received)
    if (isNetworkError(error)) {
      return true;
    }
    
    // Retry on specific server error status codes
    if (error.response && isRetryableStatus(error.response.status)) {
      return true;
    }
    
    return false;
  }

  /**
   * Fetch a new CSRF token from the server
   */
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
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      return null;
    }
  }

  /**
   * Clear the stored CSRF token
   */
  clearCsrfToken(): void {
    this.csrfToken = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CSRF_TOKEN_KEY);
    }
  }

  /**
   * Get the current CSRF token (for manual use if needed)
   * Always reads from sessionStorage to ensure we have the latest token
   */
  getCsrfToken(): string | null {
    if (typeof window !== 'undefined') {
      // Always read from sessionStorage to get the freshest token
      const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
      if (storedToken) {
        this.csrfToken = storedToken;
      }
    }
    return this.csrfToken;
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
