import { BaseStorageProvider } from "./base-provider";
import {
  FileInfo,
  CompletedFileInfo,
  UploadUrlResponse,
  FileMetadata,
  FilesystemConfig,
} from "../core/types";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/**
 * Filesystem storage provider implementation
 * Handles uploads to the local filesystem
 */
export class FilesystemProvider extends BaseStorageProvider {
  private config: FilesystemConfig;

  constructor(config: FilesystemConfig) {
    super();
    this.config = config;

    // Create upload directory if it doesn't exist and option is enabled
    if (config.createDirIfNotExist !== false) {
      this.ensureDirectoryExists(config.uploadDir);
    }
  }

  /**
   * Generate an endpoint for uploading a file
   * For filesystem, this will typically be a server-side API endpoint
   */
  async getUploadUrl(fileInfo: FileInfo): Promise<UploadUrlResponse> {
    // Create a unique key for the file
    const fileKey = this.generateFileKey(fileInfo);

    // In filesystem mode, we return a virtual URL that the frontend will POST to
    // The actual handling happens on the server side

    // This could be a server API endpoint, or just a virtual token
    return {
      uploadUrl: "/api/upload",
      fileKey,
      // Additional form fields can be included for validation
      fields: {
        key: fileKey,
        "content-type": fileInfo.type,
        "x-upload-token": this.generateUploadToken(fileKey),
      },
    };
  }

  /**
   * Complete the upload process
   * For filesystem, this is where the actual file saving happens
   */
  async completeUpload(fileInfo: CompletedFileInfo): Promise<FileMetadata> {
    try {
      // In a real implementation, the file would be moved from a temp location
      // to its final destination. Here we're assuming the file has already
      // been uploaded to a temporary location.

      // The file path where it should be stored
      const filePath = path.join(this.config.uploadDir, fileInfo.fileKey);

      // Generate a public URL for accessing the file
      const url = this.generatePublicUrl(fileInfo.fileKey);

      return {
        name: fileInfo.name,
        size: fileInfo.size,
        type: fileInfo.type,
        key: fileInfo.fileKey,
        url: url,
        lastModified: fileInfo.lastModified
          ? new Date(fileInfo.lastModified)
          : new Date(),
      };
    } catch (error) {
      console.error("Error completing filesystem upload:", error);
      throw new Error("Failed to complete upload");
    }
  }

  /**
   * Generate a URL for accessing the file
   */
  async generateAccessUrl(fileKey: string): Promise<string> {
    return this.generatePublicUrl(fileKey);
  }

  /**
   * Delete a file from filesystem
   */
  async deleteFile(fileKey: string): Promise<boolean> {
    try {
      const filePath = path.join(this.config.uploadDir, fileKey);

      // Check if file exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error deleting file from filesystem:", error);
      return false;
    }
  }

  /**
   * List files from a directory
   */
  async listFiles(prefix?: string): Promise<FileMetadata[]> {
    try {
      const directory = prefix
        ? path.join(this.config.uploadDir, prefix)
        : this.config.uploadDir;

      if (!fs.existsSync(directory)) {
        return [];
      }

      const files = fs
        .readdirSync(directory)
        .filter((file) => fs.statSync(path.join(directory, file)).isFile())
        .map((file) => {
          const filePath = path.join(directory, file);
          const stats = fs.statSync(filePath);
          const relativePath = prefix ? `${prefix}/${file}` : file;

          return {
            name: file,
            size: stats.size,
            type: this.getMimeType(file),
            key: relativePath,
            url: this.generatePublicUrl(relativePath),
            lastModified: stats.mtime,
          };
        });

      return files;
    } catch (error) {
      console.error("Error listing files:", error);
      return [];
    }
  }

  /**
   * Generate a public URL for a file
   */
  private generatePublicUrl(fileKey: string): string {
    // Replace backslashes with forward slashes for URLs
    const normalizedKey = fileKey.replace(/\\/g, "/");

    // Ensure the publicPath ends with a slash
    const publicPath = this.config.publicPath.endsWith("/")
      ? this.config.publicPath
      : `${this.config.publicPath}/`;

    return `${publicPath}${normalizedKey}`;
  }

  /**
   * Simple MIME type detection based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".txt": "text/plain",
      ".csv": "text/csv",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Generate a token for validating uploads
   */
  private generateUploadToken(fileKey: string): string {
    // In a real implementation, this would be a secure token
    // that verifies the upload is authorized
    return crypto
      .createHash("sha256")
      .update(`${fileKey}-${Date.now()}`)
      .digest("hex");
  }
}
