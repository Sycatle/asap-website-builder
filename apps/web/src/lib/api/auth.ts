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
  RefreshTokenRequest,
  TokenPairResponse,
  UpdateGitHubIntegrationRequest,
} from '../types';

// Re-export types for backward compatibility
export type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
  TokenPairResponse,
  UpdateGitHubIntegrationRequest,
};

// Storage keys
const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

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
   * Store tokens from login/signup response
   */
  setTokens(response: LoginResponse | SignupResponse) {
    // Prefer access_token if available (new API), fallback to token (legacy)
    const accessToken = response.access_token || response.token;
    this.setToken(accessToken);
    
    if (response.refresh_token) {
      this.setRefreshToken(response.refresh_token);
    }
  },

  async updateGitHubIntegration(accountId: string, data: UpdateGitHubIntegrationRequest): Promise<void> {
    return apiClient.put<void>(`/accounts/${accountId}/integrations/github`, data);
  },
};
