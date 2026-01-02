import { apiClient } from './client';
import type {
  MeResponse,
  TokenPairResponse,
  ListSessionsResponse,
} from '../types';

// Storage keys
const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Auth API for the web app.
 * Note: Login, signup, password reset are handled by the accounts app.
 * This module only handles token management, session info, and logout.
 */
export const authAPI = {
  /**
   * Get current user info
   */
  async me(): Promise<MeResponse> {
    return apiClient.get<MeResponse>('/auth/me');
  },

  /**
   * Refresh the access token using a refresh token
   */
  async refreshToken(refreshToken?: string): Promise<TokenPairResponse> {
    const token = refreshToken || this.getRefreshToken();
    if (!token) {
      throw new Error('No refresh token available');
    }
    return apiClient.post<TokenPairResponse>('/auth/refresh', { refresh_token: token });
  },

  /**
   * Logout from current session (revokes current refresh token)
   */
  async logoutSession(): Promise<{ message: string }> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        return await apiClient.post<{ message: string }>('/auth/logout', { refresh_token: refreshToken });
      } catch (error) {
        // Continue with local logout even if server request fails
        console.warn('Server logout failed, continuing with local logout');
      }
    }
    return { message: 'Logged out locally' };
  },

  /**
   * Logout from all sessions (revokes all refresh tokens)
   */
  async logoutAll(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/logout-all');
  },

  /**
   * Local logout - clears all stored tokens
   */
  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
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
   * List all active sessions for the current user
   */
  async listSessions(): Promise<ListSessionsResponse> {
    return apiClient.get<ListSessionsResponse>('/auth/sessions');
  },

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/sessions/revoke', { session_id: sessionId });
  },
};
