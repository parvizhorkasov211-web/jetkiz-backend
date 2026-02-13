import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // удаляет лишние поля
      forbidNonWhitelisted: true, // ошибка если пришли лишние поля
      transform: true, // включает transform для DTO
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(3000, '0.0.0.0');

  console.log('API: http://192.168.0.16:3000');
}
bootstrap();
