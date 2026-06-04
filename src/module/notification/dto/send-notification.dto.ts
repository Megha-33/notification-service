import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationPriority, NotificationChannel } from '../enums/notification.enum';


// DTO for individual notification actions
class NotificationActionDto {
  @ApiProperty({ example: 'OPEN_APP' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Open' })
  @IsString()
  label!: string;
}

export class SendNotificationDto {
  @ApiProperty({ example: 'user_id_here' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: 'GENERAL' })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ example: 'Test Notification' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'This is a test message' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/icon.png' })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ example: 'app://notifications/123' })
  @IsOptional()
  @IsString()
  deepLink?: string;

  @ApiPropertyOptional({
    type: [NotificationActionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationActionDto)
  actions?: NotificationActionDto[];

  @ApiProperty({ enum: NotificationPriority, example: 'LOW' })
  @IsEnum(NotificationPriority)
  priority!: NotificationPriority;

  @ApiPropertyOptional({
    example: { orderId: '12345', source: 'system' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    example: ['IN_APP', 'PUSH'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];
}