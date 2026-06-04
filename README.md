# Notification Service (NestJS)

Production-ready NestJS infrastructure scaffold for notification workloads.  
This project is intentionally focused on core setup so feature teams can plug in their own modules and send notifications immediately using shared Firebase and Queue providers.

## What this setup gives you

- NestJS app initialized by CLI with modular architecture
- Global env-based configuration (`ConfigModule`)
- MongoDB integration (`MongooseModule`)
- Redis + Bull queue integration (`@nestjs/bull`)
- Queue processor worker for push jobs
- Firebase Admin SDK integration as injectable provider
- Structured application logging via Winston
- JWT auth guard + strategy for protected routes
- Notification preference resolution (`globalEnabled`, `channelDefaults`, `typePreferences`)
- Global API version prefix: `/api/v1`

## Project overview and purpose

This service currently provides a full notification backend foundation:

- User registration/login/logout with JWT token issuance
- Device registration/state tracking for FCM delivery
- User notification preference management
- Notification CRUD/read-state APIs
- Async queue-based push dispatch via Bull + Redis
- Firebase Admin SDK delivery and invalid-token cleanup

## Architecture overview

```text
Client/API Controller
  -> Feature Service (validation + preference resolution)
  -> QueueService.enqueuePushNotification(...)
  -> Bull Queue (Redis) [notification-queue]
  -> QueueProcessor (@Process send-push-notification)
  -> FirebaseService.sendNotification(...)
  -> Notification collection channel status updates
  -> FCM delivery + invalid token cleanup
```

## Tech stack (actual package versions)

| Layer | Package | Version |
| --- | --- | --- |
| Framework | `@nestjs/common` | `^11.0.1` |
| Framework | `@nestjs/core` | `^11.0.1` |
| Validation | `class-validator` | `^0.14.4` |
| Validation | `class-transformer` | `^0.5.1` |
| Config | `@nestjs/config` | `^4.0.3` |
| Database | `mongoose` | `^9.3.3` |
| Database integration | `@nestjs/mongoose` | `^11.0.4` |
| Queue | `bull` | `^4.16.5` |
| Queue integration | `@nestjs/bull` | `^11.0.4` |
| Push notifications | `firebase-admin` | `^13.7.0` |
| Auth | `@nestjs/jwt` | `^11.0.2` |
| Auth | `@nestjs/passport` | `^11.0.5` |
| Auth strategy | `passport-jwt` | `^4.0.1` |
| API docs | `@nestjs/swagger` | `^11.2.6` |
| Logging | `nest-winston` + `winston` | `^1.10.2`, `^3.19.0` |
| Runtime | Node.js | `20+` |
| Language | TypeScript | `^5.7.3` |

## Project structure

```text
.
  src/
    app.controller.ts
    app.module.ts
    main.ts

    common/
      decorators/get-user.decorator.ts
      dtos/api-response.dto.ts
      filters/http-exception.filter.ts
      interceptors/response.interceptor.ts
      logger/winston.config.ts

    config/configuration.ts
    database/database.module.ts

    queue/
      queue.constants.ts
      queue.module.ts
      queue.processor.ts
      queue.service.ts

    firebase/
      event.listener.ts
      firebase.module.ts
      firebase.service.ts
      notification.interface.ts

    module/
      auth/
        interfaces/jwt-payload.interface.ts
        jwt-auth.guard.ts
        jwt.module.ts
        jwt.service.ts
        jwt.strategy.ts

      users/
        dto/
        repositories/user.repository.ts
        schemas/user.schema.ts
        users.controller.ts
        users.module.ts
        users.service.ts

      devices/
        dto/device-response.dto.ts
        repositories/device.repositories.ts
        schemas/device.login.schema.ts
        devices.controller.ts
        devices.module.ts
        devices.service.ts

      preferences/
        dtos/preferences.dto.ts
        repositories/preferences.repository.ts
        schemas/preferences.schema.ts
        preferences.contoller.ts
        preferences.module.ts
        preferences.service.ts

      notification/
        dto/
        enums/notification.enum.ts
        repositories/notification.repositories.ts
        schemas/notification.schema.ts
        notification.controller.ts
        notification.module.ts
        notification.service.ts

    swagger/
      swagger.config.ts
      swagger.decorators.ts
      swagger.models.ts

  test/
    app.e2e-spec.ts
    notification.e2e-spec.ts
    jest-e2e.json

  docker-compose.yml
  .env.example
  package.json
```

