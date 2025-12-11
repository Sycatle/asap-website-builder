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

export interface WebsiteData {
  source?: string;
  projects?: GitHubProject[];
  generated_at?: string;
  [key: string]: any;
}

export const integrationsAPI = {
  // Get user integrations config
  async getConfig(userId: string): Promise<{ integrations: IntegrationConfig }> {
    return apiClient.get<{ integrations: IntegrationConfig }>(`/users/${userId}/integrations`);
  },

  // Update GitHub integration
  async updateGitHub(userId: string, data: { github_username: string; github_token?: string }): Promise<{ message: string; username: string }> {
    return apiClient.put<{ message: string; username: string }>(`/users/${userId}/integrations/github`, data);
  },

  // Get website data (contains GitHub projects data)
  async getWebsiteData(websiteId: string): Promise<WebsiteData> {
    const website = await apiClient.get<{ data: WebsiteData }>(`/websites/${websiteId}`);
    return website.data || {};
  },
};
