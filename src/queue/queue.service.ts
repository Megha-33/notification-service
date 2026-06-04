import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { NOTIFICATION_QUEUE, SEND_EMAIL_JOB, SEND_PUSH_JOB } from './queue.constants';
import { NotificationPayload } from 'src/firebase/notification.interface';
import { SendEmailOptions } from 'src/email/interfaces/send-email.interface';


@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(@InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue) { }

  async enqueuePushNotification(data: NotificationPayload): Promise<void> {
    this.logger.log('Queue enqueue started', {
      userId: data.userId,
      channels: data.channels,
      type: data.type,
      priority: data.priority,
    });

    try {
      const job = await this.notificationQueue.add(SEND_PUSH_JOB, data, {
        priority: data.priority === 'HIGH' ? 1 : 5,
        removeOnComplete: true,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });

      this.logger.log('Queue enqueue completed', {
        jobId: job.id,
        userId: data.userId,
        channels: data.channels,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Queue enqueue failed: ${message} | userId=${data.userId} | channels=${(data.channels ?? []).join(',')} | type=${data.type}`,
        stack,
      );
      throw error;
    }
  }

  async enqueueEmail(data: SendEmailOptions) {
    await this.notificationQueue.add(SEND_EMAIL_JOB, data, {
      priority: 5,
      removeOnComplete: true,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
