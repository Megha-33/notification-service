import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationRepository } from '../notification/repositories/notification.repositories';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { QueueService } from '../../queue/queue.service';
import { PreferencesService } from '../preferences/preferences.service';
import { NotificationChannel, NotificationType, NotificationPriority } from './enums/notification.enum';
import { NotificationRealtimeService } from 'src/websocket/notification-realtime.service';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockRepository = {
    findAll: jest.fn(),
    findByIdandUserId: jest.fn(),
    markAsRead: jest.fn(),
    updateMany: jest.fn(),
    findAllByUserId: jest.fn(),
    create: jest.fn(),
    updateChannelStatus: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockQueueService = {
    enqueuePushNotification: jest.fn(),
    enqueueEmail: jest.fn(),
  };

  const mockPreferencesService = {
    resolveChannels: jest.fn(),
  };

  const mockRealtimeService = {
    emitNotificationCreated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NotificationRepository, useValue: mockRepository },
        { provide: QueueService, useValue: mockQueueService },
        { provide: PreferencesService, useValue: mockPreferencesService },
        { provide: NotificationRealtimeService, useValue: mockRealtimeService }, // ✅ FIX
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => jest.clearAllMocks());

  // ================= FIND ALL =================
  describe('findAll', () => {
    const userId = new Types.ObjectId().toString();
    const query = {};

    it('should return paginated notifications', async () => {
      const mockResponse = {
        data: [{ id: '1', title: 'Test' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockRepository.findAll.mockResolvedValue(mockResponse);

      const result = await service.findAll(userId, query);

      expect(result).toEqual(mockResponse);
      expect(mockRepository.findAll).toHaveBeenCalledWith(userId, query);
    });

    it('should throw BadRequestException for invalid userId', async () => {
      await expect(service.findAll('invalid-id', query)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ================= FIND BY ID =================
  describe('findById', () => {
    const id = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    it('should return notification when found', async () => {
      const mockData = { _id: id, userId };
      mockRepository.findByIdandUserId.mockResolvedValue(mockData);

      const result = await service.findById(id, userId);

      expect(result).toEqual(mockData);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findByIdandUserId.mockResolvedValue(null);

      await expect(service.findById(id, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findById('invalid', userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ================= MARK AS READ =================
  describe('markAsRead', () => {
    const id = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();

    it('should mark as read', async () => {
      mockRepository.markAsRead.mockResolvedValue({});

      const result = await service.markAsRead(id, userId);

      expect(result.success).toBe(true);
    });

    it('should throw for invalid id', async () => {
      await expect(service.markAsRead('invalid', userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ================= MARK BULK =================
  describe('markBulkAsRead', () => {
    const ids = [new Types.ObjectId().toString()];

    it('should update many', async () => {
      mockRepository.updateMany.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
      });

      const result = await service.markBulkAsRead(ids);

      expect(result.success).toBe(true);
    });

    it('should throw for empty ids', async () => {
      await expect(service.markBulkAsRead([])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ================= SEND NOTIFICATION =================
  describe('sendNotification', () => {
    const userId = new Types.ObjectId().toString();

    it('should enqueue notification', async () => {
      mockPreferencesService.resolveChannels.mockResolvedValue([
        NotificationChannel.IN_APP,
      ]);

      await service.sendNotification({
        userId,
        title: 'Test',
        body: 'Test',
      } as any);

      expect(mockQueueService.enqueuePushNotification).toHaveBeenCalled();
    });

    it('should skip if no allowed channels', async () => {
      mockPreferencesService.resolveChannels.mockResolvedValue([]);

      await service.sendNotification({
        userId,
        title: 'Test',
        body: 'Test',
      } as any);

      expect(
        mockQueueService.enqueuePushNotification,
      ).not.toHaveBeenCalled();
    });
  });

  // ================= WEBSOCKET =================
  describe('sendNotificationWebSocket', () => {
    const userId = new Types.ObjectId().toString();

    it('should create and emit notification', async () => {
      const mockNotification = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        title: 'Test',
        body: 'Test',
        type: NotificationType.GENERAL,
        status: 'PENDING',
        priority: NotificationPriority.LOW,
        metadata: {},
        channels: [NotificationChannel.IN_APP],
      };

      mockRepository.create.mockResolvedValue(mockNotification);

      await service.sendNotificationWebSocket({
        userId,
        title: 'Test',
        body: 'Test',
      } as any);

      expect(mockRealtimeService.emitNotificationCreated).toHaveBeenCalled();
      expect(mockRepository.updateStatus).toHaveBeenCalled();
    });

    it('should throw for invalid userId', async () => {
      await expect(
        service.sendNotificationWebSocket({
          userId: 'invalid',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});