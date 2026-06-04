import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Types } from 'mongoose';
import { DeviceRepository } from '../module/devices/repositories/device.repositories';
import { NotificationRepository } from '../module/notification/repositories/notification.repositories';
import { NotificationChannel, NotificationPriority, NotificationStatus } from '../module/notification/enums/notification.enum';
import { FcmMulticastMessage, NotificationPayload } from './notification.interface';
import { NotificationDocument } from 'src/module/notification/schemas/notification.schema';
import { SendEmailOptions } from 'src/email/interfaces/send-email.interface';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging?: admin.messaging.Messaging;
  private initialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationRepository: NotificationRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly emailService: EmailService,
  ) { }

  onModuleInit(): void {
    this.logger.log('Initializing Firebase Admin SDK');

    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    if (!projectId || !clientEmail || !privateKey || privateKey.includes('replace-me')) {
      this.logger.warn('Firebase Admin SDK skipped: credentials are missing or placeholders');
      return;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    this.messaging = admin.messaging();
    this.initialized = true;
    this.logger.log('Firebase Admin SDK initialized');
  }

  async sendNotification(payload: NotificationPayload) {

    let notificationDoc: NotificationDocument | null = null;

    const channels = payload.channels?.length
      ? payload.channels
      : [NotificationChannel.IN_APP, NotificationChannel.PUSH];

    this.logger.log('Firebase notification send started', {
      userId: payload.userId,
      channels,
      type: payload.type,
      priority: payload.priority ?? NotificationPriority.LOW,
    });

    try {
      const channelStatus = Object.fromEntries(
        channels.map((c) => [c, NotificationStatus.PENDING]),
      );

      notificationDoc = await this.notificationRepository.create({
        userId: new Types.ObjectId(payload.userId),
        title: payload.title,
        body: payload.body,
        type: payload.type,
        priority: payload.priority ?? NotificationPriority.LOW,
        channels,
        channelStatus,
        status: NotificationStatus.PENDING,
        metadata: payload.metadata,
        imageUrl: payload.imageUrl,
        iconUrl: payload.iconUrl,
        deepLink: payload.deepLink,
        actions: payload.actions,
      });


      console.log("notificationDoc", notificationDoc);

      // Run channels in parallel
      await Promise.allSettled(
        channels.map((channel) =>
          this.processChannel(channel, payload, notificationDoc!._id),
        ),
      );
      this.logger.log('Notification record created', {
        userId: payload.userId,
        notificationId: notificationDoc._id.toString(),
        channels,
      });

      const updatedDoc = await this.notificationRepository.findById(
        notificationDoc._id.toString(),
      );

      if (!updatedDoc) {
        throw new NotFoundException('Notification not found after update');
      }
      const plainDoc = updatedDoc.toObject();
      const statuses = Object.values(plainDoc.channelStatus);

      let finalStatus: NotificationStatus;

      if (statuses.every((s) => s === NotificationStatus.SENT)) {
        finalStatus = NotificationStatus.SENT;
      } else if (statuses.some((s) => s === NotificationStatus.SENT)) {
        finalStatus = NotificationStatus.PARTIAL;
      } else {
        finalStatus = NotificationStatus.FAILED;
      }

      await this.notificationRepository.updateStatus(
        notificationDoc._id.toString(),
        finalStatus,
      );

      this.logger.log('Firebase notification send completed', {
        userId: payload.userId,
        notificationId: notificationDoc._id.toString(),
        status: finalStatus,
      });

      return {
        success: true,
        message: 'Notification processed',
        data: updatedDoc,
      };
    } catch (error) {
      if (notificationDoc?._id) {
        await this.notificationRepository.updateStatus(
          notificationDoc._id.toString(),
          NotificationStatus.FAILED,
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Notification failed: ${message} | userId=${payload.userId} | notificationId=${notificationDoc?._id?.toString() ?? 'unknown'} | channels=${channels.join(',')}`,
        stack,
      );
      throw error;
    }
  }

  private async processChannel(
    channel: NotificationChannel,
    payload: NotificationPayload,
    notificationId: Types.ObjectId,
  ) {
    try {
      switch (channel) {
        case NotificationChannel.IN_APP:
          await this.notificationRepository.updateChannelStatus(
            notificationId.toString(),
            channel,
            NotificationStatus.SENT,
          );
          break;

        case NotificationChannel.PUSH:
          await this.handlePushChannel(payload, notificationId);
          break;

        case NotificationChannel.EMAIL:
          console.log('EMAIL channel not implemented yet');
          await this.notificationRepository.updateChannelStatus(
            notificationId.toString(),
            channel,
            NotificationStatus.SENT,
          );
          break;
        case NotificationChannel.SMS:
          console.log('SMS channel not implemented yet');
          await this.notificationRepository.updateChannelStatus(
            notificationId.toString(),
            channel,
            NotificationStatus.SENT,
          );
          break;


        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
    } catch (err: unknown) {
      await this.notificationRepository.updateChannelStatus(
        notificationId.toString(),
        channel,
        NotificationStatus.FAILED,
      );

      this.logger.error(`Channel ${channel} failed: ${(err as Error).message}`);
    }
  }

  private async handlePushChannel(
    payload: NotificationPayload,
    notificationId: Types.ObjectId,
  ) {
    this.logger.log('Push channel send started', {
      userId: payload.userId,
      notificationId: notificationId.toString(),
      channel: NotificationChannel.PUSH,
      priority: payload.priority,
    });

    try {
      if (!this.messaging || !this.initialized) {
        throw new Error('Firebase messaging client is not initialized');
      }

      const userObjectId = new Types.ObjectId(payload.userId);

      let tokens: string[] = [];

      if (payload.priority === NotificationPriority.LOW) {
        const device = await this.deviceRepository.getLastActiveDevice(userObjectId);
        if (device?.fcmToken) tokens = [device.fcmToken];
      } else {
        tokens = await this.deviceRepository.getActiveFcmTokensByUserId(userObjectId);
      }

      if (!tokens.length) {
        throw new Error('No active devices found');
      }

      this.logger.log('Sending push notification via Firebase', {
        userId: payload.userId,
        notificationId: notificationId.toString(),
        channel: NotificationChannel.PUSH,
        tokenCount: tokens.length,
      });

      const chunkSize = 500;
      const chunks: string[][] = [];

      for (let i = 0; i < tokens.length; i += chunkSize) {
        chunks.push(tokens.slice(i, i + chunkSize));
      }

      let totalSuccess = 0;
      let totalFailure = 0;

      for (const chunk of chunks) {
        const message = this.buildFcmMessage(chunk, payload);

        const response = await this.messaging.sendEachForMulticast(message);

        this.logger.log('Firebase push response received', {
          userId: payload.userId,
          notificationId: notificationId.toString(),
          channel: NotificationChannel.PUSH,
          successCount: response.successCount,
          failureCount: response.failureCount,
        });

        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        const invalidTokens: string[] = [];
        const retryTokens: string[] = [];

        response.responses.forEach((res, index) => {
          if (!res.success) {
            const code = res.error?.code;

            if (
              code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token'
            ) {
              invalidTokens.push(chunk[index]);
            } else {
              retryTokens.push(chunk[index]);
            }
          }
        });

        if (invalidTokens.length) {
          this.logger.warn('Invalid push tokens detected. Starting cleanup', {
            userId: payload.userId,
            notificationId: notificationId.toString(),
            channel: NotificationChannel.PUSH,
            invalidTokenCount: invalidTokens.length,
          });

          await this.deviceRepository.deleteByTokens(invalidTokens);

          this.logger.log('Invalid push token cleanup completed', {
            userId: payload.userId,
            notificationId: notificationId.toString(),
            channel: NotificationChannel.PUSH,
            cleanedTokenCount: invalidTokens.length,
          });
        }

        // Optional: log retry tokens (important for retry queue design)
        if (retryTokens.length) {
          this.logger.warn('Retryable push failures detected', {
            userId: payload.userId,
            notificationId: notificationId.toString(),
            retryCount: retryTokens.length,
          });
        }
      }

      let status: NotificationStatus;

      if (totalSuccess === tokens.length) {
        status = NotificationStatus.SENT;
      } else if (totalSuccess > 0) {
        status = NotificationStatus.PARTIAL;
      } else {
        status = NotificationStatus.FAILED;
      }

      await this.notificationRepository.updateChannelStatus(
        notificationId.toString(),
        NotificationChannel.PUSH,
        status,
      );

      this.logger.log('Push channel status updated', {
        userId: payload.userId,
        notificationId: notificationId.toString(),
        channel: NotificationChannel.PUSH,
        status,
        totalSuccess,
        totalFailure,
      });

    } catch (error: unknown) {
      this.logger.error(
        `Push channel failed: ${(error as Error).message} | userId=${payload.userId} | notificationId=${notificationId.toString()} | channel=${NotificationChannel.PUSH}`,
        (error as Error).stack,
      );

      throw error;
    }
  }

  private buildFcmMessage(
    tokens: string[],
    payload: NotificationPayload,
  ): FcmMulticastMessage {
    const message: FcmMulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
    };

    if (payload.metadata) {
      message.data = Object.entries(payload.metadata).reduce(
        (acc, [k, v]) => {
          acc[k] = String(v);
          return acc;
        },
        {} as Record<string, string>,
      );
    }

    if (payload.priority === NotificationPriority.HIGH) {
      message.android = {
        priority: 'high',
        notification: {
          channelId: 'default_channel',
          sound: 'default',
        },
      };

      message.apns = {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      };

      message.webpush = {
        headers: { Urgency: 'high' },
        notification: {
          icon: payload.iconUrl,
        },
      };
    }

    return message;
  }

  private async handleEmailChannel(
    payload: NotificationPayload,
    notificationId: Types.ObjectId,
  ) {
    try {
      // 1. Check if email config exists
      if (!payload.emailNotification) {
        throw new Error('Email notification data missing');
      }

      const emailData = payload.emailNotification;

      // 2. Prepare email payload
      const emailPayload: SendEmailOptions = {
        to: emailData.to,
        subject: emailData.subject || payload.title, // fallback
        text: emailData.text || payload.body, // fallback
        html: emailData.html || '',

        cc: emailData.cc,
        bcc: emailData.bcc,
        from: emailData.from,
        replyTo: emailData.replyTo,
      };

      // 3. Push to queue
      await this.emailService.sendEmail(emailPayload);

      // 4. Mark as SENT (or better: QUEUED — see note below)
      await this.notificationRepository.updateChannelStatus(
        notificationId.toString(),
        NotificationChannel.EMAIL,
        NotificationStatus.SENT,
      );

    } catch (error) {
      // 5. Mark as FAILED
      await this.notificationRepository.updateChannelStatus(
        notificationId.toString(),
        NotificationChannel.EMAIL,
        NotificationStatus.FAILED,
      );

      this.logger.error(
        `Email channel failed for notification ${notificationId}`,
        (error as Error).stack,
      );

      throw error;
    }
  }

}
