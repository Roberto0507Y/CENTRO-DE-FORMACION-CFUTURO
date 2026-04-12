"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(opts) {
        super(opts.message);
        this.statusCode = opts.statusCode;
        this.code = opts.code;
        this.details = opts.details;
    }
}
exports.AppError = AppError;
