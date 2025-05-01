// uploader.ts
// Main Uploader class that orchestrates the file upload process
// Handles file validation, upload progress tracking, and error handling
// Coordinates with storage providers to handle the actual storage

import { createProvider, validateConfig } from "../providers/provider-factory";
import {
  UploaderConfig,
  FileInfo,
  FileMetadata,
  UploadProgress,
  StorageProvider,
} from "./types";

/**
 * Main uploader class that orchestrates the file upload process.
 *
 * @class Uploader
 * @description The Uploader handles the complete file upload workflow including:
 * - File validation (size, type)
 * - Upload URL generation
 * - Direct uploads to storage providers
 * - Progress tracking
 * - Error handling
 *
 * @example
 * ```typescript
 * const uploader = new Uploader({
 *   provider: 's3',
 *   s3: {
 *     region: 'us-east-1',
 *     bucket: 'my-bucket',
 *     credentials: { ... }
 *   },
 *   onUploadProgress: (file, progress) => {
 *     console.log(`${file.name}: ${progress.percentage}%`);
 *   }
 * });
 *
 * const result = await uploader.uploadFile(file);
 * console.log('File uploaded:', result.url);
 * ```
 */
export class Uploader {
  private provider: StorageProvider;
  private config: UploaderConfig;

  /**
   * Creates a new Uploader instance.
   *
   * @param {UploaderConfig} config - The configuration object for the uploader
   * @throws {Error} If the configuration is invalid
   */
  constructor(config: UploaderConfig) {
    // Validate configuration
    if (!validateConfig(config)) {
      throw new Error("Invalid uploader configuration");
    }

    this.config = config;
    this.provider = createProvider(config);
  }

