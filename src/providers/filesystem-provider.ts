import { BaseStorageProvider } from './base-provider';
import {
  FileInfo,
  CompletedFileInfo,
  UploadUrlResponse,
  FileMetadata,
  FilesystemConfig,
} from '../core/types';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Conditionally import Node.js modules
let fs: any;
let path: any;
let crypto: any;

// Only load these modules in a Node.js environment
if (!isBrowser) {
  try {
    // Dynamic imports for Node.js modules
    fs = require('fs');
    path = require('path');
    crypto = require('crypto');
  } catch (e) {
    // Fail silently if modules can't be imported
    console.warn(
      'Node.js modules could not be imported. Filesystem provider will be limited.'
    );
  }
}

/**
 * Filesystem storage provider implementation
 * Handles uploads to the local filesystem
 */
export class FilesystemProvider extends BaseStorageProvider {
  private config: FilesystemConfig;

  constructor(config: FilesystemConfig) {
    super();
    this.config = config;

    // Only try to create directory in Node.js environment
    if (!isBrowser && fs && config.createDirIfNotExist !== false) {
      this.ensureDirectoryExists(config.uploadDir);
    }

    // Warn if trying to use filesystem provider in browser
    if (isBrowser) {
      console.warn(
        'FilesystemProvider is being used in a browser environment. ' +
          'This provider is designed for server-side use and some features will not work in the browser. ' +
          'Consider using the S3Provider for client-side uploads.'
      );
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
      uploadUrl: '/api/upload',
      fileKey,
      // Additional form fields can be included for validation
      fields: {
        key: fileKey,
        'content-type': fileInfo.type,
        'x-upload-token': this.generateUploadToken(fileKey),
      },
    };
  }

  /**
   * Complete the upload process
   * For filesystem, this is where the actual file saving happens
   */
  async completeUpload(fileInfo: CompletedFileInfo): Promise<FileMetadata> {
    // Check if we're in a browser environment
    if (isBrowser) {
      throw new Error(
        'Filesystem upload completion cannot be performed in a browser environment'
      );
    }

    if (!fs || !path) {
      throw new Error('Node.js filesystem modules are not available');
    }

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
      console.error('Error completing filesystem upload:', error);
      throw new Error('Failed to complete upload');
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
    // Check if we're in a browser environment
    if (isBrowser) {
      throw new Error(
        'Filesystem operations cannot be performed in a browser environment'
      );
    }

    if (!fs || !path) {
      throw new Error('Node.js filesystem modules are not available');
    }

    try {
      const filePath = path.join(this.config.uploadDir, fileKey);

      // Check if file exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting file from filesystem:', error);
      return false;
    }
  }

  /**
   * List files from a directory
   */
  async listFiles(prefix?: string): Promise<FileMetadata[]> {
    // Check if we're in a browser environment
    if (isBrowser) {
      throw new Error(
        'Filesystem operations cannot be performed in a browser environment'
      );
    }

    if (!fs || !path) {
      throw new Error('Node.js filesystem modules are not available');
    }

    try {
      const directory = prefix
        ? path.join(this.config.uploadDir, prefix)
        : this.config.uploadDir;

      if (!fs.existsSync(directory)) {
        return [];
      }

      const files = fs
        .readdirSync(directory)
        .filter((file: string) =>
          fs.statSync(path.join(directory, file)).isFile()
        )
        .map((file: string) => {
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
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Generate a public URL for a file
   */
  private generatePublicUrl(fileKey: string): string {
    // Generate a normalized path for the URL
    let normalizedKey = fileKey;

    // If we have path available (Node.js), use it for proper normalization
    if (path) {
      // Replace backslashes with forward slashes for URLs
      normalizedKey = fileKey.replace(/\\/g, '/');
    } else {
      // Simple replacement for browser environments
      normalizedKey = fileKey.replace(/\\/g, '/');
    }

    // Ensure the publicPath ends with a slash
    const publicPath = this.config.publicPath.endsWith('/')
      ? this.config.publicPath
      : `${this.config.publicPath}/`;

    return `${publicPath}${normalizedKey}`;
  }

  /**
   * Simple MIME type detection based on file extension
   */
  private getMimeType(filename: string): string {
    let ext = '';

    // If we have path available (Node.js), use it for extension extraction
    if (path) {
      ext = path.extname(filename).toLowerCase();
    } else {
      // Simple extension extraction for browser environments
      const lastDotIndex = filename.lastIndexOf('.');
      if (lastDotIndex >= 0) {
        ext = filename.substring(lastDotIndex).toLowerCase();
      }
    }

    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  private ensureDirectoryExists(dir: string): void {
    if (!fs) {
      console.warn(
        'Cannot ensure directory exists: Node.js fs module not available'
      );
      return;
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Generate a token for validating uploads
   */
  private generateUploadToken(fileKey: string): string {
    // In a browser environment, use Web Crypto API
    if (isBrowser) {
      // Simple token generation for browser environments
      const randomValue = Math.random().toString(36).substring(2);
      return `${fileKey}-${Date.now()}-${randomValue}`;
    }

    // In Node.js environment, use crypto module
    if (crypto) {
      return crypto
        .createHash('sha256')
        .update(`${fileKey}-${Date.now()}`)
        .digest('hex');
    }

    // Fallback if crypto is not available
    return `${fileKey}-${Date.now()}`;
  }
}
