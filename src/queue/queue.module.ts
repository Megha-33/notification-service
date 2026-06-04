import { Global, Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FirebaseModule } from '../firebase/firebase.module';
import { QueueProcessor } from './queue.processor';
import { QueueService } from './queue.service';
import { NOTIFICATION_QUEUE } from './queue.constants';

const logger = new Logger('QueueModule');

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.getOrThrow<string>('redis.host');
        const port = configService.getOrThrow<number>('redis.port');
        const password = configService.get<string>('redis.password');
        const tls = configService.get<boolean>('redis.tls') ? {} : undefined;

        logger.log(`Connecting to Redis at ${host}:${port}`);

        return {
          redis: {
            host,
            port,
            password,
            tls,
          },
          prefix: configService.get<string>('redis.queuePrefix'),
        };
      },
    }),
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
    FirebaseModule,
  ],
  providers: [QueueService, QueueProcessor],
  exports: [QueueService],
})
export class QueueModule {}
