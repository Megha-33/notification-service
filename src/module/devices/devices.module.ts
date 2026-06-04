import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from './schemas/device.login.schema';
import { DeviceRepository } from './repositories/device.repositories';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Device.name, schema: DeviceSchema },
    ]),
  ],
  controllers: [DevicesController,],
  providers: [DevicesService, DeviceRepository],
  exports: [DeviceRepository],
})
export class DevicesModule { }
