import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  httpMetricsMiddleware,
  safeCorrelationId,
  validateEmailEncryptionConfiguration,
} from '@matiq/backend';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { apiMetrics } from './shared/infrastructure/metrics';

export async function createApp() {
  validateEmailEncryptionConfiguration();
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(httpMetricsMiddleware('user-api', apiMetrics, safeCorrelationId));
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: [
      process.env.WEB_URL ?? 'http://localhost:3000',
      process.env.ADMIN_WEB_URL ?? 'http://localhost:3001',
    ],
    credentials: true,
  });
  const config = new DocumentBuilder().setTitle('MATIQ User API').setVersion('0.1.0').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  return { app, document };
}