## Prerequisites

- Node.js 20+
- Docker Desktop (recommended for local MongoDB + Redis)
- Firebase service account credentials (Project ID, Client Email, Private Key)

## 1) Environment configuration

Create `.env` from template:

```bash
copy .env.example .env
```

Environment variables used by the app:

| Name | Required | Default | Example | Purpose |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | `development` | Runtime mode |
| `PORT` | No | `3000` | `3000` | App port |
| `MONGODB_URI` | Yes | - | `mongodb://localhost:27017/notification-service` | Mongo connection string |
| `REDIS_HOST` | Yes | - | `127.0.0.1` | Redis host |
| `REDIS_PORT` | Yes | `6379` | `6379` | Redis port |
| `REDIS_PASSWORD` | No | empty | `` | Redis auth password |
| `REDIS_TLS` | No | `false` | `false` | Redis TLS mode (`true`/`false`) |
| `QUEUE_PREFIX` | No | `notifications` | `notification-service` | Bull key prefix/namespace |
| `LOG_LEVEL` | No | `info` | `info` | Winston log level |
| `FIREBASE_PROJECT_ID` | Yes | - | `your-firebase-project-id` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | - | `firebase-adminsdk-xxx@project.iam.gserviceaccount.com` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | - | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` | Firebase private key (escaped newlines) |
| `JWT_SECRET` | Recommended | hardcoded fallback in code | `change-me` | JWT signing secret |

Notes:

- `FIREBASE_PRIVATE_KEY` must keep escaped newlines in `.env`.
- App startup validation (`Joi` in `app.module.ts`) enforces all required envs except `JWT_SECRET`.
- `JWT_SECRET` should be set explicitly in every environment.

## 2) Docker setup for MongoDB + Redis

The repo includes `docker-compose.yml` for local infra.

Start services:

```bash
docker compose up -d
```

Check status:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f mongo redis
```

Stop services:

```bash
docker compose down
```

Stop and remove data volumes (full reset):

```bash
docker compose down -v
```

Default ports exposed:

- MongoDB: `27017`
- Redis: `6379`

Recommended `.env` values for local Docker:

```env
MONGODB_URI=mongodb://localhost:27017/notification-service
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
```

Note:

- There is no `Dockerfile` for the Nest app in this repo right now. `docker-compose.yml` currently provisions only MongoDB and Redis.

## 3) Run the Nest app

Install dependencies:

```bash
npm install
```

Run in dev:

```bash
npm run start:dev
```

Run in debug/watch mode:

```bash
npm run start:debug
```

Build:

```bash
npm run build
```

Run built app:

```bash
npm run start:prod
```

Base URL:

- `http://localhost:3000/api/v1`

Swagger:

- `http://localhost:3000/api/v1/swagger`

Health route:

- `GET /api/v1/`
- data payload: `{ "status": "ok", "service": "notification-service" }`

## API response shape

HTTP responses go through `ResponseTransformInterceptor`.

