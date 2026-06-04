export const WS_NAMESPACE = process.env.WS_NAMESPACE || 'notifications';

export const WS_ROOM_PREFIX = 'user:';

export const WS_EVENTS = {
  NOTIFICATION_CREATED: 'notification.created',
} as const;

