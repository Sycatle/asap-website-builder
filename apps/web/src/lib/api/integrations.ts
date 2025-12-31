import { apiClient } from './client';

export interface GitHubProject {
  name: string;
  description: string;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubIntegrationData {
  source: string;
  projects: GitHubProject[];
  generated_at: string;
}

export interface IntegrationConfig {
  github?: {
    username: string;
    token?: string;
  };
}

export interface IntegrationWebsiteData {
  source?: string;
  projects?: GitHubProject[];
  generated_at?: string;
  [key: string]: any;
}

export const integrationsAPI = {
  // Get account integrations config
  async getConfig(accountId: string): Promise<{ integrations: IntegrationConfig }> {
    return apiClient.get<{ integrations: IntegrationConfig }>(`/accounts/${accountId}/integrations`);
  },

  // Update GitHub integration
  async updateGitHub(accountId: string, data: { github_username: string; github_token?: string }): Promise<{ message: string; username: string }> {
    return apiClient.put<{ message: string; username: string }>(`/accounts/${accountId}/integrations/github`, data);
  },

  // Get website data (contains GitHub projects data)
  async getWebsiteData(websiteId: string): Promise<IntegrationWebsiteData> {
    const website = await apiClient.get<{ data: IntegrationWebsiteData }>(`/websites/${websiteId}`);
    return website.data || {};
  },
};
