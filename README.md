# Notification Service (NestJS)

A scalable and production-ready notification service built with NestJS. This repository provides the core infrastructure required to manage, process, and deliver notifications across multiple channels, allowing feature teams to integrate notification capabilities with minimal setup.

The project focuses on shared platform components such as authentication, notification preferences, queue processing, Firebase integration, and device management, enabling teams to quickly build and extend notification workflows.

## Key Features

This service includes:

* Modular NestJS architecture generated with the Nest CLI
* Environment-based configuration management using `ConfigModule`
* MongoDB integration through `MongooseModule`
* Redis-backed asynchronous processing with Bull queues
* Background workers for notification delivery
* Firebase Admin SDK integration for push notifications
* Structured application logging with Winston
* JWT-based authentication and route protection
* User notification preference management and channel resolution
* Versioned API routing via `/api/v1`

## Purpose

The service serves as a complete notification platform foundation, providing:

* User registration, authentication, and JWT token management
* Device registration and FCM token tracking
* User notification preference management
* Notification creation, retrieval, and read-state tracking
* Asynchronous notification processing through Redis and Bull
* Firebase push delivery with automatic invalid-token cleanup

## Architecture Flow

```text
Client/API Controller
  → Feature Service (validation + preference resolution)
  → QueueService.enqueuePushNotification(...)
  → Bull Queue (Redis) [notification-queue]
  → QueueProcessor (@Process send-push-notification)
  → FirebaseService.sendNotification(...)
  → Notification status updates
  → FCM delivery and token cleanup
```

## Technology Stack

| Layer              | Package                                           | Version                        |
| ------------------ | ------------------------------------------------- | ------------------------------ |
| Framework          | `@nestjs/common`, `@nestjs/core`                  | `^11.0.1`                      |
| Validation         | `class-validator`, `class-transformer`            | `^0.14.4`, `^0.5.1`            |
| Configuration      | `@nestjs/config`                                  | `^4.0.3`                       |
| Database           | `mongoose`, `@nestjs/mongoose`                    | `^9.3.3`, `^11.0.4`            |
| Queue Processing   | `bull`, `@nestjs/bull`                            | `^4.16.5`, `^11.0.4`           |
| Push Notifications | `firebase-admin`                                  | `^13.7.0`                      |
| Authentication     | `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` | `^11.0.2`, `^11.0.5`, `^4.0.1` |
| API Documentation  | `@nestjs/swagger`                                 | `^11.2.6`                      |
| Logging            | `nest-winston`, `winston`                         | `^1.10.2`, `^3.19.0`           |
| Runtime            | Node.js                                           | `20+`                          |
| Language           | TypeScript                                        | `^5.7.3`                       |

## Design Principles

* **Asynchronous by default** – Notification delivery is handled through queues to avoid impacting API response times.
* **Extensible architecture** – New business modules can integrate notification capabilities without modifying core infrastructure.
* **Centralized delivery pipeline** – All notification processing flows through a consistent and observable delivery path.
* **User-controlled communication** – Notification preferences are respected before delivery is attempted.
* **Production-focused** – Includes retry mechanisms, logging, authentication, API versioning, and scalable queue processing.

This repository is intended to act as the shared notification platform for applications requiring in-app notifications, push notifications, and future support for additional channels such as email and SMS.
