import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'api', '.env') });
// Можно временно проверить:
// console.log('AUTH_DISABLED=', process.env.AUTH_DISABLED);
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      // allow server-to-server / curl / postman (no Origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`API: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  // чтобы падало понятно, а не молча
  console.error('Bootstrap failed:', err);
  process.exit(1);
});