"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalUploadSingle = optionalUploadSingle;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const httpErrors_1 = require("../common/errors/httpErrors");
function optionalUploadSingle(options) {
    const upload = (0, multer_1.default)({
        storage: multer_1.default.memoryStorage(),
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
            if (err)
                return next(err);
            if (options.required && !req.file)
                return next((0, httpErrors_1.badRequest)("Archivo requerido"));
            next();
        });
    };
}
