import { Injectable, Logger } from '@nestjs/common';

import { NotificationWsGateway } from './notification-ws.gateway';
import { RealtimeNotificationMessage } from './interfaces/realtime-notification.interface';

@Injectable()
export class NotificationRealtimeService {
  private readonly logger = new Logger(NotificationRealtimeService.name);

  constructor(private readonly gateway: NotificationWsGateway) {}

  emitNotificationCreated(payload: RealtimeNotificationMessage) {
    try {
      this.gateway.emitNotificationCreated(payload);
    } catch (err) {
      this.logger.warn(`Failed to emit realtime notification: ${(err as Error).message}`);
    }
  }
}

