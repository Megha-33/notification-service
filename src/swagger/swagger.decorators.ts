import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  SwaggerErrorResponseDto,
  SwaggerSuccessEnvelopeDto,
} from './swagger.models';

type SwaggerSchemaOptions = {
  dataModel?: Type<unknown>;
  isArray?: boolean;
  description: string;
};

function wrappedSchema(dataModel?: Type<unknown>, isArray = false) {
  const data = dataModel
    ? isArray
      ? { type: 'array', items: { $ref: getSchemaPath(dataModel) } }
      : { $ref: getSchemaPath(dataModel) }
    : { type: 'object', additionalProperties: true };

  return {
    allOf: [
      { $ref: getSchemaPath(SwaggerSuccessEnvelopeDto) },
      {
        properties: {
          data,
        },
      },
    ],
  };
}

export function ApiWrappedOkResponse(options: SwaggerSchemaOptions) {
  return applyDecorators(
    ApiExtraModels(SwaggerSuccessEnvelopeDto, ...(options.dataModel ? [options.dataModel] : [])),
    ApiOkResponse({
      description: options.description,
      schema: wrappedSchema(options.dataModel, options.isArray),
    }),
  );
}

export function ApiWrappedCreatedResponse(options: SwaggerSchemaOptions) {
  return applyDecorators(
    ApiExtraModels(SwaggerSuccessEnvelopeDto, ...(options.dataModel ? [options.dataModel] : [])),
    ApiCreatedResponse({
      description: options.description,
      schema: wrappedSchema(options.dataModel, options.isArray),
    }),
  );
}

export function ApiDefaultErrorResponses() {
  return applyDecorators(
    ApiBadRequestResponse({
      type: SwaggerErrorResponseDto,
    }),
  );
}

// Example reusable decorators

export function ApiNotificationControllerDocs() {
  return applyDecorators(
    ApiTags('Notifications'),
    ApiBearerAuth('access-token'),
  );
}

export function ApiSendNotificationDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Send a notification' }),
    ApiWrappedOkResponse({
      description: 'Notification sent successfully',
    }),
    ApiDefaultErrorResponses(),
  );
}