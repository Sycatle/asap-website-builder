import { apiClient } from './client';
import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  TokenPairResponse,
  ListSessionsResponse,
} from '../types';

// Storage keys for localStorage fallback
// In production, auth is primarily handled via HttpOnly cookies
// localStorage is used as fallback for environments where cookies may not work
const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Cookie names (must match backend)
const AUTH_ACCESS_COOKIE = 'asap_access_token';
const AUTH_REFRESH_COOKIE = 'asap_refresh_token';

/**
 * Check if auth cookies are present
 * Note: HttpOnly cookies cannot be read via JS, but we can infer
 * auth status by trying to access protected endpoints
 */
function hasAuthCookies(): boolean {
  if (typeof document === 'undefined') return false;
  // We can't read HttpOnly cookies, but we check if any cookie exists
  // The actual auth check is done server-side
  const cookies = document.cookie;
  // This check is just a hint; actual auth validation happens on API calls
  return cookies.includes(AUTH_ACCESS_COOKIE) || cookies.includes('asap_');
}

export const authAPI = {
  async signup(data: SignupRequest): Promise<SignupResponse> {
    return apiClient.post<SignupResponse>('/auth/signup', data);
  },

  async login(data: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', data);
  },

  async me(): Promise<MeResponse> {
    return apiClient.get<MeResponse>('/auth/me');
  },

  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/change-password', data);
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/forgot-password', data);
  },

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/reset-password', data);
  },

  /**
   * Refresh the auth tokens
   * The API will set new HttpOnly cookies automatically
   * localStorage is updated as fallback
   */
  async refreshToken(refreshToken?: string): Promise<TokenPairResponse> {
    const token = refreshToken || this.getRefreshToken();
    // Even without a refresh token in localStorage, try the request
    // because HttpOnly cookies might contain the token
    const response = await apiClient.post<TokenPairResponse>('/auth/refresh', { 
      refresh_token: token || '' 
    });
    // Update localStorage fallback
    this.setTokens(response);
    return response;
  },

  /**
   * Logout from current session
   * The API will clear auth cookies automatically
   */
  async logoutSession(): Promise<{ message: string }> {
    const refreshToken = this.getRefreshToken();
    try {
      const result = await apiClient.post<{ message: string }>('/auth/logout', { 
        refresh_token: refreshToken || '' 
      });
      // Clear localStorage as well
      this.clearLocalStorage();
      return result;
    } catch (error) {
      console.warn('Server logout failed, continuing with local logout');
      this.clearLocalStorage();
      return { message: 'Logged out locally' };
    }
  },

  /**
   * Logout from all sessions
   * The API will clear auth cookies automatically
   */
  async logoutAll(): Promise<{ message: string }> {
    try {
      const result = await apiClient.post<{ message: string }>('/auth/logout-all');
      this.clearLocalStorage();
      return result;
    } catch (error) {
      this.clearLocalStorage();
      throw error;
    }
  },

  /**
   * Clear local storage tokens (called on logout)
   * Note: HttpOnly cookies are cleared by the server
   */
  clearLocalStorage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  /**
   * @deprecated Use clearLocalStorage() instead
   * Kept for backward compatibility
   */
  logout() {
    this.clearLocalStorage();
  },

  /**
   * Get token from localStorage (fallback for non-cookie environments)
   * Note: In production with HttpOnly cookies, this may return null
   * but authentication still works via cookies
   */
  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  },

  /**
   * Check if user might be authenticated
   * This is a hint - actual auth is validated server-side
   */
  hasAuthHint(): boolean {
    return this.getToken() !== null || hasAuthCookies();
  },

  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  },

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  },

  setRefreshToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  },

  /**
   * Store tokens in localStorage as fallback
   * Note: HttpOnly cookies are set by the server automatically
   */
  setTokens(response: LoginResponse | SignupResponse | TokenPairResponse) {
    const accessToken = 'access_token' in response ? response.access_token : response.token;
    if (accessToken) {
      this.setToken(accessToken);
    }
    
    if (response.refresh_token) {
      this.setRefreshToken(response.refresh_token);
    }
  },

  async listSessions(): Promise<ListSessionsResponse> {
    return apiClient.get<ListSessionsResponse>('/auth/sessions');
  },

  async revokeSession(sessionId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/sessions/revoke', { session_id: sessionId });
  },
};
