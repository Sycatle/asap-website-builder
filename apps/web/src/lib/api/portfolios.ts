import { apiClient } from './client';

export interface Portfolio {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  tagline: string;
  status: 'draft' | 'published';
  metadata?: Record<string, any>;
  portfolio_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UpdatePortfolioRequest {
  title?: string;
  tagline?: string;
  metadata?: Record<string, any>;
}

export interface UpdateGitHubIntegrationRequest {
  github_username: string;
  github_token?: string | null;
}

export const portfoliosAPI = {
  async list(): Promise<Portfolio[]> {
    return apiClient.get<Portfolio[]>('/portfolios');
  },

  async get(id: string): Promise<Portfolio> {
    return apiClient.get<Portfolio>(`/portfolios/${id}`);
  },

  async update(id: string, data: UpdatePortfolioRequest): Promise<void> {
    return apiClient.put<void>(`/portfolios/${id}`, data);
  },

  async publish(id: string): Promise<void> {
    return apiClient.post<void>(`/portfolios/${id}/publish`);
  },

  async getPublic(slug: string): Promise<Portfolio> {
    return apiClient.get<Portfolio>(`/public/portfolios/${slug}`);
  },

  async updateGitHubIntegration(userId: string, data: UpdateGitHubIntegrationRequest): Promise<void> {
    return apiClient.put<void>(`/users/${userId}/integrations/github`, data);
  },
};
