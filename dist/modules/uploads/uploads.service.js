"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const storage_service_1 = require("../../common/services/storage.service");
class UploadsService {
    constructor() {
        this.storage = new storage_service_1.StorageService();
    }
    async uploadCourseImage(requester, file) {
        const keyPrefix = `courses/images/user-${requester.userId}`;
        return this.storage.uploadBuffer({
            module: "courses",
            keyPrefix,
            originalName: file.originalname,
            buffer: file.buffer,
            mimeType: file.mimetype,
            allowed: storage_service_1.ALLOWED_IMAGES,
        });
    }
    async uploadCategoryImage(requester, file) {
        const keyPrefix = `categories/images/user-${requester.userId}`;
        return this.storage.uploadBuffer({
            module: "categories",
            keyPrefix,
            originalName: file.originalname,
            buffer: file.buffer,
            mimeType: file.mimetype,
            allowed: storage_service_1.ALLOWED_IMAGES,
        });
    }
    async uploadAvatar(requester, file) {
        const keyPrefix = `avatars/user-${requester.userId}`;
        return this.storage.uploadBuffer({
            module: "avatars",
            keyPrefix,
            originalName: file.originalname,
            buffer: file.buffer,
            mimeType: file.mimetype,
            allowed: storage_service_1.ALLOWED_IMAGES,
        });
    }
}
exports.UploadsService = UploadsService;
