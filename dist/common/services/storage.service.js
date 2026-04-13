"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_MATERIAL_FILES = exports.ALLOWED_TASK_FILES = exports.ALLOWED_ANNOUNCEMENT_FILES = exports.ALLOWED_PAYMENT_PROOFS = exports.ALLOWED_IMAGES = exports.ALLOWED_VIDEOS = exports.ALLOWED_PDFS = exports.StorageService = void 0;
exports.generateS3DownloadSignedUrl = generateS3DownloadSignedUrl;
const fs_1 = __importDefault(require("fs"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const httpErrors_1 = require("../errors/httpErrors");
const file_util_1 = require("../utils/file.util");
const s3_1 = require("../../config/s3");
const DEFAULT_DOWNLOAD_EXPIRES_IN_SECONDS = 5 * 60;
function inferContentTypeFromFilename(filename) {
    const ext = path_1.default.extname(filename || "").toLowerCase();
    const contentTypes = {
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
function encodeRFC5987(value) {
    return encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
function buildAttachmentContentDisposition(originalName) {
    const baseName = path_1.default.basename(originalName || "archivo");
    const fallbackName = (0, file_util_1.sanitizeFilename)(baseName).replace(/["\\]/g, "") || "archivo";
    const encodedName = encodeRFC5987(baseName.replace(/[\r\n]/g, "").trim() || fallbackName);
    return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
}
function validateUploadMetadata(input) {
    if (!Number.isFinite(input.size) || input.size <= 0) {
        throw (0, httpErrors_1.badRequest)("Archivo inválido o vacío");
    }
    if (input.size > input.allowed.maxSizeBytes) {
        throw (0, httpErrors_1.badRequest)("Archivo demasiado grande");
    }
    if (!input.allowed.allowedMimeTypes.includes(input.mimeType)) {
        throw (0, httpErrors_1.badRequest)("Tipo de archivo no permitido");
    }
    if (input.allowed.allowedExtensions?.length) {
        const ext = path_1.default.extname(input.originalName || "").toLowerCase();
        if (!ext || !input.allowed.allowedExtensions.includes(ext)) {
            throw (0, httpErrors_1.badRequest)("Extensión de archivo no permitida");
        }
    }
}
function buildObjectKey(keyPrefix, originalName) {
    const safeName = (0, file_util_1.sanitizeFilename)(originalName);
    const ts = Date.now();
    const rand = crypto_1.default.randomUUID();
    return `${keyPrefix}/${ts}-${rand}-${safeName}`.replace(/\/+/g, "/");
}
async function generateS3DownloadSignedUrl(input) {
    const cfg = (0, s3_1.getS3Config)();
    const s3 = (0, s3_1.getS3Client)();
    const expiresIn = input.expiresInSeconds ?? DEFAULT_DOWNLOAD_EXPIRES_IN_SECONDS;
    try {
        return await (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.GetObjectCommand({
            Bucket: cfg.bucket,
            Key: input.key,
            ResponseContentDisposition: buildAttachmentContentDisposition(input.originalName),
            ResponseContentType: input.contentType || inferContentTypeFromFilename(input.originalName),
        }), { expiresIn });
    }
    catch {
        throw (0, httpErrors_1.serviceUnavailable)("No se pudo generar el enlace temporal de descarga. Intenta más tarde.");
    }
}
class StorageService {
    async uploadBuffer(input) {
        validateUploadMetadata({
            originalName: input.originalName,
            mimeType: input.mimeType,
            size: input.buffer.length,
            allowed: input.allowed,
        });
        const key = buildObjectKey(input.keyPrefix, input.originalName);
        const baseUrl = (0, s3_1.getS3Config)().baseUrl;
        try {
            await this.putObject({
                key,
                body: input.buffer,
                mimeType: input.mimeType,
                contentLength: input.buffer.length,
            });
        }
        catch {
            throw (0, httpErrors_1.serviceUnavailable)("No se pudo subir el archivo. Intenta más tarde.");
        }
        return {
            key,
            url: (0, file_util_1.buildPublicUrl)(baseUrl, key),
            mimeType: input.mimeType,
            size: input.buffer.length,
        };
    }
    async uploadMulterFile(input) {
        const { file } = input;
        const size = Number(file.size ?? file.buffer?.length ?? 0);
        validateUploadMetadata({
            originalName: file.originalname,
            mimeType: file.mimetype,
            size,
            allowed: input.allowed,
        });
        const key = buildObjectKey(input.keyPrefix, file.originalname);
        const baseUrl = (0, s3_1.getS3Config)().baseUrl;
        const body = typeof file.path === "string" && file.path.length > 0 ? fs_1.default.createReadStream(file.path) : file.buffer;
        if (!body) {
            throw (0, httpErrors_1.badRequest)("Archivo inválido");
        }
        try {
            await this.putObject({
                key,
                body,
                mimeType: file.mimetype,
                contentLength: size,
            });
        }
        catch {
            throw (0, httpErrors_1.serviceUnavailable)("No se pudo subir el archivo. Intenta más tarde.");
        }
        finally {
            await this.cleanupTempFile(file.path);
        }
        return {
            key,
            url: (0, file_util_1.buildPublicUrl)(baseUrl, key),
            mimeType: file.mimetype,
            size,
        };
    }
    async deleteByKey(key) {
        const cfg = (0, s3_1.getS3Config)();
        const s3 = (0, s3_1.getS3Client)();
        try {
            await s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
        }
        catch {
            throw (0, httpErrors_1.serviceUnavailable)("No se pudo eliminar el archivo. Intenta más tarde.");
        }
    }
    async createDownloadSignedUrl(input) {
        return generateS3DownloadSignedUrl(input);
    }
    async createDownloadStream(input) {
        const cfg = (0, s3_1.getS3Config)();
        const s3 = (0, s3_1.getS3Client)();
        try {
            const result = await s3.send(new client_s3_1.GetObjectCommand({
                Bucket: cfg.bucket,
                Key: input.key,
            }));
            const body = result.Body;
            if (!body || typeof body.pipe !== "function") {
                throw new Error("S3 object body is not streamable");
            }
            return {
                body: body,
                contentType: input.contentType || result.ContentType || inferContentTypeFromFilename(input.originalName),
                contentLength: result.ContentLength,
                contentDisposition: buildAttachmentContentDisposition(input.originalName),
            };
        }
        catch {
            throw (0, httpErrors_1.serviceUnavailable)("No se pudo descargar el archivo. Intenta más tarde.");
        }
    }
    async putObject(input) {
        const cfg = (0, s3_1.getS3Config)();
        const s3 = (0, s3_1.getS3Client)();
        await s3.send(new client_s3_1.PutObjectCommand({
            Bucket: cfg.bucket,
            Key: input.key,
            Body: input.body,
            ContentType: input.mimeType,
            ContentLength: input.contentLength,
        }));
    }
    async cleanupTempFile(filePath) {
        if (!filePath)
            return;
        try {
            await fs_1.default.promises.unlink(filePath);
        }
        catch (err) {
            const fsErr = err;
            if (fsErr.code !== "ENOENT") {
                console.warn("[storage] No se pudo eliminar archivo temporal", fsErr);
            }
        }
    }
}
exports.StorageService = StorageService;
const dedupe = (items) => Array.from(new Set(items));
const PDF_EXTENSIONS = [".pdf"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const TASK_DOC_EXTENSIONS = [".txt", ".zip", ".doc", ".xls", ".ppt", ".docx", ".xlsx", ".pptx"];
exports.ALLOWED_PDFS = {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
    allowedExtensions: PDF_EXTENSIONS,
};
exports.ALLOWED_VIDEOS = {
    maxSizeBytes: 25 * 1024 * 1024,
    allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    allowedExtensions: VIDEO_EXTENSIONS,
};
exports.ALLOWED_IMAGES = {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: IMAGE_EXTENSIONS,
};
exports.ALLOWED_PAYMENT_PROOFS = {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
    allowedExtensions: PDF_EXTENSIONS,
};
exports.ALLOWED_ANNOUNCEMENT_FILES = {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    ],
    allowedExtensions: dedupe([...PDF_EXTENSIONS, ...IMAGE_EXTENSIONS]),
};
exports.ALLOWED_TASK_FILES = {
    maxSizeBytes: 20 * 1024 * 1024,
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
exports.ALLOWED_MATERIAL_FILES = {
    maxSizeBytes: 25 * 1024 * 1024,
    allowedMimeTypes: dedupe([
        ...exports.ALLOWED_TASK_FILES.allowedMimeTypes,
        ...exports.ALLOWED_IMAGES.allowedMimeTypes,
        ...exports.ALLOWED_PDFS.allowedMimeTypes,
        ...exports.ALLOWED_VIDEOS.allowedMimeTypes,
    ]),
    allowedExtensions: dedupe([
        ...(exports.ALLOWED_TASK_FILES.allowedExtensions ?? []),
        ...(exports.ALLOWED_IMAGES.allowedExtensions ?? []),
        ...(exports.ALLOWED_PDFS.allowedExtensions ?? []),
        ...(exports.ALLOWED_VIDEOS.allowedExtensions ?? []),
    ]),
};
