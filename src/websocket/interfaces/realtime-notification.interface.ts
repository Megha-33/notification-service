import { NotificationPriority, NotificationStatus } from "src/module/notification/enums/notification.enum";


export type RealtimeNotificationMessage = {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  priority?: NotificationPriority;
  status: NotificationStatus;
  createdAt?: string;
  meta?: Record<string, unknown>;
};

