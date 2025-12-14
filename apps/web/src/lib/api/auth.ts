import { apiClient } from './client';

export interface SignupRequest {
  email: string;
  password: string;
  portfolio_slug: string;  // Backend still uses 'portfolio_slug'
}

export interface SignupResponse {
  token: string;
  account: {
    id: string;
    email: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface MeResponse {
  id: string;
  email: string;
  plan: string;
}

export interface UpdateGitHubIntegrationRequest {
  github_username: string;
  github_token?: string | null;
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

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  },

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  },

  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  },

  async updateGitHubIntegration(accountId: string, data: UpdateGitHubIntegrationRequest): Promise<void> {
    return apiClient.put<void>(`/accounts/${accountId}/integrations/github`, data);
  },
};
