"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalUploadSingle = optionalUploadSingle;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const httpErrors_1 = require("../common/errors/httpErrors");
const TEMP_UPLOAD_DIR = path_1.default.join(os_1.default.tmpdir(), "cfuturo-uploads");
fs_1.default.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
function cleanupTempFile(file) {
    const filePath = typeof file?.path === "string" ? file.path : "";
    if (!filePath)
        return;
    void fs_1.default.promises.unlink(filePath).catch((err) => {
        if (err?.code !== "ENOENT") {
            console.warn("[upload] No se pudo eliminar archivo temporal", err);
        }
    });
}
function optionalUploadSingle(options) {
    const upload = (0, multer_1.default)({
        storage: multer_1.default.diskStorage({
            destination: (_req, _file, cb) => cb(null, TEMP_UPLOAD_DIR),
            filename: (_req, file, cb) => {
                const ext = path_1.default.extname(file.originalname || "").toLowerCase();
                cb(null, `${Date.now()}-${crypto_1.default.randomUUID()}${ext}`);
            },
        }),
        limits: {
            fileSize: options.allowed.maxSizeBytes,
            files: 1,
        },
        fileFilter: (_req, file, cb) => {
            if (!options.allowed.allowedMimeTypes.includes(file.mimetype)) {
                cb((0, httpErrors_1.badRequest)("Tipo de archivo no permitido"));
                return;
            }
            if (options.allowed.allowedExtensions?.length) {
                const ext = path_1.default.extname(file.originalname || "").toLowerCase();
                if (!ext || !options.allowed.allowedExtensions.includes(ext)) {
                    cb((0, httpErrors_1.badRequest)("Extensión de archivo no permitida"));
                    return;
                }
            }
            cb(null, true);
        },
    }).single(options.fieldName);
    return (req, res, next) => {
        const contentType = String(req.headers["content-type"] || "");
        const isMultipart = contentType.toLowerCase().includes("multipart/form-data");
        if (!isMultipart) {
            if (options.required) {
                return next((0, httpErrors_1.badRequest)("Debe enviar multipart/form-data con un archivo"));
            }
            return next();
        }
        upload(req, res, (err) => {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === "LIMIT_FILE_SIZE") {
                    return next((0, httpErrors_1.badRequest)(`Archivo demasiado grande. Máximo permitido: ${Math.floor(options.allowed.maxSizeBytes / (1024 * 1024))} MB`));
                }
                if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
                    return next((0, httpErrors_1.badRequest)("Solo se permite un archivo por solicitud"));
                }
                return next((0, httpErrors_1.badRequest)("No se pudo procesar el archivo enviado"));
            }
            if (err)
                return next(err);
            if (req.file && req.file.size <= 0) {
                cleanupTempFile(req.file);
                return next((0, httpErrors_1.badRequest)("El archivo está vacío"));
            }
            if (req.file) {
                let cleaned = false;
                const cleanup = () => {
                    if (cleaned)
                        return;
                    cleaned = true;
                    cleanupTempFile(req.file);
                };
                res.once("finish", cleanup);
                res.once("close", cleanup);
            }
            if (options.required && !req.file)
                return next((0, httpErrors_1.badRequest)("Archivo requerido"));
            next();
        });
    };
}
