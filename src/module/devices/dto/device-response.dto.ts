import { ApiProperty } from '@nestjs/swagger';

export class DeviceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fcmToken: string;

  @ApiProperty({ enum: ['android', 'ios', 'web'] })
  deviceType: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  lastUsedAt: Date;

  @ApiProperty()
  createdAt: Date;
}