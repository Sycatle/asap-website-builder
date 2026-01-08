/**
 * GitHub Sync Extension - Shared Types
 */

export interface GitHubProfile {
  login: string;
  name?: string;
  avatar_url: string;
  bio?: string;
  location?: string;
  company?: string;
  blog?: string;
  twitter_username?: string;
  email?: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at?: string;
  hireable?: boolean;
}

export interface GitHubRepo {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  url: string;
  homepage?: string;
  language?: string;
  stars: number;
  forks: number;
  topics?: string[];
  is_fork: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  pushed_at?: string;
}

export interface GitHubGist {
  id: string;
  description?: string;
  url: string;
  files: { filename: string; language?: string; size: number }[];
  file_count: number;
  language?: string;
  comments: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubOrg {
  id: string;
  login: string;
  name: string;
  description?: string;
  avatar_url: string;
  url: string;
}

export interface GitHubStarred {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  url: string;
  stars: number;
  language?: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface LanguageStats {
  name: string;
  repo_count: number;
  total_stars: number;
  total_forks: number;
  percentage: number;
  rank: number;
}

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface SyncStatus {
  status: "idle" | "syncing" | "success" | "error";
  lastSync?: string;
  repoCount?: number;
  error?: string;
}
