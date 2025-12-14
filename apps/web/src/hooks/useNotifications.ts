import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  notificationsAPI, 
  type Notification, 
  type NotificationListResponse,
  type NotificationFilters,
  type NotificationSettings,
  subscribeToPushNotifications,
  checkPushPermission,
  requestPushPermission,
} from '@/lib/api/notifications';

// ============================================
// useNotifications - Hook for notifications
// ============================================

interface UseNotificationsOptions {
  autoFetch?: boolean;
  filters?: NotificationFilters;
  pollInterval?: number; // ms, 0 to disable
}

interface UseNotificationsReturn {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { autoFetch = true, filters = {}, pollInterval = 0 } = options;
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  
  const hasFetched = useRef(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const limit = filters.limit || 20;

  const fetchData = useCallback(async (resetOffset = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentOffset = resetOffset ? 0 : offset;
      const response = await notificationsAPI.list({
        ...filters,
        limit,
        offset: currentOffset,
      });
      
      if (resetOffset) {
        setNotifications(response.notifications);
        setOffset(limit);
      } else {
        setNotifications(prev => [...prev, ...response.notifications]);
        setOffset(prev => prev + limit);
      }
      
      setTotal(response.total);
      setUnreadCount(response.unread_count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  }, [filters, limit, offset]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && !hasFetched.current) {
      hasFetched.current = true;
      fetchData(true);
    }
  }, [autoFetch, fetchData]);

  // Polling
  useEffect(() => {
    if (pollInterval > 0) {
      pollRef.current = setInterval(async () => {
        try {
          const count = await notificationsAPI.getUnreadCount();
          setUnreadCount(count);
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, pollInterval);

      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
        }
      };
    }
  }, [pollInterval]);

  const refetch = useCallback(async (force = true) => {
    if (force) {
      hasFetched.current = false;
    }
    await fetchData(true);
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    if (!isLoading && notifications.length < total) {
      await fetchData(false);
    }
  }, [fetchData, isLoading, notifications.length, total]);

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationsAPI.markAsRead({ notification_ids: notificationIds });
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id) 
            ? { ...n, read: true, read_at: new Date().toISOString() } 
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationsAPI.delete(notificationId);
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotal(prev => prev - 1);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
      throw err;
    }
  }, [notifications]);

  return {
    notifications,
    total,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    hasMore: notifications.length < total,
  };
}

// ============================================
// useUnreadCount - Lightweight hook for count only
// ============================================

interface UseUnreadCountReturn {
  count: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useUnreadCount(pollInterval = 30000): UseUnreadCountReturn {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const newCount = await notificationsAPI.getUnreadCount();
      setCount(newCount);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();

    if (pollInterval > 0) {
      pollRef.current = setInterval(fetchCount, pollInterval);

      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
        }
      };
    }
  }, [fetchCount, pollInterval]);

  return {
    count,
    isLoading,
    refetch: fetchCount,
  };
}

// ============================================
// useNotificationSettings - Hook for settings
// ============================================

interface UseNotificationSettingsReturn {
  settings: NotificationSettings | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (settings: NotificationSettings) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotificationSettings(): UseNotificationSettingsReturn {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notificationsAPI.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch notification settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings: NotificationSettings) => {
    try {
      const updated = await notificationsAPI.updateSettings(newSettings);
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update notification settings:', err);
      throw err;
    }
  }, []);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
}

// ============================================
// usePushNotifications - Hook for push subscription
// ============================================

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      
      if (supported) {
        const perm = await checkPushPermission();
        setPermission(perm);
        
        // Check if already subscribed
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (err) {
          console.error('Error checking subscription:', err);
        }
      }
      
      setIsLoading(false);
    };

    checkSupport();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const granted = await requestPushPermission();
      setPermission(granted ? 'granted' : 'denied');
      
      if (!granted) {
        return false;
      }
      
      const subscription = await subscribeToPushNotifications();
      const success = !!subscription;
      setIsSubscribed(success);
      return success;
    } catch (err) {
      console.error('Failed to subscribe to push:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await notificationsAPI.unsubscribePush(subscription.endpoint);
      }
      
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe from push:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
  };
}
