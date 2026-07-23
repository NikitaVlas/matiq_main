import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

export async function createApp() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
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
