import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { HomeCmsService } from './home-cms.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

function ensureUploadsDir() {
  const uploadDir = join(process.cwd(), 'uploads', 'home-cms');

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  return uploadDir;
}

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

@Controller('home-cms')
export class HomeCmsController {
  constructor(private readonly homeCms: HomeCmsService) {}

  @Get('public')
  getPublicHome() {
    return this.homeCms.getPublicHome();
  }

  @Get('admin')
  getAdminHome() {
    return this.homeCms.getAdminHome();
  }

  @Put('admin/promo')
  savePromo(
    @Body()
    body: {
      promoTitleRu?: string | null;
      promoTitleKk?: string | null;
      promoImageUrl?: string | null;
      promoIsActive?: boolean;
    },
  ) {
    return this.homeCms.savePromo(body);
  }

  @Put('admin/categories')
  saveCategories(
    @Body()
    body: {
      categories?: Array<{
        id?: string;
        titleRu?: string;
        titleKk?: string;
        imageUrl?: string | null;
        sortOrder?: number;
        isActive?: boolean;
      }>;
    },
  ) {
    return this.homeCms.saveCategories(body);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, ensureUploadsDir());
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname || '').toLowerCase();
          const baseName = (file.originalname || 'image').replace(extension, '');
          const safeBaseName = sanitizeFileName(baseName) || 'image';
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

          cb(null, `${safeBaseName}-${uniqueSuffix}${extension}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];

        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const extension = extname(file.originalname || '').toLowerCase();

        if (
          !allowedMimeTypes.includes(file.mimetype) ||
          !allowedExtensions.includes(extension)
        ) {
          return cb(
            new BadRequestException('Разрешены только JPG, JPEG, PNG, WEBP'),
            false,
          );
        }

        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Файл не был загружен');
    }

    return {
      url: `/uploads/home-cms/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }
}