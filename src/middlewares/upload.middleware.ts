import type { NextFunction, Request, RequestHandler, Response } from "express";
import crypto from "crypto";
import fs from "fs";
import multer from "multer";
import os from "os";
import path from "path";
import { badRequest } from "../common/errors/httpErrors";
import type { AllowedFileConfig } from "../common/types/file.types";

export type UploadOptions = {
  fieldName: string;
  allowed: AllowedFileConfig;
  required?: boolean;
};

const TEMP_UPLOAD_DIR = path.join(os.tmpdir(), "cfuturo-uploads");
fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

function cleanupTempFile(file?: Express.Multer.File): void {
  const filePath = typeof file?.path === "string" ? file.path : "";
  if (!filePath) return;

  void fs.promises.unlink(filePath).catch((err: NodeJS.ErrnoException) => {
    if (err?.code !== "ENOENT") {
      console.warn("[upload] No se pudo eliminar archivo temporal", err);
    }
  });
}

export function optionalUploadSingle(options: UploadOptions): RequestHandler {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, TEMP_UPLOAD_DIR),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
      },
    }),
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
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            badRequest(
              `Archivo demasiado grande. Máximo permitido: ${Math.floor(options.allowed.maxSizeBytes / (1024 * 1024))} MB`
            )
          );
        }
        if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
          return next(badRequest("Solo se permite un archivo por solicitud"));
        }
        return next(badRequest("No se pudo procesar el archivo enviado"));
      }

      if (err) return next(err);
      if (req.file && req.file.size <= 0) {
        cleanupTempFile(req.file);
        return next(badRequest("El archivo está vacío"));
      }
      if (req.file) {
        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          cleanupTempFile(req.file);
        };
        res.once("finish", cleanup);
        res.once("close", cleanup);
      }
      if (options.required && !req.file) return next(badRequest("Archivo requerido"));
      next();
    });
  };
}
