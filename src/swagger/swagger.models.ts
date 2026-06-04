import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SwaggerSuccessEnvelopeDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Success' })
  message: string;

  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  data: unknown;

  @ApiProperty({
    example: null,
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  meta: Record<string, unknown> | null;

  @ApiProperty({
    example: '2026-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  timestamp: string;
}

export class SwaggerErrorDetailDto {
  @ApiProperty({ example: 'field_name' })
  field: string;

  @ApiProperty({ example: 'Invalid value' })
  message: string;
}

export class SwaggerErrorBodyDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string;

  @ApiProperty({ example: 400 })
  statuscode: number;

  @ApiPropertyOptional({ type: () => [SwaggerErrorDetailDto] })
  details?: SwaggerErrorDetailDto[];
}

export class SwaggerErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiProperty({ type: SwaggerErrorBodyDto })
  error: SwaggerErrorBodyDto;

  @ApiProperty({
    example: '2026-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  timestamp: string;
}