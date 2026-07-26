import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { ApiError } from '../utils/ApiError';

// Files are held in memory and passed straight to Nodemailer as attachments -
// nothing is written to disk, so the server stays stateless.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'image/png',
  'image/jpeg',
  'text/plain',
]);

const storage = multer.memoryStorage();

function fileFilter(req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.uploads.maxBytes,
    files: 1,
  },
});

// Wraps multer so its errors (e.g. file too large) become clean ApiErrors.
function singleUpload(fieldName: string) {
  const handler = upload.single(fieldName);
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, (err: unknown) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest(`File too large. Max ${config.uploads.maxMb} MB.`));
        }
        return next(ApiError.badRequest(err.message));
      }
      return next(err);
    });
  };
}

export { singleUpload };
export default { singleUpload };
