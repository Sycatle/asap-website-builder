import axios, { type AxiosInstance, type AxiosError } from 'axios';

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

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response) {
          // Handle 401 Unauthorized - attempt token refresh
          if (error.response.status === 401 && !error.config?.headers?.['X-Token-Refresh-Retry']) {
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
                if (error.config) {
                  error.config.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
                  error.config.headers['X-Token-Refresh-Retry'] = 'true';
                  return this.client.request(error.config);
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
              if (!error.config?.headers?.['X-CSRF-Retry']) {
                await this.fetchCsrfToken();
                if (error.config && this.csrfToken) {
                  error.config.headers[CSRF_HEADER] = this.csrfToken;
                  error.config.headers['X-CSRF-Retry'] = 'true';
                  return this.client.request(error.config);
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
        throw error;
      }
    );
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
   */
  getCsrfToken(): string | null {
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
