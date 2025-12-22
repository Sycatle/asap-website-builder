/**
 * Authentication and user-related types
 */

// ============================================
// AUTH REQUEST/RESPONSE TYPES
// ============================================

export interface SignupRequest {
  email: string;
  password: string;
  portfolio_slug?: string;  // Optional - website is created during onboarding
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

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdateGitHubIntegrationRequest {
  github_username: string;
  github_token?: string | null;
}

// ============================================
// USER DATA TYPES
// ============================================

export interface UserData {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan?: string;
}
