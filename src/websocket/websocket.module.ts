import { Global, Module } from '@nestjs/common';

import { JwtModule } from 'src/module/auth/jwt.module';
import { NotificationWsGateway } from './notification-ws.gateway';
import { NotificationRealtimeService } from './notification-realtime.service';

@Global()
@Module({
  imports: [JwtModule],
  providers: [NotificationWsGateway, NotificationRealtimeService],
  exports: [NotificationRealtimeService],
})
export class WebsocketModule {}

