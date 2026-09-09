import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // Production-grade CORS configuration
  const allowedOrigins = [
    'https://www.appnix.co.in',
    'https://appnix.co.in',
    'https://app.appnix.co.in',
    'https://admin.appnix.co.in',
    'https://superadmin.appnix.co.in',
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      const isAllowedSubdomain = Boolean(origin && /^https:\/\/([a-zA-Z0-9-]+\.)?appnix\.co\.in$/.test(origin));
      if (!origin || allowedOrigins.includes(origin) || isAllowedSubdomain || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Tenant-Id',
      'x-hub-signature-256',
      'x-webhook-signature',
      'x-webhook-timestamp',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Appnix SaaS API')
    .setDescription('Appnix Enterprise Omnichannel SaaS API — Production Engine')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`Backend server running on http://${host}:${port}/api/v1`);
}

bootstrap();
