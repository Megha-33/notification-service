import { Injectable, Logger } from '@nestjs/common';
import { PreferencesRepository } from './repositories/preferences.repository';
import { UpdatePreferencesDto } from './dtos/preferences.dto';
import { NotificationChannel, NotificationType } from '../notification/enums/notification.enum';

@Injectable()
export class PreferencesService {
  private readonly logger = new Logger(PreferencesService.name);

  constructor(private readonly preferencesRepository: PreferencesRepository) { }

  async getPreferences(userId: string) {
    const prefs = await this.preferencesRepository.findByUserId(userId);
    if (!prefs) {
      this.logger.warn('Preferences not found. Creating defaults', { userId });
      const createdPrefs = await this.preferencesRepository.upsert(userId, {});

      this.logger.log('Default preferences created', { userId });
      return createdPrefs;
    }
    return prefs;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.preferencesRepository.upsert(userId, dto);
  }

  // Called by NotificationService before dispatching
  async resolveChannels(
    userId: string,
    type: NotificationType,
    requestedChannels: NotificationChannel[],
  ): Promise<NotificationChannel[]> {
    this.logger.log('Resolving notification channels', {
      userId,
      type,
      requestedChannels,
    });

    const prefs = await this.preferencesRepository.findByUserId(userId);

    if (!prefs) {
      this.logger.warn('No preferences found. Using requested channels', {
        userId,
        type,
        allowedChannels: requestedChannels,
        skippedReason: 'preferences_not_found',
      });
      return requestedChannels;
    }

    if (!prefs.globalEnabled) {
      this.logger.warn('All channels skipped: global preferences disabled', {
        userId,
        type,
        requestedChannels,
        skippedReason: 'global_disabled',
      });
      return [];
    }

    const typePref = prefs.typePreferences.find((p) => p.type === type);
    if (typePref && !typePref.enabled) {
      this.logger.warn('All channels skipped: notification type disabled', {
        userId,
        type,
        requestedChannels,
        skippedReason: 'type_disabled',
      });
      return [];
    }

    const allowedByType = typePref?.channels ?? requestedChannels;

    const skippedChannels: Array<{ channel: NotificationChannel; reason: string }> = [];

    const allowedChannels = requestedChannels.filter((channel) => {
      const channelDefault =
        prefs.channelDefaults instanceof Map
          ? prefs.channelDefaults.get(channel)
          : (prefs.channelDefaults as Record<string, boolean> | undefined)?.[channel];

      const globallyEnabled = channelDefault !== false;
      const typeEnabled = allowedByType.includes(channel);

      if (!globallyEnabled) {
        skippedChannels.push({ channel, reason: 'channel_disabled_in_defaults' });
      } else if (!typeEnabled) {
        skippedChannels.push({ channel, reason: 'channel_disabled_for_type' });
      }

      return globallyEnabled && typeEnabled;
    });

    if (skippedChannels.length > 0) {
      this.logger.warn('Some channels skipped during preference resolution', {
        userId,
        type,
        skippedChannels,
      });
    }
    return allowedChannels;
  }
}