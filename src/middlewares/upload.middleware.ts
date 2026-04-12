import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer from "multer";
import path from "path";
import { badRequest } from "../common/errors/httpErrors";
import type { AllowedFileConfig } from "../common/types/file.types";

export type UploadOptions = {
  fieldName: string;
  allowed: AllowedFileConfig;
  required?: boolean;
};

export function optionalUploadSingle(options: UploadOptions): RequestHandler {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: options.allowed.maxSizeBytes,
      files: 1,
    },
    fileFilter: (_req, file, cb) => {
      if (!options.allowed.allowedMimeTypes.includes(file.mimetype)) {
        cb(badRequest("Tipo de archivo no permitido"));
        return;
      }
      if (options.allowed.allowedExtensions?.length) {
        const ext = path.extname(file.originalname || "").toLowerCase();
        if (!ext || !options.allowed.allowedExtensions.includes(ext)) {
          cb(badRequest("Extensión de archivo no permitida"));
          return;
        }
      }
      cb(null, true);
    },
  }).single(options.fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = String(req.headers["content-type"] || "");
    const isMultipart = contentType.toLowerCase().includes("multipart/form-data");
    if (!isMultipart) {
      if (options.required) {
        return next(badRequest("Debe enviar multipart/form-data con un archivo"));
      }
      return next();
    }

    upload(req, res, (err) => {
      if (err) return next(err);
      if (options.required && !req.file) return next(badRequest("Archivo requerido"));
      next();
    });
  };
}
