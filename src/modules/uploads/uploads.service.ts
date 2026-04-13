import { StorageService, ALLOWED_IMAGES } from "../../common/services/storage.service";
import type { AuthContext } from "../../common/types/express";
import type { UploadedFile } from "../../common/types/file.types";

export class UploadsService {
  private readonly storage = new StorageService();

  async uploadCourseImage(requester: AuthContext, file: Express.Multer.File): Promise<UploadedFile> {
    const keyPrefix = `courses/images/user-${requester.userId}`;
    return this.storage.uploadMulterFile({
      module: "courses",
      keyPrefix,
      file,
      allowed: ALLOWED_IMAGES,
    });
  }

  async uploadCategoryImage(requester: AuthContext, file: Express.Multer.File): Promise<UploadedFile> {
    const keyPrefix = `categories/images/user-${requester.userId}`;
    return this.storage.uploadMulterFile({
      module: "categories",
      keyPrefix,
      file,
      allowed: ALLOWED_IMAGES,
    });
  }

  async uploadAvatar(requester: AuthContext, file: Express.Multer.File): Promise<UploadedFile> {
    const keyPrefix = `avatars/user-${requester.userId}`;
    return this.storage.uploadMulterFile({
      module: "avatars",
      keyPrefix,
      file,
      allowed: ALLOWED_IMAGES,
    });
  }
}
