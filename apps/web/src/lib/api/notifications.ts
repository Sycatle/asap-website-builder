// Notifications API client

import { apiClient } from './client';

// Types
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  read: boolean;
  action_url?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  read_at?: string;
}

export type NotificationCategory = 
  | 'system' 
  | 'account' 
  | 'website' 
  | 'module' 
  | 'billing' 
  | 'analytics' 
  | 'security';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface NotificationFilters {
  category?: NotificationCategory;
  read?: boolean;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
}

export interface MarkReadRequest {
  notification_ids?: string[];
  all?: boolean;
}

export interface MarkReadResponse {
  updated: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
}

export interface PushSubscription {
  id: string;
  endpoint: string;
  created_at: string;
}

export interface NotificationSettings {
  push_enabled: boolean;
  email_enabled: boolean;
  enabled_categories: NotificationCategory[];
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

export interface VapidPublicKeyResponse {
  public_key: string;
}

// API functions
export const notificationsAPI = {
  /**
   * List notifications with optional filters
   */
  async list(filters?: NotificationFilters): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.read !== undefined) params.append('read', String(filters.read));
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.offset) params.append('offset', String(filters.offset));
    
    const query = params.toString();
    return apiClient.get<NotificationListResponse>(`/notifications${query ? `?${query}` : ''}`);
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return response.count;
  },

  /**
   * Get a single notification
   */
  async get(notificationId: string): Promise<Notification> {
    return apiClient.get<Notification>(`/notifications/${notificationId}`);
  },

  /**
   * Mark notifications as read
   */
  async markAsRead(request: MarkReadRequest): Promise<MarkReadResponse> {
    return apiClient.post<MarkReadResponse>('/notifications/mark-read', request);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<MarkReadResponse> {
    return apiClient.post<MarkReadResponse>('/notifications/mark-read', { all: true });
  },

  /**
   * Mark a single notification as read
   */
  async markOneAsRead(notificationId: string): Promise<void> {
    await apiClient.post(`/notifications/${notificationId}/read`, {});
  },

  /**
   * Delete a notification
   */
  async delete(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  },

  // Push subscription methods
  /**
   * Subscribe to push notifications
   */
  async subscribePush(subscription: PushSubscriptionRequest): Promise<PushSubscription> {
    return apiClient.post<PushSubscription>('/notifications/push/subscribe', subscription);
  },

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribePush(endpoint: string): Promise<void> {
    await apiClient.post('/notifications/push/unsubscribe', { endpoint });
  },

  /**
   * Get VAPID public key for push subscription
   */
  async getVapidPublicKey(): Promise<string> {
    const response = await apiClient.get<VapidPublicKeyResponse>('/notifications/push/vapid-key');
    return response.public_key;
  },

  // Settings methods
  /**
   * Get notification settings
   */
  async getSettings(): Promise<NotificationSettings> {
    return apiClient.get<NotificationSettings>('/notifications/settings');
  },

  /**
   * Update notification settings
   */
  async updateSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    return apiClient.put<NotificationSettings>('/notifications/settings', settings);
  },
};

// Helper function to convert VAPID key
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Push notification helper
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return null;
  }

  try {
    // Get VAPID public key
    const vapidPublicKey = await notificationsAPI.getVapidPublicKey();
    if (!vapidPublicKey) {
      console.error('No VAPID public key available');
      return null;
    }

    // Wait for service worker
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Extract keys
    const p256dh = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    if (!p256dh || !auth) {
      console.error('Failed to get push subscription keys');
      return null;
    }

    // Register with backend
    const pushSub = await notificationsAPI.subscribePush({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
        auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
      },
      user_agent: navigator.userAgent,
    });

    return pushSub;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
}

// Check push notification permission
export async function checkPushPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// Request push notification permission
export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
