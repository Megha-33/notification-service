import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/module/auth/jwt-auth.guard';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { QueueService } from '../src/queue/queue.service';
import { FirebaseService } from '../src/firebase/firebase.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from '../src/common/interceptors/response.interceptor';
import { NotificationStatus, NotificationChannel, NotificationType } from '../src/module/notification/enums/notification.enum';
import { PreferencesRepository } from '../src/module/preferences/repositories/preferences.repository';

describe('Notification Integration', () => {
  let app: INestApplication;
  let connection: Connection;
  let preferencesRepository: PreferencesRepository;

  const userId = new Types.ObjectId().toString();
  const testTag = `integration-${Date.now()}`;

  // Tracks IDs created during tests for cleanup
  const createdNotificationIds: string[] = [];
  let createdNotificationId: string;

  const mockFirebaseService = {
    sendNotification: jest.fn(),
  };

  const mockQueueService = {
    enqueuePushNotification: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = { userId };
          return true;
        },
      })
      .overrideProvider(QueueService)
      .useValue(mockQueueService)
      .overrideProvider(FirebaseService)
      .useValue(mockFirebaseService)
      .compile();

    app = moduleFixture.createNestApplication();

    // Mirror main.ts setup exactly
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    connection = moduleFixture.get<Connection>(getConnectionToken());
    preferencesRepository = moduleFixture.get<PreferencesRepository>(PreferencesRepository);

    // Seed default preferences for the test user so resolveChannels works
    await preferencesRepository.upsert(userId, {
      globalEnabled: true,
      channelDefaults: {
        IN_APP: true,
        PUSH: true,
        EMAIL: false,
        SMS: false,
      } as any,
      typePreferences: [],
    });

    // Seed a real notification document directly for read/findById tests
    const doc = await connection.collection('notifications').insertOne({
      userId: new Types.ObjectId(userId),
      title: 'Seeded Notification',
      body: 'Seeded body',
      type: NotificationType.GENERAL,
      channels: [NotificationChannel.IN_APP],
      channelStatus: { IN_APP: NotificationStatus.SENT },
      status: NotificationStatus.SENT,
      priority: 'LOW',
      isRead: false,
      readAt: null,
      metadata: { testTag },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    createdNotificationId = doc.insertedId.toString();
    createdNotificationIds.push(createdNotificationId);
  });

  afterAll(async () => {
    // Clean up all notifications created during tests
    await connection.collection('notifications').deleteMany({
      $or: [
        { 'metadata.testTag': testTag },
        { _id: { $in: createdNotificationIds.map((id) => new Types.ObjectId(id)) } },
      ],
    });

    // Clean up test user preferences
    await connection.collection('usernotificationpreferences').deleteMany({
      userId: new Types.ObjectId(userId),
    });

    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================= FIND ALL =================
  describe('GET /api/v1/notifications', () => {
    it('should return paginated notifications for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Notifications retrieved successfully');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('limit');
      expect(res.body.meta).toHaveProperty('totalPages');
    });

    it('should filter by isRead=false', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?isRead=false')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      res.body.data.forEach((n: any) => {
        expect(n.isRead).toBe(false);
      });
    });

    it('should filter by type=GENERAL', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?type=GENERAL')
        .expect(200);

      expect(res.body.success).toBe(true);
      res.body.data.forEach((n: any) => {
        expect(n.type).toBe('GENERAL');
      });
    });

    it('should respect pagination params', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications?page=1&limit=2')
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.meta.page).toBe(1);
    });

    it('should only return notifications for the authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(200);

      res.body.data.forEach((n: any) => {
        expect(n.userId.toString()).toBe(userId);
      });
    });
  });

  // ================= FIND BY ID =================
  describe('GET /api/v1/notifications/:id', () => {
    it('should return notification by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${createdNotificationId}`)
        .expect(200);

      expect(res.body.data._id.toString()).toBe(createdNotificationId);
      expect(res.body.data.title).toBe('Seeded Notification');
    });

    it('should return 400 for invalid id format', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications/invalid-id')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent notification', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      const res = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${nonExistentId}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should not return notification belonging to another user', async () => {
      // Insert a notification for a different user
      const otherUserId = new Types.ObjectId();
      const otherDoc = await connection.collection('notifications').insertOne({
        userId: otherUserId,
        title: 'Other User Notification',
        body: 'Should not be visible',
        type: 'GENERAL',
        channels: ['IN_APP'],
        status: 'SENT',
        isRead: false,
        readAt: null,
        metadata: { testTag },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      createdNotificationIds.push(otherDoc.insertedId.toString());

      const res = await request(app.getHttpServer())
        .get(`/api/v1/notifications/${otherDoc.insertedId.toString()}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ================= MARK AS READ =================
  describe('PATCH /api/v1/notifications/read/:id', () => {
    it('should mark notification as read', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/read/${createdNotificationId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Notification marked as read successfully');
      expect(res.body.data.notificationId).toBe(createdNotificationId);
    });

    it('should return 400 for invalid id format', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/read/invalid-id')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent notification', async () => {
      const nonExistentId = new Types.ObjectId().toString();

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/notifications/read/${nonExistentId}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ================= MARK BULK AS READ =================
  describe('PATCH /api/v1/notifications/read/bulk', () => {
    let bulkNotificationIds: string[];

    beforeEach(async () => {
      // Insert fresh unread notifications for bulk tests
      const docs = await connection.collection('notifications').insertMany([
        {
          userId: new Types.ObjectId(userId),
          title: 'Bulk Test 1',
          body: 'Body 1',
          type: 'GENERAL',
          channels: ['IN_APP'],
          status: 'SENT',
          isRead: false,
          readAt: null,
          metadata: { testTag },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          userId: new Types.ObjectId(userId),
          title: 'Bulk Test 2',
          body: 'Body 2',
          type: 'GENERAL',
          channels: ['IN_APP'],
          status: 'SENT',
          isRead: false,
          readAt: null,
          metadata: { testTag },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      bulkNotificationIds = Object.values(docs.insertedIds).map((id) => id.toString());
      createdNotificationIds.push(...bulkNotificationIds);
    });

    it('should mark multiple notifications as read', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/read/bulk')
        .send({ ids: bulkNotificationIds })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedCount).toBeGreaterThanOrEqual(1);
      expect(res.body.data.requestedCount).toBe(2);
    });

    it('should return 400 for empty ids array', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/read/bulk')
        .send({ ids: [] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid ids', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/read/bulk')
        .send({ ids: ['invalid-id'] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 when ids field is missing', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/read/bulk')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ================= MARK BULK AS READ BY USER =================
  describe('PATCH /api/v1/notifications/user/read/bulk', () => {
    beforeEach(async () => {
      // Insert unread notifications for the user
      const doc = await connection.collection('notifications').insertOne({
        userId: new Types.ObjectId(userId),
        title: 'Unread for bulk user',
        body: 'Body',
        type: 'GENERAL',
        channels: ['IN_APP'],
        status: 'SENT',
        isRead: false,
        readAt: null,
        metadata: { testTag },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      createdNotificationIds.push(doc.insertedId.toString());
    });

    it('should mark all unread notifications for user as read', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/user/read/bulk')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedCount).toBeGreaterThanOrEqual(1);
    });

    it('should return zero count when user has no unread notifications', async () => {
      // Mark everything read first
      await connection.collection('notifications').updateMany(
        { userId: new Types.ObjectId(userId) },
        { $set: { isRead: true } },
      );

      const res = await request(app.getHttpServer())
        .patch('/api/v1/notifications/user/read/bulk')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedCount).toBe(0);
    });
  });

  // ================= SEND NOTIFICATION =================
  describe('POST /api/v1/notifications/test', () => {

    it('should enqueue notification and return success', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications/test')
        .send({
          userId,
          title: 'Queue Test',
          body: 'Testing queue',
          type: 'GENERAL',
          priority: 'LOW',
          metadata: { testTag },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Notification event queued successfully');
      expect(res.body.data.userId).toBe(userId);
      expect(res.body.data.title).toBe('Queue Test');
      expect(res.body.timestamp).toBeDefined();
      expect(mockQueueService.enqueuePushNotification).toHaveBeenCalledTimes(1);
    });

    it('should enqueue with correct channel payload after preference filtering', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications/test')
        .send({
          userId,
          title: 'Channel Test',
          body: 'Testing channels',
          type: 'GENERAL',
          priority: 'LOW',
          channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
          metadata: { testTag },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(mockQueueService.enqueuePushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          channels: expect.arrayContaining([NotificationChannel.IN_APP, NotificationChannel.PUSH]),
        }),
      );
    });

    it('should skip enqueue when globalEnabled is false', async () => {
      // Disable global notifications for this user
      await preferencesRepository.upsert(userId, { globalEnabled: false } as any);

      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications/test')
        .send({
          userId,
          title: 'Blocked Notification',
          body: 'Should not be queued',
          type: 'GENERAL',
          priority: 'LOW',
          metadata: { testTag },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(mockQueueService.enqueuePushNotification).not.toHaveBeenCalled();

      // Re-enable for subsequent tests
      await preferencesRepository.upsert(userId, { globalEnabled: true } as any);
    });

    it('should skip blocked channel based on channelDefaults', async () => {
      // Disable PUSH globally
      await preferencesRepository.upsert(userId, {
        globalEnabled: true,
        channelDefaults: { IN_APP: true, PUSH: false, EMAIL: false, SMS: false } as any,
      });

      await request(app.getHttpServer())
        .post('/api/v1/notifications/test')
        .send({
          userId,
          title: 'Push Blocked',
          body: 'Only IN_APP should go through',
          type: 'GENERAL',
          priority: 'LOW',
          channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
          metadata: { testTag },
        })
        .expect(201);

      expect(mockQueueService.enqueuePushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          channels: [NotificationChannel.IN_APP],
        }),
      );

      // Restore
      await preferencesRepository.upsert(userId, {
        globalEnabled: true,
        channelDefaults: { IN_APP: true, PUSH: true, EMAIL: false, SMS: false } as any,
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/notifications/test')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });
});