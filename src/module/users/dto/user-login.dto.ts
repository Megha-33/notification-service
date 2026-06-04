import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
} from 'class-validator';

export enum DeviceType {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'StrongPassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'fcm_device_token_here' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @ApiProperty({ example: 'device-unique-id-12345' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ enum: DeviceType, example: DeviceType.ANDROID })
  @IsEnum(DeviceType)
  deviceType: DeviceType;
}