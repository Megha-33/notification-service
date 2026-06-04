import { IsBoolean, IsEnum, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationType } from '../../notification/enums/notification.enum';

export class TypePreferenceDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.ORDER })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    enum: NotificationChannel,
    isArray: true,
    example: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];
}

export class ChannelDefaultsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  IN_APP?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  PUSH?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  EMAIL?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  SMS?: boolean;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  globalEnabled?: boolean;

  @ApiPropertyOptional({ type: [TypePreferenceDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TypePreferenceDto)
  @IsArray()
  typePreferences?: TypePreferenceDto[];

  @ApiPropertyOptional({ type: ChannelDefaultsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelDefaultsDto)
  channelDefaults?: ChannelDefaultsDto;
}