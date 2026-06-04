import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationChannel, NotificationType } from '../../notification/enums/notification.enum'

export type UserNotificationPreferencesDocument = UserNotificationPreferences & Document;

@Schema({ _id: false })
class TypePreference {
  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({
    type: [String],
    enum: NotificationChannel,
    default: [NotificationChannel.IN_APP],
  })
  channels: NotificationChannel[];
}

const TypePreferenceSchema = SchemaFactory.createForClass(TypePreference);

@Schema({ timestamps: true })
export class UserNotificationPreferences {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ default: true })
  globalEnabled: boolean;

  @Prop({ type: [TypePreferenceSchema], default: [] })
  typePreferences: TypePreference[];

  @Prop({
    type: Map,
    of: Boolean,
    default: {
      [NotificationChannel.IN_APP]: true,
      [NotificationChannel.PUSH]: true,
      [NotificationChannel.EMAIL]: true,
      [NotificationChannel.SMS]: false,
    },
  })
  channelDefaults: Map<string, boolean>;
}

export const UserNotificationPreferencesSchema = SchemaFactory.createForClass(UserNotificationPreferences);