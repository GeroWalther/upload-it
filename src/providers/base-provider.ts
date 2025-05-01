import {
  StorageProvider,
  FileInfo,
  CompletedFileInfo,
  UploadUrlResponse,
  FileMetadata,
} from "../core/types";

/**
 * Abstract base class for storage providers
 * Provides common functionality and ensures all providers implement required methods
 */
export abstract class BaseStorageProvider implements StorageProvider {
  /**
   * Generate a URL for uploading a file
   */
  abstract getUploadUrl(fileInfo: FileInfo): Promise<UploadUrlResponse>;

  /**
   * Complete the upload process
   */
  abstract completeUpload(fileInfo: CompletedFileInfo): Promise<FileMetadata>;

  /**
   * Generate a URL to access the file
   */
  abstract generateAccessUrl(
    fileKey: string,
    expiresIn?: number,
  ): Promise<string>;

  /**
   * Delete a file
   */
  async deleteFile(fileKey: string): Promise<boolean> {
    throw new Error("Delete method not implemented");
  }

  /**
   * List files
   */
  async listFiles(prefix?: string): Promise<FileMetadata[]> {
    throw new Error("List method not implemented");
  }

  /**
   * Sanitize a filename
   */
  protected sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  }

  /**
   * Generate a unique file key
   */
  protected generateFileKey(fileInfo: FileInfo): string {
    const timestamp = Date.now();
    const sanitizedFilename = this.sanitizeFilename(fileInfo.name);
    const folderPrefix = fileInfo.folder ? `${fileInfo.folder}/` : "";
    return `${folderPrefix}${timestamp}-${sanitizedFilename}`;
  }
}
