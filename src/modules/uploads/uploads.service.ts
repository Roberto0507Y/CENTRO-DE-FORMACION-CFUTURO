import { StorageService, ALLOWED_IMAGES } from "../../common/services/storage.service";
import type { AuthContext } from "../../common/types/express";
import type { UploadedFile } from "../../common/types/file.types";

export class UploadsService {
  private readonly storage = new StorageService();

  async uploadCourseImage(requester: AuthContext, file: Express.Multer.File): Promise<UploadedFile> {
    const keyPrefix = `courses/images/user-${requester.userId}`;
    return this.storage.uploadBuffer({
      module: "courses",
      keyPrefix,
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      allowed: ALLOWED_IMAGES,
    });
  }

  async uploadCategoryImage(requester: AuthContext, file: Express.Multer.File): Promise<UploadedFile> {
    const keyPrefix = `categories/images/user-${requester.userId}`;
    return this.storage.uploadBuffer({
      module: "categories",
      keyPrefix,
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      allowed: ALLOWED_IMAGES,
    });
  }

  async uploadAvatar(requester: AuthContext, file: Express.Multer.File): Promise<UploadedFile> {
    const keyPrefix = `avatars/user-${requester.userId}`;
    return this.storage.uploadBuffer({
      module: "avatars",
      keyPrefix,
      originalName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      allowed: ALLOWED_IMAGES,
    });
  }
}
