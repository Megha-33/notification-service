import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { NotificationPayload } from './notification.interface';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  @OnEvent('notification.send', { async: true })
  async handleNotification(payload: NotificationPayload) {
    this.logger.log('Notification event received', {
      userId: payload.userId,
      channels: payload.channels,
      type: payload.type,
    });

    try {
      const result = await this.firebaseService.sendNotification(payload);

      this.logger.log('Notification event processed', {
        userId: payload.userId,
        notificationId: result?.data?._id?.toString?.() ?? result?.data?._id,
        status: result?.data?.status,
        channels: payload.channels,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Notification event processing failed: ${message} | userId=${payload.userId} | type=${payload.type} | channels=${(payload.channels ?? []).join(',')}`,
        stack,
      );

      throw error;
    }
  }
}
