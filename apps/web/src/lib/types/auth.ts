/**
 * Auth-related types for the web app
 * Note: Login/signup types are not needed here as authentication
 * is handled by the accounts app
 */

// Response from /auth/me endpoint
export interface MeResponse {
  id: string;
  email: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  created_at: string;
}

// Token pair response from refresh
export interface TokenPairResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// User data for display
export interface UserData {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: string;
}

// Session info for sessions list
export interface SessionInfo {
  id: string;
  user_agent: string | null;
  ip_address: string | null;
  last_used_at: string;
  created_at: string;
  is_current: boolean;
}

// Response from /auth/sessions
export interface ListSessionsResponse {
  sessions: SessionInfo[];
}
