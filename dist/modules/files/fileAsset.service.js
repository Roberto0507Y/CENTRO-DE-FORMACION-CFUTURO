"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileAssetService = void 0;
const storage_service_1 = require("../../common/services/storage.service");
const file_util_1 = require("../../common/utils/file.util");
const s3_1 = require("../../config/s3");
const file_repository_1 = require("./file.repository");
const DOWNLOAD_PATH_PREFIX = "/api/files/download/";
function buildDownloadPath(id) {
    return `${DOWNLOAD_PATH_PREFIX}${id}`;
}
function parseDownloadFileId(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    let pathname = trimmed;
    try {
        pathname = new URL(trimmed).pathname;
    }
    catch {
        // relative path
    }
    if (!pathname.startsWith(DOWNLOAD_PATH_PREFIX))
        return null;
    const raw = pathname.slice(DOWNLOAD_PATH_PREFIX.length).split(/[/?#]/)[0];
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
}
function keyMatchesExpectedPrefix(key, expectedPrefixes) {
    if (expectedPrefixes.length === 0)
        return true;
    return expectedPrefixes.some((prefix) => key.startsWith(prefix));
}
class FileAssetService {
    constructor() {
        this.storage = new storage_service_1.StorageService();
        this.files = new file_repository_1.FileRepository();
    }
    async uploadManaged(input) {
        const uploaded = await this.storage.uploadBuffer(input);
        try {
            const id = await this.files.create({
                s3_key: uploaded.key,
                nombre_original: input.originalName,
                mime_type: uploaded.mimeType,
                size_bytes: uploaded.size,
                owner_usuario_id: input.ownerUsuarioId ?? null,
                curso_id: input.cursoId ?? null,
                access_scope: input.accessScope,
            });
            return {
                id,
                key: uploaded.key,
                url: buildDownloadPath(id),
                mimeType: uploaded.mimeType,
                size: uploaded.size,
            };
        }
        catch (err) {
            try {
                await this.storage.deleteByKey(uploaded.key);
            }
            catch (deleteErr) {
                console.warn("No se pudo eliminar archivo subido tras fallar el registro", deleteErr);
            }
            throw err;
        }
    }
    async deleteByReference(value, expectedPrefixes = []) {
        if (!value)
            return;
        const fileId = parseDownloadFileId(value);
        if (fileId) {
            const file = await this.files.findById(fileId);
            if (!file)
                return;
            if (!keyMatchesExpectedPrefix(file.s3_key, expectedPrefixes))
                return;
            try {
                await this.storage.deleteByKey(file.s3_key);
            }
            catch (err) {
                console.warn("No se pudo eliminar archivo registrado en S3", err);
            }
            await this.files.deleteById(fileId);
            return;
        }
        const legacyKey = this.resolveLegacyS3Key(value);
        if (!legacyKey || !keyMatchesExpectedPrefix(legacyKey, expectedPrefixes))
            return;
        try {
            await this.storage.deleteByKey(legacyKey);
        }
        catch (err) {
            console.warn("No se pudo eliminar archivo heredado en S3", err);
        }
    }
    resolveLegacyS3Key(value) {
        const trimmed = value.trim();
        if (!trimmed)
            return null;
        if (/^https?:\/\//i.test(trimmed)) {
            try {
                const keyFromConfiguredBase = (0, file_util_1.extractKeyFromPublicUrl)((0, s3_1.getS3Config)().baseUrl, trimmed);
                if (keyFromConfiguredBase)
                    return keyFromConfiguredBase;
            }
            catch {
                // No hay configuración S3 disponible.
            }
            try {
                const url = new URL(trimmed);
                if (url.hostname.includes("amazonaws.com")) {
                    return decodeURIComponent(url.pathname.replace(/^\/+/, "")) || null;
                }
            }
            catch {
                return null;
            }
        }
        if (trimmed.startsWith("/api/"))
            return null;
        return trimmed.replace(/^\/+/, "") || null;
    }
}
exports.FileAssetService = FileAssetService;
