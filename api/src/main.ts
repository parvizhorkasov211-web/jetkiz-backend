// api/src/main.ts
import 'reflect-metadata';
import 'dotenv/config';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // ✅ гарантируем папки для загрузок
  const uploadsRoot = join(process.cwd(), 'uploads');
  const couriersDir = join(uploadsRoot, 'couriers');
  const productsDir = join(uploadsRoot, 'products'); // ✅ NEW

  try {
    if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
    if (!fs.existsSync(couriersDir)) fs.mkdirSync(couriersDir, { recursive: true });
    if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true }); // ✅ NEW
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to init uploads directories:', e);
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // ✅ раздаём загруженные файлы как статику
  // avatarUrl будет вида: /uploads/couriers/<filename>
  app.useStaticAssets(uploadsRoot, {
    prefix: '/uploads',
  });

  // CORS (если нужно для админки/мобилок)
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}
bootstrap();