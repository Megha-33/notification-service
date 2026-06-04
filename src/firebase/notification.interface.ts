import { SendEmailOptions } from "src/email/interfaces/send-email.interface";
import { NotificationChannel, NotificationPriority, NotificationType } from "../module/notification/enums/notification.enum";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  iconUrl?: string;
  deepLink?: string;
  actions?: {
    id: string;
    label: string;
  }[];
  priority: NotificationPriority;
  metadata?: Record<string, unknown>;
  channels?: NotificationChannel[];
  emailNotification?: SendEmailOptions;

}

export interface FcmMulticastMessage {
  tokens: string[];

  notification?: {
    title: string;
    body: string;
    imageUrl?: string;
  };

  data?: Record<string, string>;

  android?: {
    priority?: 'high' | 'normal';
    ttl?: number;
    collapseKey?: string;
    notification?: {
      channelId?: string;
      sound?: string;
      clickAction?: string;
      imageUrl?: string;
    };
  };

  apns?: {
    headers?: {
      'apns-priority'?: '5' | '10';
      'apns-topic'?: string;
    };
    payload?: {
      aps: {
        sound?: string;
        badge?: number;
        contentAvailable?: boolean;
        mutableContent?: boolean;
      };
    };
  };

  webpush?: {
    headers?: {
      Urgency?: 'very-low' | 'low' | 'normal' | 'high';
    };
    notification?: {
      icon?: string;
      badge?: string;
    };
  };
}