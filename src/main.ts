import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClientExceptionFilter } from 'nestjs-prisma';
import { AppModule } from './app.module';
import {
  CorsConfig,
  NestConfig,
  SwaggerConfig,
} from './configs/config.interface';
import * as express from 'express';

// Boot Strap
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation
  // strip validated object of any properties that don't have any decorator
  // transform incoming network payloads into DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // enable shutdown hook
  app.enableShutdownHooks();

  // Prisma Client Exception Filter for unhandled exceptions
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  const configService = app.get(ConfigService);
  const nestConfig = configService.get<NestConfig>('nest');
  const corsConfig = configService.get<CorsConfig>('cors');
  const swaggerConfig = configService.get<SwaggerConfig>('swagger');

  if (!nestConfig) throw new Error('Nest configuration missing');
  if (!corsConfig) throw new Error('CORS configuration missing');
  if (!swaggerConfig) throw new Error('Swagger configuration missing');

  // Swagger Api
  if (swaggerConfig.enabled) {
    const options = new DocumentBuilder()
      .setTitle(swaggerConfig.title || 'Nestjs')
      .setDescription(swaggerConfig.description || 'The nestjs API description')
      .setVersion(swaggerConfig.version || '1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT access authorization',
          description: 'Enter JWT access token',
          in: 'header',
        },
        'JWT-creator',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT access authorization',
          description: 'Enter JWT access token',
          in: 'header',
        },
        'JWT-user',
      )
      .build();
    const document = SwaggerModule.createDocument(app, options);

    SwaggerModule.setup(swaggerConfig.path || 'api', app, document, {
      swaggerOptions: {
        persistAuthorization: swaggerConfig.persistAuthorization || false,
      },
    });
  }

  // Cors
  if (corsConfig.enabled) {
    app.enableCors();
  }

  app.use(express.static('public'));
  await app.listen(process.env.PORT || nestConfig.port || 3005);
}

bootstrap();
