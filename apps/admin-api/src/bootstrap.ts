import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { safeCorrelationId } from '@matiq/backend';
import { AppModule } from './app.module';

type RequestLike = { header(name: string): string | undefined; method: string; path: string };
type ResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: 'finish', listener: () => void): void;
};

function requestObservability(service: string) {
  return (request: RequestLike, response: ResponseLike, next: () => void) => {
    const correlationId = safeCorrelationId(request.header('x-correlation-id'));
    const startedAt = performance.now();
    response.setHeader('x-correlation-id', correlationId);
    response.on('finish', () => {
      if (process.env.NODE_ENV === 'test') return;
      console.info(
        JSON.stringify({
          message: 'http_request_completed',
          service,
          correlationId,
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        }),
      );
    });
    next();
  };
}

export async function createApp() {
  const app = await NestFactory.create(AppModule);
  app.use(requestObservability('admin-api'));
  app.enableCors({
    origin: process.env.ADMIN_WEB_URL ?? 'http://localhost:3001',
    credentials: true,
  });
  const config = new DocumentBuilder().setTitle('MATIQ Admin API').setVersion('0.1.0').build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  return { app, document };
}
