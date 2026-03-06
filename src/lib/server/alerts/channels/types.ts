/**
 * Notification Channel Types
 *
 * Defines the interface (port) for notification channels.
 * Each channel (Telegram, Browser Push, Email) implements this interface.
 */

export type { INotificationChannel, NotificationPayload, SendResult } from '../model/types';
