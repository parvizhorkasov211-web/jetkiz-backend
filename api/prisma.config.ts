import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',

  // В Prisma 7 seed настраивается здесь
  migrations: {
    seed: 'node prisma/seed.js',
  },

  // Иногда Prisma просит datasource в конфиге — дадим явно
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