  /**
   * Upload a single file to the configured storage provider.
   *
   * @param {File} file - The file to upload
   * @param {string} [folder] - Optional folder path where the file should be stored
   * @returns {Promise<FileMetadata>} Metadata about the uploaded file including the URL
   * @throws {Error} If file validation fails or upload encounters an error
   *
   * @example
   * ```typescript
   * try {
   *   const result = await uploader.uploadFile(file);
   *   console.log('File URL:', result.url);
   * } catch (error) {
   *   console.error('Upload failed:', error);
   * }
   * ```
   */
  async uploadFile(file: File, folder?: string): Promise<FileMetadata> {
    // Validate the file
    this.validateFile(file);

    // Notify start of upload
    this.config.onUploadStart?.(file);

    try {
      // Get file info
      const fileInfo: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        folder,
      };

      // Get upload URL from provider
      const { uploadUrl, fileKey, fields } =
        await this.provider.getUploadUrl(fileInfo);

      // Upload the file
      let uploadedFile: Response;

      if (fields) {
        // If fields are provided, use multipart form upload
        const formData = new FormData();

        // Add all the fields to the form
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value);
        });

        // Add the file itself
        formData.append("file", file);

        // Upload with progress tracking
        uploadedFile = await this.uploadWithProgress(
          uploadUrl,
          {
            method: "POST",
            body: formData,
          },
          file,
        );
      } else {
        // Direct upload (e.g., S3 presigned PUT URL)
        uploadedFile = await this.uploadWithProgress(
          uploadUrl,
          {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          },
          file,
        );
      }

      // Make sure the upload was successful
      if (!uploadedFile.ok) {
        const errorText = await uploadedFile.text();
        throw new Error(`Upload failed: ${uploadedFile.status} - ${errorText}`);
      }

      // Complete the upload
      const metadata = await this.provider.completeUpload({
        ...fileInfo,
        fileKey,
      });

      // Notify completion
      this.config.onUploadComplete?.(file, metadata);

      // Return the file metadata
      return metadata;
    } catch (error) {
      // Notify error
      const err = error instanceof Error ? error : new Error(String(error));
      this.config.onUploadError?.(file, err);
      throw err;
    }
  }

  /**
   * Upload multiple files to the configured storage provider.
   *
   * @param {File[]} files - Array of files to upload
   * @param {string} [folder] - Optional folder path where the files should be stored
   * @returns {Promise<FileMetadata[]>} Array of metadata objects for the uploaded files
   * @throws {Error} If file validation fails or upload encounters an error
   *
   * @example
   * ```typescript
   * const fileInput = document.querySelector('input[type="file"]');
   * if (fileInput.files.length > 0) {
   *   const results = await uploader.uploadFiles(Array.from(fileInput.files));
   *   console.log('Uploaded files:', results);
   * }
   * ```
   */
  async uploadFiles(files: File[], folder?: string): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];

    for (const file of files) {
      const result = await this.uploadFile(file, folder);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate an access URL for a previously uploaded file.
   * Useful for refreshing expired URLs.
   *
   * @param {string} fileKey - The file key returned from a previous upload
   * @returns {Promise<string>} URL for accessing the file
   * @throws {Error} If generating the URL fails
   *
   * @example
   * ```typescript
   * // Refresh a URL that might have expired
   * const freshUrl = await uploader.getFileUrl('my-file-key');
   * ```
   */
  async getFileUrl(fileKey: string): Promise<string> {
    return this.provider.generateAccessUrl(fileKey);
  }

  /**
   * Delete a previously uploaded file.
   *
   * @param {string} fileKey - The file key returned from a previous upload
   * @returns {Promise<boolean>} True if deletion was successful
   * @throws {Error} If the provider doesn't support deletion or the operation fails
   *
   * @example
   * ```typescript
   * const deleted = await uploader.deleteFile('my-file-key');
   * if (deleted) {
   *   console.log('File was successfully deleted');
   * }
   * ```
   */
  async deleteFile(fileKey: string): Promise<boolean> {
    if (typeof this.provider.deleteFile !== "function") {
      throw new Error("Delete operation not supported by this provider");
    }

    return this.provider.deleteFile(fileKey);
  }

  /**
   * Upload with progress tracking.
   * Uses XMLHttpRequest for progress tracking if a progress callback is provided.
   *
   * @private
   * @param {string} url - The URL to upload to
   * @param {RequestInit} options - Fetch API options
   * @param {File} file - The file being uploaded
   * @returns {Promise<Response>} Fetch API Response object
   */
  private async uploadWithProgress(
    url: string,
    options: RequestInit,
    file: File,
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      // If no progress callback, just use regular fetch
      if (!this.config.onUploadProgress) {
        fetch(url, options).then(resolve).catch(reject);
        return;
      }

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Setup progress handler
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          };

          this.config.onUploadProgress?.(file, progress);
        }
      };

      // Setup completion handler
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Create a response object similar to fetch
          const response = new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: this.parseHeaders(xhr.getAllResponseHeaders()),
          });
          resolve(response);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      // Setup error handler
      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };

      // Open the request
      xhr.open(options.method || "GET", url);

      // Set headers
      if (options.headers) {
        Object.entries(options.headers as Record<string, string>).forEach(
          ([key, value]) => {
            xhr.setRequestHeader(key, value);
          },
        );
      }

      // Send the request
      xhr.send(options.body as XMLHttpRequestBodyInit);
    });
  }

  /**
   * Parse headers from XMLHttpRequest response.
   *
   * @private
   * @param {string} headerStr - Raw header string from XMLHttpRequest
   * @returns {Headers} Fetch API Headers object
   */
  private parseHeaders(headerStr: string): Headers {
    const headers = new Headers();
    const headerPairs = headerStr.trim().split("\r\n");

    headerPairs.forEach((headerPair) => {
      const index = headerPair.indexOf(": ");
      if (index > 0) {
        const key = headerPair.substring(0, index);
        const val = headerPair.substring(index + 2);
        headers.append(key, val);
      }
    });

    return headers;
  }

  /**
   * Validate a file before upload.
   * Checks size and file type restrictions.
   *
   * @private
   * @param {File} file - The file to validate
   * @throws {Error} If validation fails
   */
  private validateFile(file: File): void {
    // Check file size
    if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size (${this.formatFileSize(this.config.maxFileSize)})`,
      );
    }

    // Check file type if restrictions are set
    if (
      this.config.allowedFileTypes &&
      this.config.allowedFileTypes.length > 0
    ) {
      const isAllowed = this.isFileTypeAllowed(
        file,
        this.config.allowedFileTypes,
      );
      if (!isAllowed) {
        throw new Error(`File type not allowed: ${file.type}`);
      }
    }
  }

  /**
   * Check if a file type is allowed based on configuration.
   *
   * @private
   * @param {File} file - The file to check
   * @param {string[]} allowedTypes - Array of allowed MIME types or extensions
   * @returns {boolean} True if the file type is allowed
   */
  private isFileTypeAllowed(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.some((type) => {
      // Handle wildcards like "image/*"
      if (type.endsWith("/*")) {
        const category = type.split("/")[0];
        return file.type.startsWith(`${category}/`);
      }

      // Handle specific MIME types
      if (type.includes("/")) {
        return file.type === type;
      }

      // Handle file extensions
      if (type.startsWith(".")) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }

      return false;
    });
  }

  /**
   * Format file size for human-readable display.
   *
   * @private
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size (e.g., "1.5 MB")
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