- Success envelope:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": null,
  "timestamp": "2026-04-02T00:00:00.000Z"
}
```

- Paginated endpoints include `meta: { total, page, limit, totalPages }`.

## API endpoints (by module)

All routes below are prefixed with `/api/v1`.

### Notifications

| Method | Route | Auth | Request | Response `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/notifications` | Yes (`Bearer`) | Query: `type,status,isRead,priority,channels,startDate,endDate,search,page,limit,sortBy,sortOrder` | `Notification[]` + pagination meta |
| `GET` | `/notifications/:id` | Yes (`Bearer`) | Path: `id` | `Notification` |
| `PATCH` | `/notifications/read/:id` | Yes (`Bearer`) | Path: `id` | `{ notificationId }` |
| `PATCH` | `/notifications/read/bulk` | Yes (`Bearer`) | Body: `{ ids: string[] }` | `{ requestedCount, matchedCount, updatedCount }` |
| `PATCH` | `/notifications/user/read/bulk` | Yes (`Bearer`) | none | `{ requestedCount, matchedCount, updatedCount }` |
| `POST` | `/notifications/test` | No | Body: `SendNotificationDto` | `{ userId, title }` |

`SendNotificationDto` shape:

```json
{
  "userId": "...",
  "type": "GENERAL",
  "title": "Test Notification",
  "body": "This is a test message",
  "priority": "LOW",
  "channels": ["IN_APP", "PUSH"],
  "imageUrl": "https://example.com/image.png",
  "iconUrl": "https://example.com/icon.png",
  "deepLink": "app://notifications/123",
  "actions": [{ "id": "OPEN_APP", "label": "Open" }],
  "metadata": { "orderId": "12345" }
}
```

### Preferences

| Method | Route | Auth | Request | Response `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/preferences` | Yes (`Bearer`) | none | `UserNotificationPreferences` |
| `PATCH` | `/preferences` | Yes (`Bearer`) | Body: `UpdatePreferencesDto` | updated `UserNotificationPreferences` |

`UpdatePreferencesDto` shape:

```json
{
  "globalEnabled": true,
  "channelDefaults": {
    "IN_APP": true,
    "PUSH": true,
    "EMAIL": false,
    "SMS": false
  },
  "typePreferences": [
    {
      "type": "ORDER",
      "enabled": true,
      "channels": ["IN_APP", "PUSH"]
    }
  ]
}
```

### Devices

| Method | Route | Auth | Request | Response `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/devices` | Yes (`Bearer`) | Query: `page`, `limit` | `Device[]` + pagination meta |
| `GET` | `/devices/:userId` | Yes (`Bearer`) | Path: `userId`, Query: `page`, `limit` | `Device[]` + pagination meta |

### Users

| Method | Route | Auth | Request | Response `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/users` | No | none | currently returns empty array scaffold |
| `POST` | `/users/register` | No | Body: `RegisterDto` | `{ user }` |
| `POST` | `/users/login` | No | Body: `LoginDto` | `{ user, accessToken }` |
| `POST` | `/users/logout` | Yes (`Bearer`) | Body: `{ deviceId }` | `null` |

### Auth module note

- `auth/` in this repo provides JWT services/strategy/guard, but no dedicated `/auth/*` controller routes yet.

## Firebase: how it works and how to use it

### How it works

- `FirebaseModule` is global, so `FirebaseService` is available app-wide.
- On app bootstrap, `FirebaseService` initializes Firebase Admin SDK once.
- If credentials are placeholders/missing, it logs a warning and skips initialization.
- `sendNotification(payload)` creates a notification document with `PENDING` channel statuses.
- Channel handling:
  - `IN_APP`: marked `SENT` in DB.
  - `PUSH`: sends via FCM multicast and updates channel status.
- Invalid FCM tokens are collected from response errors and cleaned up via `DeviceRepository.deleteByTokens(...)`.
- Final notification status becomes:
  - `FAILED` if any channel failed
  - `SENT` otherwise

### How to use in feature modules

Inject service in your feature service:

```ts
constructor(private readonly firebaseService: FirebaseService) {}
```

Send directly (if your use-case does not require queueing):

```ts
await this.firebaseService.sendNotification({
  userId,
  type: NotificationType.GENERAL,
  title: 'Title',
  body: 'Body',
  priority: NotificationPriority.LOW,
  channels: [NotificationChannel.PUSH],
});
```

## Queue (Bull + Redis): how it works and how to use it

### How it works

- `QueueModule` is global and configures Bull using Redis env values.
- Queue name: `notification-queue`
- Job name: `send-push-notification`
- `QueueService` is the producer (adds jobs).
- `QueueProcessor` is the worker (consumes jobs and calls Firebase service).
- Reliability policy (`QueueService.enqueuePushNotification`):
  - `attempts: 3`
  - `backoff: { type: 'exponential', delay: 1000 }`
  - `removeOnComplete: true`
  - priority: `1` for `HIGH`, else `5`

### How to use from your own module

Inject `QueueService`:

```ts
constructor(private readonly queueService: QueueService) {}
```

Enqueue job:

```ts
await this.queueService.enqueuePushNotification({
  userId,
  type: NotificationType.GENERAL,
  title: 'Welcome',
  body: 'Thanks for joining',
  priority: NotificationPriority.LOW,
  channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
});
```

This is the recommended pattern for production notification flows because delivery is async, retryable, and isolated from request latency.

## WebSocket real-time notifications (Socket.IO)

This service exposes a Socket.IO namespace for real-time notification events.

### Connection (JWT auth)

Socket namespace: `/${WS_NAMESPACE}` (default `'/notifications'`).

Clients must authenticate during the handshake by sending a JWT as `auth.token`:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/notifications', {
  transports: ['websocket'],
  auth: { token: accessToken },
});

socket.on('ws.connected', console.log);
socket.on('notification.created', console.log);
```

On successful auth, the server joins the socket to the room `user:{userId}` so you only receive events for your user.

### Events you can listen to

- `notification.created`: emitted with a payload containing `notificationId`, `userId`, `title`, `body`, `type`, and `status`.

### How to send notifications (so connected clients receive events)

#### 1) From the HTTP API (recommended for testing)

Call:
- `POST /api/v1/notifications/test`

Body:
```json
{
  "userId": "65f1c2b8a4d3c91234abcd12",
  "title": "Test Notification",
  "body": "This is a test message",
  "priority": "LOW"
}
```

When the queue worker processes the job and Firebase updates the notification status, the WebSocket server emits `notification.created` to that user.

#### 2) From backend code (inside another NestJS module)

Inject `NotificationService` and call `sendNotification(...)`:

```ts
constructor(
  private readonly notificationService: NotificationService,
) {}

await this.notificationService.sendNotification({
  userId: '65f1c2b8a4d3c91234abcd12',
  title: 'Order update',
  body: 'Your order is confirmed',
  priority: 'LOW',
});
```

`sendNotification(...)` enqueues delivery via Redis/Bull. After the queue worker finishes, connected clients for `userId` receive `notification.created`.

#### 3) Manual realtime emit (advanced)

If you need to emit an event without queue/Firebase, inject `NotificationRealtimeService`:

```ts
constructor(
  private readonly realtime: NotificationRealtimeService,
) {}

this.realtime.emitNotificationCreated({
  notificationId: '...',
  userId: '...',
  title: '...',
  body: '...',
  type: 'GENERAL',
  status: 'PENDING',
});
```
## Notification preference system

Preference resolution is handled by `PreferencesService.resolveChannels(...)`.

Order of evaluation:

1. If user preferences are missing -> requested channels are allowed as-is.
2. If `globalEnabled` is `false` -> all channels are blocked.
3. If a matching `typePreferences[].enabled` is `false` -> all channels for that type are blocked.
4. Remaining channels are filtered by:
   - `channelDefaults[channel] !== false`
   - membership in `typePreferences[].channels` (if type preference exists)

Example behavior:

- Requested: `IN_APP, PUSH`
- `globalEnabled=true`
- `channelDefaults.PUSH=false`
- Result: only `IN_APP` is sent.

## Notification lifecycle (request to delivery)

1. Client calls `POST /api/v1/notifications/test`.
2. `NotificationService.sendNotification(...)` resolves allowed channels using preferences.
3. If no channels remain, request completes successfully but queueing is skipped.
4. Allowed payload is enqueued to Bull (`notification-queue`, `send-push-notification`).
5. `QueueProcessor` consumes the job and calls `FirebaseService.sendNotification(...)`.
6. `FirebaseService` creates notification document with `PENDING` statuses.
7. Each channel is processed:
   - `IN_APP` -> DB channel status `SENT`
   - `PUSH` -> FCM multicast send + token cleanup + DB channel status update
8. Notification final status is set to `SENT` or `FAILED`.

## Testing

From `package.json` scripts:

```bash
npm run test            # unit tests
npm run test:watch      # watch mode
npm run test:cov        # coverage
npm run test:e2e        # e2e tests (./test/jest-e2e.json)
npm run test:debug      # debug mode
```

## Known limitations / TODOs currently visible in code

- `FirebaseService` has explicit placeholders for future channel implementations:
  - `EMAIL`
  - `SMS`
- `GET /users` is currently a scaffold endpoint returning an empty array.
- `JWT_SECRET` has a hardcoded fallback in auth module; should be provided by environment.
- `GET /devices/:userId` is protected by JWT guard but does not currently enforce ownership checks in controller/service.

## Recommended team usage pattern

- Controllers stay thin (validate input, call service).
- Domain services decide notification intent.
- Use `QueueService` for async delivery.
- Keep Firebase call centralized in `QueueProcessor` (single delivery path).
- Keep preference checks in `NotificationService` before queueing.
- Add your own modules (orders, billing, campaigns) and inject queue/firebase providers as needed.

## Quick troubleshooting

- App fails at startup with config error: check missing `.env` variables.
- JWT-protected routes fail with `401`: verify `JWT_SECRET` and Bearer token.
- Jobs not processed: verify Redis is up (`docker compose ps`) and queue processor logs are present.
- Firebase send errors: verify service-account values and private key format.
- Push skipped for user: verify preferences (`globalEnabled`, channel defaults, type preferences).
- Mongo connection issues: verify `MONGODB_URI` and container health.
