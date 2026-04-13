"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPasswordTokenVersion = buildPasswordTokenVersion;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
function buildPasswordTokenVersion(passwordHash) {
    return crypto_1.default.createHmac("sha256", env_1.env.JWT_SECRET).update(passwordHash).digest("hex");
}
