import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";
import type { Readable } from "stream";
import { badRequest, serviceUnavailable } from "../errors/httpErrors";
import type { AllowedFileConfig, UploadedFile } from "../types/file.types";
import { buildPublicUrl, sanitizeFilename } from "../utils/file.util";
import { getS3Client, getS3Config } from "../../config/s3";

export type UploadInput = {
  module: string; // e.g. "lessons"
  keyPrefix: string; // e.g. "lessons/course-1/module-2"
  originalName: string;
  buffer: Buffer;
  mimeType: string;
  allowed: AllowedFileConfig;
};

export type DownloadSignedUrlInput = {
  key: string;
  originalName: string;
  contentType?: string | null;
  expiresInSeconds?: number;
};

export type DownloadStreamResult = {
  body: Readable;
  contentType: string;
  contentLength?: number;
  contentDisposition: string;
};

const DEFAULT_DOWNLOAD_EXPIRES_IN_SECONDS = 5 * 60;

function inferContentTypeFromFilename(filename: string): string {
  const ext = path.extname(filename || "").toLowerCase();
  const contentTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".txt": "text/plain; charset=utf-8",
    ".zip": "application/zip",
    ".doc": "application/msword",
    ".xls": "application/vnd.ms-excel",
    ".ppt": "application/vnd.ms-powerpoint",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
  };
  return contentTypes[ext] ?? "application/octet-stream";
}

function encodeRFC5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function buildAttachmentContentDisposition(originalName: string): string {
  const baseName = path.basename(originalName || "archivo");
  const fallbackName = sanitizeFilename(baseName).replace(/["\\]/g, "") || "archivo";
  const encodedName = encodeRFC5987(baseName.replace(/[\r\n]/g, "").trim() || fallbackName);
  return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
}

export async function generateS3DownloadSignedUrl(input: DownloadSignedUrlInput): Promise<string> {
  const cfg = getS3Config();
  const s3 = getS3Client();
  const expiresIn = input.expiresInSeconds ?? DEFAULT_DOWNLOAD_EXPIRES_IN_SECONDS;

  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: input.key,
        ResponseContentDisposition: buildAttachmentContentDisposition(input.originalName),
        ResponseContentType: input.contentType || inferContentTypeFromFilename(input.originalName),
      }),
      { expiresIn }
    );
  } catch {
    throw serviceUnavailable("No se pudo generar el enlace temporal de descarga. Intenta más tarde.");
  }
}

export class StorageService {
  async uploadBuffer(input: UploadInput): Promise<UploadedFile> {
    if (input.buffer.length > input.allowed.maxSizeBytes) {
      throw badRequest("Archivo demasiado grande");
    }
    if (!input.allowed.allowedMimeTypes.includes(input.mimeType)) {
      throw badRequest("Tipo de archivo no permitido");
    }
    if (input.allowed.allowedExtensions?.length) {
      const ext = path.extname(input.originalName || "").toLowerCase();
      if (!ext || !input.allowed.allowedExtensions.includes(ext)) {
        throw badRequest("Extensión de archivo no permitida");
      }
    }

    const cfg = getS3Config();
    const s3 = getS3Client();

    const safeName = sanitizeFilename(input.originalName);
    const ts = Date.now();
    const rand = crypto.randomUUID();
    const key = `${input.keyPrefix}/${ts}-${rand}-${safeName}`.replace(/\/+/g, "/");

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
          Body: input.buffer,
          ContentType: input.mimeType,
        })
      );
    } catch {
      throw serviceUnavailable("No se pudo subir el archivo. Intenta más tarde.");
    }

    return {
      key,
      url: buildPublicUrl(cfg.baseUrl, key),
      mimeType: input.mimeType,
      size: input.buffer.length,
    };
  }

  async deleteByKey(key: string): Promise<void> {
    const cfg = getS3Config();
    const s3 = getS3Client();
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    } catch {
      throw serviceUnavailable("No se pudo eliminar el archivo. Intenta más tarde.");
    }
  }

  async createDownloadSignedUrl(input: DownloadSignedUrlInput): Promise<string> {
    return generateS3DownloadSignedUrl(input);
  }

  async createDownloadStream(input: DownloadSignedUrlInput): Promise<DownloadStreamResult> {
    const cfg = getS3Config();
    const s3 = getS3Client();

    try {
      const result = await s3.send(
        new GetObjectCommand({
          Bucket: cfg.bucket,
          Key: input.key,
        })
      );
      const body = result.Body;
      if (!body || typeof (body as { pipe?: unknown }).pipe !== "function") {
        throw new Error("S3 object body is not streamable");
      }

      return {
        body: body as Readable,
        contentType:
          input.contentType || result.ContentType || inferContentTypeFromFilename(input.originalName),
        contentLength: result.ContentLength,
        contentDisposition: buildAttachmentContentDisposition(input.originalName),
      };
    } catch {
      throw serviceUnavailable("No se pudo descargar el archivo. Intenta más tarde.");
    }
  }
}

const dedupe = (items: string[]) => Array.from(new Set(items));

const PDF_EXTENSIONS = [".pdf"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const TASK_DOC_EXTENSIONS = [".txt", ".zip", ".doc", ".xls", ".ppt", ".docx", ".xlsx", ".pptx"];

export const ALLOWED_PDFS: AllowedFileConfig = {
  maxSizeBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ["application/pdf"],
  allowedExtensions: PDF_EXTENSIONS,
};

export const ALLOWED_VIDEOS: AllowedFileConfig = {
  maxSizeBytes: 50 * 1024 * 1024,
  allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
  allowedExtensions: VIDEO_EXTENSIONS,
};

export const ALLOWED_IMAGES: AllowedFileConfig = {
  maxSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  allowedExtensions: IMAGE_EXTENSIONS,
};

export const ALLOWED_PAYMENT_PROOFS: AllowedFileConfig = {
  maxSizeBytes: 10 * 1024 * 1024,
  allowedMimeTypes: ["application/pdf"],
  allowedExtensions: PDF_EXTENSIONS,
};

export const ALLOWED_ANNOUNCEMENT_FILES: AllowedFileConfig = {
  maxSizeBytes: 10 * 1024 * 1024,
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
  allowedExtensions: dedupe([...PDF_EXTENSIONS, ...IMAGE_EXTENSIONS]),
};

export const ALLOWED_TASK_FILES: AllowedFileConfig = {
  maxSizeBytes: 50 * 1024 * 1024,
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  allowedExtensions: dedupe([...PDF_EXTENSIONS, ...IMAGE_EXTENSIONS, ...TASK_DOC_EXTENSIONS]),
};

// Materiales: incluye archivos comunes + PDF + imagen + video (para recursos del curso)
export const ALLOWED_MATERIAL_FILES: AllowedFileConfig = {
  maxSizeBytes: 50 * 1024 * 1024,
  allowedMimeTypes: dedupe([
    ...ALLOWED_TASK_FILES.allowedMimeTypes,
    ...ALLOWED_IMAGES.allowedMimeTypes,
    ...ALLOWED_PDFS.allowedMimeTypes,
    ...ALLOWED_VIDEOS.allowedMimeTypes,
  ]),
  allowedExtensions: dedupe([
    ...(ALLOWED_TASK_FILES.allowedExtensions ?? []),
    ...(ALLOWED_IMAGES.allowedExtensions ?? []),
    ...(ALLOWED_PDFS.allowedExtensions ?? []),
    ...(ALLOWED_VIDEOS.allowedExtensions ?? []),
  ]),
};
