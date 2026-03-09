import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const uploadsRoot = join(process.cwd(), 'uploads');
  const couriersDir = join(uploadsRoot, 'couriers');
  const productsDir = join(uploadsRoot, 'products');
  const restaurantsDir = join(uploadsRoot, 'restaurants');
  const homeCmsDir = join(uploadsRoot, 'home-cms');

  try {
    if (!fs.existsSync(uploadsRoot)) {
      fs.mkdirSync(uploadsRoot, { recursive: true });
    }
    if (!fs.existsSync(couriersDir)) {
      fs.mkdirSync(couriersDir, { recursive: true });
    }
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
    }
    if (!fs.existsSync(restaurantsDir)) {
      fs.mkdirSync(restaurantsDir, { recursive: true });
    }
    if (!fs.existsSync(homeCmsDir)) {
      fs.mkdirSync(homeCmsDir, { recursive: true });
    }
  } catch (e) {
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

  app.useStaticAssets(uploadsRoot, {
    prefix: '/uploads',
  });

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`API running on http://0.0.0.0:${port}`);
}
bootstrap();