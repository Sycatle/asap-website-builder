/**
 * Notification-related types
 */

// ============================================
// NOTIFICATION TYPES
// ============================================

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
  | 'extension' 
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
