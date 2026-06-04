import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationChannel, NotificationType } from './enums/notification.enum';

describe('NotificationController', () => {
  let controller: NotificationController;

  const mockService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    markAsRead: jest.fn(),
    markBulkAsRead: jest.fn(),
    markBulkAsReadByUser: jest.fn(),
    sendNotification: jest.fn(),
  };

  const mockUserId = new Types.ObjectId().toString();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  afterEach(() => jest.clearAllMocks());

  // ================= FIND ALL =================
  describe('findAll', () => {
    const mockResponse = {
      data: [{ _id: '1', title: 'Test' }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };

    it('should return wrapped response with data and meta', async () => {
      mockService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockUserId, {} as any);

      expect(mockService.findAll).toHaveBeenCalledWith(mockUserId, {});
      expect(result).toEqual({
        success: true,
        message: 'Notifications retrieved successfully',
        data: mockResponse.data,
        meta: mockResponse.meta,
      });
    });

    it('should pass query filters to service', async () => {
      const query = {
        type: NotificationType.ORDER,
        isRead: false,
        page: 2,
        limit: 5,
      };
      mockService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(mockUserId, query as any);

      expect(mockService.findAll).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should return empty data array when no notifications exist', async () => {
      mockService.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      const result = await controller.findAll(mockUserId, {} as any);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should pass channel filter to service', async () => {
      const query = { channels: [NotificationChannel.PUSH] };
      mockService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(mockUserId, query as any);

      expect(mockService.findAll).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should propagate BadRequestException from service', async () => {
      mockService.findAll.mockRejectedValue(new BadRequestException('Invalid userId'));

      await expect(controller.findAll('invalid-id', {} as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ================= FIND BY ID =================
  describe('findById', () => {
    const notificationId = new Types.ObjectId().toString();

    it('should return notification when found', async () => {
      const mockData = { _id: notificationId, title: 'Test', userId: mockUserId };
      mockService.findById.mockResolvedValue(mockData);

      const result = await controller.findById(mockUserId, notificationId);

      expect(mockService.findById).toHaveBeenCalledWith(notificationId, mockUserId);
      expect(result).toEqual(mockData);
    });

    it('should propagate NotFoundException when notification not found', async () => {
      mockService.findById.mockRejectedValue(new NotFoundException('Notification not found'));

      await expect(controller.findById(mockUserId, notificationId))
        .rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException for invalid id', async () => {
      mockService.findById.mockRejectedValue(new BadRequestException('Invalid notification id'));

      await expect(controller.findById(mockUserId, 'invalid-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ================= MARK AS READ =================
  describe('markAsRead', () => {
    const notificationId = new Types.ObjectId().toString();

    it('should mark notification as read and return success response', async () => {
      const mockResponse = {
        success: true,
        message: 'Notification marked as read successfully',
        data: { notificationId },
      };
      mockService.markAsRead.mockResolvedValue(mockResponse);

      const result = await controller.markAsRead(notificationId, mockUserId);

      expect(mockService.markAsRead).toHaveBeenCalledWith(notificationId, mockUserId);
      expect(result).toEqual(mockResponse);
    });

    it('should propagate NotFoundException when notification not found', async () => {
      mockService.markAsRead.mockRejectedValue(new NotFoundException());

      await expect(controller.markAsRead(notificationId, mockUserId))
        .rejects.toThrow(NotFoundException);
    });

    it('should propagate BadRequestException for invalid notification id', async () => {
      mockService.markAsRead.mockRejectedValue(new BadRequestException('Invalid notification id'));

      await expect(controller.markAsRead('invalid-id', mockUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('should propagate BadRequestException for invalid userId', async () => {
      mockService.markAsRead.mockRejectedValue(new BadRequestException('Invalid userId'));

      await expect(controller.markAsRead(notificationId, 'invalid-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ================= MARK BULK AS READ =================
  describe('markBulkAsRead', () => {
    const ids = [
      new Types.ObjectId().toString(),
      new Types.ObjectId().toString(),
    ];

    it('should mark multiple notifications as read', async () => {
      const mockResponse = {
        success: true,
        message: 'Notifications marked as read successfully',
        data: { requestedCount: 2, matchedCount: 2, updatedCount: 2 },
      };
      mockService.markBulkAsRead.mockResolvedValue(mockResponse);

      const result = await controller.markBulkAsRead({ ids } as any);

      expect(mockService.markBulkAsRead).toHaveBeenCalledWith(ids);
      expect(result).toEqual(mockResponse);
    });

    it('should handle partial update (some already read)', async () => {
      const mockResponse = {
        success: true,
        message: 'Notifications marked as read successfully',
        data: { requestedCount: 2, matchedCount: 2, updatedCount: 1 },
      };
      mockService.markBulkAsRead.mockResolvedValue(mockResponse);

      const result = await controller.markBulkAsRead({ ids } as any);

      expect(result.data.updatedCount).toBe(1);
    });

    it('should propagate BadRequestException for empty ids array', async () => {
      mockService.markBulkAsRead.mockRejectedValue(
        new BadRequestException('Ids array cannot be empty'),
      );

      await expect(controller.markBulkAsRead({ ids: [] } as any))
        .rejects.toThrow(BadRequestException);
    });

    it('should propagate BadRequestException for invalid ids', async () => {
      mockService.markBulkAsRead.mockRejectedValue(
        new BadRequestException('One or more ids are invalid'),
      );

      await expect(controller.markBulkAsRead({ ids: ['invalid'] } as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ================= MARK BULK AS READ BY USER =================
  describe('markBulkAsReadByUser', () => {
    it('should mark all unread notifications for user as read', async () => {
      const mockResponse = {
        success: true,
        message: 'Notifications marked as read successfully',
        data: { requestedCount: 5, matchedCount: 5, updatedCount: 5 },
      };
      mockService.markBulkAsReadByUser.mockResolvedValue(mockResponse);

      const result = await controller.markBulkAsReadByUser(mockUserId);

      expect(mockService.markBulkAsReadByUser).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockResponse);
    });

    it('should return zero counts when user has no unread notifications', async () => {
      const mockResponse = {
        success: true,
        message: 'Notifications marked as read successfully',
        data: { requestedCount: 0, matchedCount: 0, updatedCount: 0 },
      };
      mockService.markBulkAsReadByUser.mockResolvedValue(mockResponse);

      const result = await controller.markBulkAsReadByUser(mockUserId);

      expect(result.data.updatedCount).toBe(0);
    });

    it('should propagate BadRequestException for invalid userId', async () => {
      mockService.markBulkAsReadByUser.mockRejectedValue(
        new BadRequestException('Invalid userId'),
      );

      await expect(controller.markBulkAsReadByUser('invalid-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ================= SEND NOTIFICATION =================
  describe('sendNotification', () => {
    const baseDto = {
      userId: new Types.ObjectId().toString(),
      title: 'Test Notification',
      body: 'This is a test',
      type: NotificationType.GENERAL,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
    };

    it('should enqueue notification and return success response', async () => {
      mockService.sendNotification.mockResolvedValue(undefined);

      const result = await controller.sendNotification(baseDto as any);

      expect(mockService.sendNotification).toHaveBeenCalledWith(baseDto);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification event queued successfully');
      expect(result.data.userId).toBe(baseDto.userId);
      expect(result.data.title).toBe(baseDto.title);
    });

    it('should include timestamp in response', async () => {
      mockService.sendNotification.mockResolvedValue(undefined);

      const before = new Date().toISOString();
      const result = await controller.sendNotification(baseDto as any);
      const after = new Date().toISOString();

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });

    it('should return success even when notification is skipped by preferences', async () => {
      // service returns undefined when blocked by preferences — controller still returns success
      mockService.sendNotification.mockResolvedValue(undefined);

      const result = await controller.sendNotification(baseDto as any);

      expect(result.success).toBe(true);
    });

    it('should propagate BadRequestException from service', async () => {
      mockService.sendNotification.mockRejectedValue(new BadRequestException());

      await expect(controller.sendNotification({} as any))
        .rejects.toThrow(BadRequestException);
    });

    it('should propagate generic errors from service', async () => {
      mockService.sendNotification.mockRejectedValue(new Error('Queue unavailable'));

      await expect(controller.sendNotification(baseDto as any))
        .rejects.toThrow('Queue unavailable');
    });
  });
});