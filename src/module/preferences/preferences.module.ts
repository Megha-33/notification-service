import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UserNotificationPreferences,
  UserNotificationPreferencesSchema,
} from '../preferences/schemas/preferences.schema';
import { PreferencesRepository } from '../preferences/repositories/preferences.repository';
import { PreferencesService } from '../preferences/preferences.service';
import { PreferencesController } from '../preferences/preferences.contoller';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: UserNotificationPreferences.name,
        schema: UserNotificationPreferencesSchema,
      },
    ]),
  ],
  controllers: [PreferencesController],
  providers: [PreferencesService, PreferencesRepository],
  exports: [PreferencesService, PreferencesRepository],
})
export class PreferencesModule { }