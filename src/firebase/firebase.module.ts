import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { NotificationModule } from '../module/notification/notification.module';
import { NotificationListener } from './event.listener';
import { DevicesModule } from '../module/devices/devices.module';

@Global()
@Module({
  imports: [NotificationModule, DevicesModule],
  providers: [FirebaseService, NotificationListener],
  exports: [FirebaseService, NotificationListener],
})
export class FirebaseModule { }
