import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export function courierPhotoStorage() {
  return diskStorage({
    destination: (req: any, file, cb) => {
      const courierId = req.params?.id;
      const uploadPath = path.join(process.cwd(), 'uploads', 'couriers', courierId);

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname);
      cb(null, `${randomUUID()}${ext}`);
    },
  });
}

export function photoFileFilter(req: any, file: any, cb: any) {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = extname(file.originalname).toLowerCase();

  if (!allowed.includes(ext)) {
    return cb(new Error('Invalid file type'), false);
  }

  cb(null, true);
}