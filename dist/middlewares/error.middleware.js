"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const zod_1 = require("zod");
const AppError_1 = require("../common/errors/AppError");
function errorMiddleware(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            ok: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Datos inválidos",
                details: err.flatten(),
            },
        });
        return;
    }
    if (err instanceof AppError_1.AppError) {
        res.status(err.statusCode).json({
            ok: false,
            error: { code: err.code, message: err.message, details: err.details },
        });
        return;
    }
    const mysqlErr = err;
    if (mysqlErr?.code === "ER_DUP_ENTRY") {
        res.status(409).json({
            ok: false,
            error: { code: "DUPLICATE", message: "Registro duplicado" },
        });
        return;
    }
    const multerErr = err;
    if (multerErr?.name === "MulterError") {
        res.status(400).json({
            ok: false,
            error: { code: "UPLOAD_ERROR", message: "Error en subida de archivo" },
        });
        return;
    }
    // Error inesperado
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({
        ok: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "Error interno" },
    });
}
