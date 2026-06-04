import { IsArray, ArrayNotEmpty, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkMarkAsReadDto {
  @ApiProperty({
    example: [
      '65f1c2b8a4d3c91234abcd12',
      '65f1c2b8a4d3c91234abcd34',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  ids: string[];
}