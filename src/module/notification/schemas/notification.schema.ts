import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationChannel, NotificationPriority, NotificationStatus, NotificationType } from '../enums/notification.enum';

export type NotificationDocument = Notification & Document;

//---------------- SUB-SCHEMAS ---------------- 
@Schema({ _id: false })
class NotificationAction {
  @Prop({ required: true })
  id!: string;

  @Prop({ required: true })
  label!: string;
}

@Schema({ timestamps: true })
export class Notification {

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  body!: string;

  @Prop({
    enum: NotificationType,
    default: NotificationType.GENERAL,
    index: true,
  })
  type!: NotificationType;

  @Prop()
  imageUrl?: string;

  @Prop()
  iconUrl?: string;

  @Prop()
  deepLink?: string;

  @Prop({ type: [NotificationAction], default: [] })
  actions?: NotificationAction[];

  @Prop({
    type: [String],
    enum: NotificationChannel,
    default: [NotificationChannel.IN_APP],
    index: true,
  })
  channels!: NotificationChannel[];

  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  channelStatus!: Record<string, NotificationStatus>;

  @Prop({
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
    index: true,
  })
  priority!: NotificationPriority;

  @Prop({
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
    index: true,
  })
  status!: NotificationStatus;

  @Prop({ default: false, index: true })
  isRead!: boolean;

  @Prop({ type: Date, default: null })
  readAt!: Date;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);