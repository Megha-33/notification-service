import { Injectable, Logger } from '@nestjs/common';
import { DeviceRepository } from './repositories/device.repositories';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly devicesRepository: DeviceRepository) { }

  async getUserDevices(userId: string, page: number, limit: number) {
    this.logger.log('Fetching user devices', { userId, page, limit });

    const data = await this.devicesRepository.findDevicesByUserId(userId.toString(), page, limit);

    this.logger.log('Fetched user devices successfully', {
      userId,
      page,
      limit,
      total: data.total,
      returnedCount: data.devices.length,
    });

    return data;
  }
}
