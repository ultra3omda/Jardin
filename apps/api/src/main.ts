// IMPORTANT: ./instrument MUST be imported FIRST so Sentry can auto-patch
// Node's HTTP + Express stack before AppModule (and therefore Nest) load.
// Do not reorder these imports.
import './instrument';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { isAllowedOrigin } from './common/config/cors-origin';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  // Railway and some PaaS providers inject PORT — honour it; fall back to apiPort.
  const port =
    parseInt(process.env.PORT ?? '', 10) || config.get<number>('apiPort', 4000);
  const corsOrigin = config.get<string[]>('corsOrigin', ['http://localhost:3000']);
  const isProduction = config.get<string>('nodeEnv') === 'production';

  app.use(
    helmet({
      // In development, disable CSP so the Swagger UI inline scripts work.
      // In production, use an explicit policy rather than relying on Helmet's
      // opinionated default — this makes the intent auditable.
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              fontSrc: ["'self'"],
              connectSrc: ["'self'"],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      // Prevent clickjacking.
      frameguard: { action: 'deny' },
      // Prevent MIME-type sniffing.
      noSniff: true,
      // Only send the origin (no path) as Referer header.
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.enableCors({
    // Accept the static allowlist OR any https://<slug>.klasso.tn (D6). The
    // Host/Origin NEVER drives tenant isolation (D3) — this only gates CORS.
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin, corsOrigin)),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ecole SaaS API')
    .setDescription('Multi-tenant API for school management')
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Bind to 0.0.0.0 explicitly so the server reachable on both IPv4 and IPv6
  // — Node 18+ resolves "localhost" to ::1 first, which can cause CI healthcheck
  // failures if the server only listens on IPv6 by default.
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap API:', err);
  process.exit(1);
});
