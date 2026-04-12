export type UploadedFile = {
  key: string;
  url: string;
  mimeType: string;
  size: number;
};

export type AllowedFileConfig = {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions?: string[];
};
