import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

export async function createApp() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.ADMIN_WEB_URL ?? 'http://localhost:3001',
    credentials: true,
  });
  const config = new DocumentBuilder().setTitle('MATIQ Admin API').setVersion('0.1.0').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  return { app, document };
}
