/**
 * Authentication and user-related types
 */

// ============================================
// AUTH REQUEST/RESPONSE TYPES
// ============================================

export interface SignupRequest {
  email: string;
  password: string;
}

export interface SignupResponse {
  token: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  account: {
    id: string;
    email: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  token: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface TokenPairResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
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

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

// ============================================
// SESSION MANAGEMENT TYPES
// ============================================

export interface SessionInfo {
  id: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
  is_current: boolean;
}

export interface ListSessionsResponse {
  sessions: SessionInfo[];
}

export interface RevokeSessionRequest {
  session_id: string;
}
