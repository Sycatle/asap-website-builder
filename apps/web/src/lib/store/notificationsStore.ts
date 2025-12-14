import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notificationsAPI, type Notification, type NotificationFilters } from '../api/notifications';

// ============================================
// NOTIFICATIONS STORE CONFIGURATION
// ============================================

const POLL_INTERVAL = 15000; // 15 seconds - faster polling for better discoverability
const NOTIFICATIONS_LIMIT = 30;

// ============================================
// TYPES
// ============================================

interface NotificationsState {
  // Data
  notifications: Notification[];
  unreadCount: number;
  total: number;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  hasNewNotifications: boolean; // For visual indicator
  lastFetchTime: number | null;
  
  // Settings
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

interface NotificationsActions {
  // Fetching
  fetchNotifications: (filters?: NotificationFilters, force?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markMultipleAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  
  // UI Actions
  clearNewNotificationsIndicator: () => void;
  
  // Settings
  toggleSound: () => void;
  toggleVibration: () => void;
  
  // Polling
  startPolling: () => () => void;
  
  // Utilities
  reset: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  total: 0,
  isLoading: false,
  error: null,
  hasNewNotifications: false,
  lastFetchTime: null,
  soundEnabled: true,
  vibrationEnabled: true,
};

// ============================================
// STORE
// ============================================

export const useNotificationsStore = create<NotificationsState & NotificationsActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========== FETCH NOTIFICATIONS ==========
      fetchNotifications: async (filters?: NotificationFilters, force = false) => {
        const { lastFetchTime, isLoading } = get();
        
        // Debounce: don't fetch if already loading or fetched recently (within 5 seconds)
        if (isLoading) return;
        if (!force && lastFetchTime && Date.now() - lastFetchTime < 5000) return;

        set({ isLoading: true, error: null });

        try {
          const response = await notificationsAPI.list({
            limit: NOTIFICATIONS_LIMIT,
            ...filters,
          });

          const previousUnreadCount = get().unreadCount;
          const hasNew = response.unread_count > previousUnreadCount && previousUnreadCount >= 0;

          set({
            notifications: response.notifications,
            unreadCount: response.unread_count,
            total: response.total,
            hasNewNotifications: hasNew || get().hasNewNotifications,
            lastFetchTime: Date.now(),
            isLoading: false,
          });

          // Play notification sound/vibration for new notifications
          if (hasNew && previousUnreadCount >= 0) {
            const { soundEnabled, vibrationEnabled } = get();
            if (soundEnabled) {
              playNotificationSound();
            }
            if (vibrationEnabled && 'vibrate' in navigator) {
              navigator.vibrate([100, 50, 100]);
            }
          }
        } catch (err) {
          console.error('Failed to fetch notifications:', err);
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch notifications',
            isLoading: false,
          });
        }
      },

      // ========== FETCH UNREAD COUNT ONLY ==========
      fetchUnreadCount: async () => {
        try {
          const count = await notificationsAPI.getUnreadCount();
          const previousCount = get().unreadCount;
          
          if (count > previousCount && previousCount >= 0) {
            const { soundEnabled, vibrationEnabled } = get();
            
            set({ 
              unreadCount: count, 
              hasNewNotifications: true,
            });
            
            if (soundEnabled) {
              playNotificationSound();
            }
            if (vibrationEnabled && 'vibrate' in navigator) {
              navigator.vibrate([100, 50, 100]);
            }
          } else {
            set({ unreadCount: count });
          }
        } catch (err) {
          console.error('Failed to fetch unread count:', err);
        }
      },

      // ========== MARK AS READ ==========
      markAsRead: async (notificationId: string) => {
        try {
          await notificationsAPI.markOneAsRead(notificationId);
          
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === notificationId
                ? { ...n, read: true, read_at: new Date().toISOString() }
                : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          }));
        } catch (err) {
          console.error('Failed to mark notification as read:', err);
          throw err;
        }
      },

      // ========== MARK MULTIPLE AS READ ==========
      markMultipleAsRead: async (notificationIds: string[]) => {
        try {
          await notificationsAPI.markAsRead({ notification_ids: notificationIds });
          
          set((state) => {
            const unreadToMark = state.notifications.filter(
              (n) => notificationIds.includes(n.id) && !n.read
            ).length;
            
            return {
              notifications: state.notifications.map((n) =>
                notificationIds.includes(n.id)
                  ? { ...n, read: true, read_at: new Date().toISOString() }
                  : n
              ),
              unreadCount: Math.max(0, state.unreadCount - unreadToMark),
            };
          });
        } catch (err) {
          console.error('Failed to mark notifications as read:', err);
          throw err;
        }
      },

      // ========== MARK ALL AS READ ==========
      markAllAsRead: async () => {
        try {
          await notificationsAPI.markAllAsRead();
          
          set((state) => ({
            notifications: state.notifications.map((n) => ({
              ...n,
              read: true,
              read_at: new Date().toISOString(),
            })),
            unreadCount: 0,
            hasNewNotifications: false,
          }));
        } catch (err) {
          console.error('Failed to mark all as read:', err);
          throw err;
        }
      },

      // ========== DELETE NOTIFICATION ==========
      deleteNotification: async (notificationId: string) => {
        try {
          const notification = get().notifications.find((n) => n.id === notificationId);
          await notificationsAPI.delete(notificationId);
          
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== notificationId),
            total: state.total - 1,
            unreadCount: notification && !notification.read
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
          }));
        } catch (err) {
          console.error('Failed to delete notification:', err);
          throw err;
        }
      },

      // ========== CLEAR NEW NOTIFICATIONS INDICATOR ==========
      clearNewNotificationsIndicator: () => {
        set({ hasNewNotifications: false });
      },

      // ========== TOGGLE SETTINGS ==========
      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      toggleVibration: () => {
        set((state) => ({ vibrationEnabled: !state.vibrationEnabled }));
      },

      // ========== START POLLING ==========
      startPolling: () => {
        // Initial fetch
        get().fetchNotifications();

        let pollIntervalId: NodeJS.Timeout | null = null;
        let isVisible = true;

        // Only poll when tab is visible
        const handleVisibilityChange = () => {
          isVisible = document.visibilityState === 'visible';
          
          if (isVisible) {
            // Fetch immediately when tab becomes visible
            get().fetchUnreadCount();
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Start polling
        pollIntervalId = setInterval(() => {
          if (isVisible) {
            get().fetchUnreadCount();
          }
        }, POLL_INTERVAL);

        // Return cleanup function
        return () => {
          if (pollIntervalId) {
            clearInterval(pollIntervalId);
          }
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      },

      // ========== RESET ==========
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'asap-notifications',
      version: 1,
      partialize: (state) => ({
        // Only persist settings, not data
        soundEnabled: state.soundEnabled,
        vibrationEnabled: state.vibrationEnabled,
      }),
    }
  )
);

