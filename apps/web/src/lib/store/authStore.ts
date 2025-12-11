import { create } from 'zustand';
import { authAPI, type MeResponse } from '../api/auth';

interface AuthState {
  user: MeResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, slug: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login({ email, password });
      authAPI.setToken(response.token);
      
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

  signup: async (email: string, password: string, slug: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.signup({ 
        email, 
        password, 
        portfolio_slug: slug  // Backend expects 'portfolio_slug'
      });
      authAPI.setToken(response.token);
      
      set({ 
        user: { 
          id: response.user.id, 
          email: response.user.email, 
          tenant_id: response.tenant.id 
        }, 
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.message || 'Signup failed', 
        isLoading: false 
      });
      throw error;
    }
  },

  logout: () => {
    authAPI.logout();
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    const token = authAPI.getToken();
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await authAPI.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      authAPI.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
