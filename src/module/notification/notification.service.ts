import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { NotificationRepository } from '../notification/repositories/notification.repositories';
import { NotificationChannel, NotificationStatus, NotificationType } from './enums/notification.enum';
import { Types } from 'mongoose';
import { SendNotificationDto } from './dto/send-notification.dto';
// import { IPriority } from 'src/firebase/firebase.service';
// import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueService } from 'src/queue/queue.service';
import { NotificationPayload } from 'src/firebase/notification.interface';
import { SendEmailNotificationDto } from './dto/email.notification';
import { SendEmailOptions } from 'src/email/interfaces/send-email.interface';

import { NotificationPriority } from '../notification/enums/notification.enum';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { PreferencesService } from '../preferences/preferences.service';
import { Notification } from './schemas/notification.schema';
import { RealtimeNotificationMessage } from 'src/websocket/interfaces/realtime-notification.interface';
import { NotificationRealtimeService } from 'src/websocket/notification-realtime.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly queueService: QueueService,
    private readonly preferencesService: PreferencesService,
    private readonly notificationRealtimeService: NotificationRealtimeService
  ) { }

  async findAll(userId: string, query: QueryNotificationDto) {
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.warn('Find notifications skipped: invalid userId', { userId });
      throw new BadRequestException('Invalid userId');
    }
    return this.notificationRepository.findAll(userId, query);
  }

  async findById(id: string, userId: string) {
    this.logger.log('Finding notification by id', { userId, notificationId: id });

    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn('Find notification skipped: invalid notification id', {
        userId,
        notificationId: id,
      });
      throw new BadRequestException('Invalid notification id');
    }

    const notification = await this.notificationRepository.findByIdandUserId(id, userId);

    if (!notification) {
      this.logger.warn('Notification not found', {
        userId,
        notificationId: id,
      });
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    this.logger.log('Marking notification as read', { userId, notificationId: id });

    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn('Mark as read skipped: invalid notification id', {
        userId,
        notificationId: id,
      });
      throw new BadRequestException('Invalid notification id');
    }

    if (!Types.ObjectId.isValid(userId)) {
      this.logger.warn('Mark as read skipped: invalid userId', { userId, notificationId: id });
      throw new BadRequestException('Invalid userId');
    }

    const updated = await this.notificationRepository.markAsRead(id, userId);

    if (!updated) {
      this.logger.warn('Mark as read failed: notification not found', {
        userId,
        notificationId: id,
      });
      throw new NotFoundException('Notification not found');
    }

    return {
      success: true,
      message: 'Notification marked as read successfully',
      data: { notificationId: id },
    };
  }

  async markBulkAsRead(ids: string[]) {
    if (!ids || ids.length === 0) {
      this.logger.warn('Bulk mark as read skipped: empty ids array');
      throw new BadRequestException('Ids array cannot be empty');
    }

    const invalidIds = ids.filter((id) => !Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      this.logger.warn('Bulk mark as read skipped: invalid ids', {
        requestedCount: ids.length,
        invalidCount: invalidIds.length,
      });
      throw new BadRequestException('One or more ids are invalid');
    }

    const result = await this.notificationRepository.updateMany(ids, {
      isRead: true,
      readAt: new Date(),
    });

    return {
      success: true,
      message: 'Notifications marked as read successfully',
      data: {
        requestedCount: ids.length,
        matchedCount: result.matchedCount,
        updatedCount: result.modifiedCount,
      },
    };
  }

  async sendNotification(dto: SendNotificationDto) {
    const requestedChannels =
      dto.channels && dto.channels.length > 0
        ? dto.channels
        : [NotificationChannel.IN_APP, NotificationChannel.PUSH];

    this.logger.log('Preparing notification dispatch', {
      userId: dto.userId,
      type: dto.type ?? NotificationType.GENERAL,
      requestedChannels,
      priority: dto.priority ?? NotificationPriority.LOW,
    });

    // Check preferences and filter channels
    const allowedChannels = await this.preferencesService.resolveChannels(
      dto.userId,
      dto.type ?? NotificationType.GENERAL,
      requestedChannels,
    );

    // User has blocked all channels, skip dispatch
    if (allowedChannels.length === 0) {
      this.logger.warn('Notification skipped by preferences', {
        userId: dto.userId,
        requestedChannels,
        skippedReason: 'all_channels_blocked',
      });
      return;
    }

    const payload: NotificationPayload = {
      userId: dto.userId,
      type: dto.type ?? NotificationType.GENERAL,
      title: dto.title,
      body: dto.body,
      imageUrl: dto.imageUrl,
      iconUrl: dto.iconUrl,
      deepLink: dto.deepLink,
      actions: dto.actions,
      priority: dto.priority ?? NotificationPriority.LOW,
      metadata: dto.metadata,
      channels: allowedChannels,
    };

    this.logger.log('Enqueuing notification', {
      userId: dto.userId,
      channels: allowedChannels,
      type: payload.type,
    });

    await this.queueService.enqueuePushNotification(payload);

    this.logger.log('Notification queued successfully', {
      userId: dto.userId,
      channels: allowedChannels,
      type: payload.type,
    });
  }

  async sendEmailNotification(dto: SendEmailNotificationDto) {

    const payload: SendEmailOptions = {
      to: dto.to,
      subject: dto.subject,
      html: dto.body || '',
      ...(dto.cc && { cc: dto.cc }),
      ...(dto.bcc && { bcc: dto.bcc }),
    };
    await this.queueService.enqueueEmail(payload);
  }


  async markBulkAsReadByUser(userId: string) {

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const notifications = await this.notificationRepository.findAllByUserId(userId);

    const ids = notifications.map((n) => n._id.toString());

    const result = await this.notificationRepository.updateMany(ids, {
      isRead: true,
      readAt: new Date(),
    });

    return {
      success: true,
      message: 'Notifications marked as read successfully',
      data: {
        requestedCount: ids.length,
        matchedCount: result.matchedCount,
        updatedCount: result.modifiedCount,
      },
    }
  }


  async sendNotificationWebSocket(dto: SendNotificationDto) {

    if (!dto.userId || !Types.ObjectId.isValid(dto.userId)) {
      throw new BadRequestException('Invalid userId');
    }

    const payload: Partial<Notification> = {
      userId: new Types.ObjectId(dto.userId),
      type: dto.type ?? NotificationType.GENERAL,
      title: dto.title,
      body: dto.body,
      imageUrl: dto.imageUrl,
      iconUrl: dto.iconUrl,
      deepLink: dto.deepLink,
      actions: dto.actions,
      priority: dto.priority ?? NotificationPriority.LOW,
      channels: [NotificationChannel.IN_APP],
      status: NotificationStatus.PENDING,
      isRead: false,
      metadata: dto.metadata,
    };

    const notification = await this.notificationRepository.create(payload);

    const sendNotificationPayload: RealtimeNotificationMessage = {
      notificationId: notification._id.toString(),
      userId: notification.userId.toString(),
      title: notification.title,
      body: notification.body,
      type: notification.type,
      status: notification.status,
      priority: notification.priority,
      meta: notification.metadata,
    };

    this.notificationRealtimeService.emitNotificationCreated(sendNotificationPayload);

    // console.log('Payload for WebSocket notification:', payload);

    this.notificationRepository.updateChannelStatus(notification._id.toString(), notification.channels[0], NotificationStatus.SENT);

    this.notificationRepository.updateStatus(notification._id.toString(), NotificationStatus.SENT)


    return notification;
  }
}