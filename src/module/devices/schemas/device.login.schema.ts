import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceDocument = Device & Document;

export enum DeviceType {
    ANDROID = 'android',
    IOS = 'ios',
    WEB = 'web',
}

@Schema({
    timestamps: { createdAt: true, updatedAt: true },
})
export class Device {
    @Prop({
        type: Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    })
    userId: Types.ObjectId;

    @Prop({
        required: true,
        index: true,
    })
    fcmToken: string;

    @Prop({
        required: true,
    })
    deviceId: string;

    @Prop({
        enum: DeviceType,
        required: true,
    })
    deviceType: DeviceType;

    @Prop({
        required: true,
        index: true,
    })
    access_token: string;

    @Prop({
        default: true,
        index: true,
    })
    isActive: boolean;

    @Prop({
        default: Date.now,
    })
    lastLoginAt: Date;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);

DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

