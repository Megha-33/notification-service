import { IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkNotificationReadDto {
  @ApiProperty({ example: '65f1c2b8a4d3c91234abcd12' })
  @IsMongoId()
  notificationId: string;
}