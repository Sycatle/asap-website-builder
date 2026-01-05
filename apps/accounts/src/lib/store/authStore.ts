import { create } from 'zustand';
import { authAPI } from '../api/auth';
import type { MeResponse } from '../types';

interface AuthState {
  user: MeResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: (fromAllDevices?: boolean) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login({ email, password, remember_me: rememberMe });
      authAPI.setTokens(response);
      
      const user = await authAPI.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Login failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  signup: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.signup({ email, password });
      authAPI.setTokens(response);
      
      const user = await authAPI.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Signup failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: async (fromAllDevices = false) => {
    try {
      if (fromAllDevices) {
        await authAPI.logoutAll();
      } else {
        await authAPI.logoutSession();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      authAPI.logout();
      set({ user: null, isAuthenticated: false });
    }
  },

  refreshToken: async () => {
    try {
      const response = await authAPI.refreshToken();
      // Tokens are now stored in both cookies (by server) and localStorage (fallback)
      return true;
    } catch {
      set({ user: null, isAuthenticated: false });
      return false;
    }
  },

  fetchUser: async () => {
    // Check if user might be authenticated (localStorage or cookies)
    const hasAuth = authAPI.hasAuthHint();
    if (!hasAuth) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    
    try {
      // Try to fetch user - this will use cookies for auth
      const user = await authAPI.me();
      set({ user, isAuthenticated: true });
    } catch {
      // Try to refresh token (might work if refresh cookie is valid)
      const refreshed = await get().refreshToken();
      if (!refreshed) {
        authAPI.clearLocalStorage();
        set({ user: null, isAuthenticated: false });
      } else {
        // Retry fetching user after refresh
        try {
          const user = await authAPI.me();
          set({ user, isAuthenticated: true });
        } catch {
          authAPI.clearLocalStorage();
          set({ user: null, isAuthenticated: false });
        }
      }
    }
  },

  clearError: () => set({ error: null }),
}));
