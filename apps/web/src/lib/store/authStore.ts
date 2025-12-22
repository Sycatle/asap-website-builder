import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../api/auth';
import { accountsAPI } from '../api/accounts';
import { websitesAPI } from '../api/websites';
import type { MeResponse, UserData, Website } from '../types';

// Re-export UserData type for backward compatibility
export type { UserData } from '../types';

interface AuthState {
  // Core auth data
  user: MeResponse | null;
  // Extended user data (from account)
  userData: UserData | null;
  // User's website
  website: Website | null;
  
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  fetchFullUserData: (force?: boolean) => Promise<void>;
  updateUserData: (data: Partial<UserData>) => void;
  setWebsite: (website: Website | null) => void;
  getFileUrl: (storedUrl: string) => string;
  clearError: () => void;
}

// ============================================
// STORE
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      userData: null,
      website: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastFetchTime: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login({ email, password });
          authAPI.setToken(response.token);
          
          const user = await authAPI.me();
          set({ user, isAuthenticated: true, isLoading: false });
          
          // Fetch full user data after login
          await get().fetchFullUserData(true);
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
          const response = await authAPI.signup({ 
            email, 
            password
          });
          authAPI.setToken(response.token);
          
          const user = await authAPI.me();
          set({ user, isAuthenticated: true, isLoading: false });
          
          // Fetch full user data after signup
          await get().fetchFullUserData(true);
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
        set({ 
          user: null, 
          userData: null, 
          website: null, 
          isAuthenticated: false,
          lastFetchTime: null,
        });
        window.location.href = '/login';
      },

      fetchUser: async () => {
        const token = authAPI.getToken();
        if (!token) {
          set({ isAuthenticated: false, user: null, userData: null });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authAPI.me();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          authAPI.logout();
          set({ 
            user: null, 
            userData: null, 
            website: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      fetchFullUserData: async (force = false) => {
        const { lastFetchTime, isLoading } = get();
        
        // Check for auth token
        const token = authAPI.getToken();
        if (!token) {
          set({ isAuthenticated: false, user: null, userData: null });
          return;
        }

        // Debounce: don't fetch if already loading or fetched recently
        if (isLoading) return;
        if (!force && lastFetchTime && Date.now() - lastFetchTime < 30000) return;

        set({ isLoading: true, error: null });

        try {
          // Fetch user info
          const meData = await authAPI.me();
          
          // Fetch account data (name, avatar, etc.)
          let accountData: Record<string, any> = {};
          try {
            const account = await accountsAPI.getAccount(meData.id);
            accountData = account.data || {};
          } catch (err) {
            console.error('Failed to load account data:', err);
          }

          // Process avatar URL
          let avatarUrl = accountData.avatar;
          if (avatarUrl && avatarUrl.includes('/files/')) {
            avatarUrl = get().getFileUrl(avatarUrl);
          }

          const userData: UserData = {
            id: meData.id,
            email: meData.email,
            name: accountData.name || meData.email.split('@')[0],
            avatar: avatarUrl,
            plan: meData.plan,
          };

          // Fetch website info
          let website: Website | null = null;
          try {
            const websites = await websitesAPI.list();
            if (websites.length > 0) {
              website = websites[0];
            }
          } catch (err) {
            console.error('Failed to load website:', err);
          }

          set({
            user: meData,
            userData,
            website,
            isAuthenticated: true,
            isLoading: false,
            lastFetchTime: Date.now(),
          });
        } catch (error: any) {
          console.error('Failed to load user data:', error);
          
          // Handle auth errors
          if (error?.status === 401 || error?.status === 403) {
            authAPI.logout();
            set({ 
              user: null, 
              userData: null, 
              website: null, 
              isAuthenticated: false, 
              isLoading: false,
              lastFetchTime: null,
            });
            window.location.href = '/login';
            return;
          }

          set({
            error: error?.message || 'Failed to load user data',
            isLoading: false,
          });
        }
      },

      updateUserData: (data: Partial<UserData>) => {
        const { userData } = get();
        if (userData) {
          set({ userData: { ...userData, ...data } });
        }
      },

      setWebsite: (website: Website | null) => {
        set({ website });
      },

      getFileUrl: (storedUrl: string) => {
        // Security: Don't expose token in URL parameters
        // The API client will handle auth via Authorization header
        // For file downloads, we return the clean URL
        // Note: Ensure your API supports Authorization header for file routes
        const fileIdMatch = storedUrl.match(/\/files\/([a-f0-9-]+)/);
        if (fileIdMatch) {
          const baseUrl = typeof window !== 'undefined' 
            ? (import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api')
            : 'http://localhost:3000/api';
          return `${baseUrl}/files/${fileIdMatch[1]}`;
        }
        return storedUrl;
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'asap-auth-storage',
      partialize: (state) => ({
        // Only persist essential data
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================
// SELECTOR HOOKS
// ============================================

export const useUser = () => {
  return useAuthStore((state) => state.user);
};

export const useUserData = () => {
  return useAuthStore((state) => state.userData);
};

export const useWebsite = () => {
  return useAuthStore((state) => state.website);
};

export const useIsAuthenticated = () => {
  return useAuthStore((state) => state.isAuthenticated);
};

export const useAuthLoading = () => {
  return useAuthStore((state) => state.isLoading);
};

export const useAuthError = () => {
  return useAuthStore((state) => state.error);
};
