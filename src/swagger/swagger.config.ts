import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function normalizeApiPrefix(prefix?: string): string {
  const normalized = prefix?.trim().replace(/^\/+|\/+$/g, '') ?? '';
  return normalized || 'api/v1';
}

export function setupSwagger(app: INestApplication, configService: ConfigService): void {
  const apiPrefix = normalizeApiPrefix(
    configService.get<string>('app.apiPrefix') ?? process.env.API_PREFIX,
  );

  const apiBasePath = `/${apiPrefix}`;

  const config = new DocumentBuilder()
    .setTitle('Notification Service API')
    .setDescription('Notification system APIs (Push, In-App) along with user preferences management')
    .setVersion('1.0.0')
    .addServer(apiBasePath, 'Base API path')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
      },
      'access-token',
    )
    .addTag('Notifications')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
  });

  SwaggerModule.setup(`${apiPrefix}/swagger`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });
}