// ============================================
// HELPER FUNCTIONS
// ============================================

// Play notification sound
function playNotificationSound() {
  try {
    // Use a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (err) {
    console.debug('Could not play notification sound:', err);
  }
}

// ============================================
// SELECTOR HOOKS
// ============================================

// Stable empty array for selectors
const EMPTY_NOTIFICATIONS: Notification[] = [];

// Get all notifications
export const useNotifications = () => {
  return useNotificationsStore((state) => state.notifications || EMPTY_NOTIFICATIONS);
};

// Get unread count
export const useUnreadCount = () => {
  return useNotificationsStore((state) => state.unreadCount);
};

// Get only unread notifications
export const useUnreadNotifications = () => {
  return useNotificationsStore((state) => 
    state.notifications.filter((n) => !n.read)
  );
};

// Get loading state
export const useNotificationsLoading = () => {
  return useNotificationsStore((state) => state.isLoading);
};

// Get error state  
export const useNotificationsError = () => {
  return useNotificationsStore((state) => state.error);
};

// Check if there are new notifications
export const useHasNewNotifications = () => {
  return useNotificationsStore((state) => state.hasNewNotifications);
};

// Get notification settings
export const useNotificationSettings = () => {
  return useNotificationsStore((state) => ({
    soundEnabled: state.soundEnabled,
    vibrationEnabled: state.vibrationEnabled,
  }));
};
