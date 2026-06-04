import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { FirebaseModule } from './firebase/firebase.module';
import { QueueModule } from './queue/queue.module';
import { loggerModuleConfig } from './common/logger/winston.config';
import { UsersModule } from './module/users/users.module';
import { NotificationModule } from './module/notification/notification.module';
import { DevicesModule } from './module/devices/devices.module';
import { JwtModule } from './module/auth/jwt.module';
import { EmailModule } from './email/email.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WebsocketModule } from './websocket/websocket.module';
import { PreferencesModule } from './module/preferences/preferences.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3000),
        MONGODB_URI: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().port().required(),
        REDIS_PASSWORD: Joi.string().allow('').optional(),
        REDIS_TLS: Joi.boolean().default(false),
        QUEUE_PREFIX: Joi.string().default('notifications'),
        FIREBASE_PROJECT_ID: Joi.string().required(),
        FIREBASE_CLIENT_EMAIL: Joi.string().required(),
        FIREBASE_PRIVATE_KEY: Joi.string().required(),
        WS_NAMESPACE: Joi.string().default('notifications'),
        WS_CORS_ORIGIN: Joi.string().optional(),
        WS_PING_INTERVAL: Joi.number().optional(),
        WS_PING_TIMEOUT: Joi.number().optional(),
        WS_REDIS_ADAPTER: Joi.boolean().default(true),
        EMAIL_FROM: Joi.string().email().required(),
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().port().default(587),
        SMTP_SECURE: Joi.boolean().default(false),
        SMTP_USER: Joi.string().allow('').optional(),
        SMTP_PASS: Joi.string().allow('').optional(),
        EMAIL_TEMPLATES_DIR: Joi.string().allow('').optional(),
      }),
    }),
    EventEmitterModule.forRoot(),
    loggerModuleConfig,
    DatabaseModule,
    FirebaseModule,
    QueueModule,
    UsersModule,
    NotificationModule,
    DevicesModule,
    JwtModule,
    WebsocketModule,
    EmailModule,
    PreferencesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
