import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Device, DeviceDocument } from '../schemas/device.login.schema';

@Injectable()
export class DeviceRepository {
  constructor(
    @InjectModel(Device.name)
    private readonly deviceModel: Model<DeviceDocument>,
  ) { }

  // Find device by userId + token
  async findByUserAndDeviceId(
    userId: string,
    deviceId: string,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel.findOne({
      userId: new Types.ObjectId(userId),
      deviceId,
      // isActive: true,
    });
  }
  async findByUserAndToken(
    userId: string,
    fcmToken: string,
  ): Promise<DeviceDocument | null> {
    return this.deviceModel.findOne({
      userId: new Types.ObjectId(userId),
      fcmToken,
    });
  }

  // Get all active devices for a user (for notifications)
  async findActiveDevicesByUser(
    userId: string,
  ): Promise<DeviceDocument[]> {
    return this.deviceModel.find({
      userId,
      isActive: true,
    });
  }

  // Create new device
  async createDevice(data: Partial<Device>): Promise<DeviceDocument> {
    return this.deviceModel.create(data);
  }

  // Update existing device (login case)
  async updateDevice(
    userId: string,
    fcmToken: string,
  ): Promise<void> {
    await this.deviceModel.updateOne(
      { userId, fcmToken },
      {
        isActive: true,
        lastUsedAt: new Date(),
      },
    );
  }

  async updateDeviceById(
    id: Types.ObjectId,
    data: Partial<Device>,
  ): Promise<void> {
    await this.deviceModel.updateOne(
      { _id: id },
      {
        $set: {
          ...data,
          lastLoginAt: new Date(),
        },
      },
    );
  }

  // Deactivate all devices of a user (optional)
  async deactivateAllDevices(userId: string): Promise<void> {
    await this.deviceModel.updateMany(
      { userId },
      { isActive: false },
    );
  }

  async deactivateDevice(userId: string, deviceId: string) {
    return this.deviceModel.updateOne(
      {
        userId: new Types.ObjectId(userId),
        deviceId,
      },
      {
        isActive: false,
      },
    );
  }


  // Remove invalid token (Firebase failure case)
  async deleteByToken(fcmToken: string): Promise<void> {
    await this.deviceModel.deleteOne({ fcmToken });
  }

  // Find by token (optional utility)
  async findByToken(fcmToken: string): Promise<DeviceDocument | null> {
    return this.deviceModel.findOne({ fcmToken });
  }

  async findDevicesByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    devices: DeviceDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = { userId: new Types.ObjectId(userId) };

    const [devices, total] = await Promise.all([
      this.deviceModel
        .find(query)
        .select('-fcmToken -access_token')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.deviceModel.countDocuments(query),
    ]);

    return {
      devices,
      total,
      page,
      limit,
    };
  }


  async getActiveFcmTokensByUserId(userId: Types.ObjectId): Promise<string[]> {
    const devices = await this.deviceModel.find({
      userId,
      isActive: true,
      fcmToken: { $ne: null },
    });

    return devices.map(d => d.fcmToken);
  }

  async removeInvalidTokens(tokens: string[]) {
    await this.deviceModel.updateMany(
      { fcmToken: { $in: tokens } },
      {
        $set: {
          isActive: false,
          fcmToken: null,
        },
      }
    );
  }

  async getLastActiveDevice(userId: Types.ObjectId) {
    return this.deviceModel.findOne({
      userId,
      isActive: true,
      fcmToken: { $ne: null },
    }).sort({ lastLoginAt: -1 });
  }

  async deleteByTokens(tokens: string[]) {

    await this.deviceModel.deleteMany({ fcmToken: { $in: tokens } });
  }
}