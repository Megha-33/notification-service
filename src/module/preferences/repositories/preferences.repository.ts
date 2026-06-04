import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserNotificationPreferences,
  UserNotificationPreferencesDocument,
} from '../schemas/preferences.schema';
import { UpdatePreferencesDto } from '../dtos/preferences.dto';

@Injectable()
export class PreferencesRepository {
  constructor(
    @InjectModel(UserNotificationPreferences.name)
    private readonly model: Model<UserNotificationPreferencesDocument>,
  ) { }

  async findByUserId(userId: string) {
    return this.model.findOne({ userId: new Types.ObjectId(userId) });
  }

  async upsert(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<UserNotificationPreferencesDocument> {
    const update: Record<string, any> = {};

    if (dto.globalEnabled !== undefined) {
      update.globalEnabled = dto.globalEnabled;
    }

    if (dto.channelDefaults) {
      for (const [channel, value] of Object.entries(dto.channelDefaults)) {
        update[`channelDefaults.${channel}`] = value;
      }
    }

    if (dto.typePreferences) {
      update.typePreferences = dto.typePreferences;
    }

    return this.model.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: update },
      { upsert: true, new: true },
    );
  }
}