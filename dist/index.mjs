import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import React, { useRef, useState, useEffect, useCallback } from 'react';

// src/providers/s3-provider.ts

// src/providers/base-provider.ts
var BaseStorageProvider = class {
  /**
   * Delete a file
   */
  async deleteFile(fileKey) {
    throw new Error("Delete method not implemented");
  }
  /**
   * List files
   */
  async listFiles(prefix) {
    throw new Error("List method not implemented");
  }
  /**
   * Sanitize a filename
   */
  sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  }
  /**
   * Generate a unique file key
   */
  generateFileKey(fileInfo) {
    const timestamp = Date.now();
    const sanitizedFilename = this.sanitizeFilename(fileInfo.name);
    const folderPrefix = fileInfo.folder ? `${fileInfo.folder}/` : "";
    return `${folderPrefix}${timestamp}-${sanitizedFilename}`;
  }
};

// src/providers/s3-provider.ts
var S3Provider = class extends BaseStorageProvider {
  constructor(config) {
    var _a;
    super();
    this.config = config;
    this.s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: config.credentials ? {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey
      } : void 0,
      forcePathStyle: (_a = config.forcePathStyle) != null ? _a : true
    });
  }
  /**
   * Generate a presigned URL for direct uploads to S3
   */
  async getUploadUrl(fileInfo) {
    const fileKey = this.generateFileKey(fileInfo);
    const fullKey = this.config.uploadFolder ? `${this.config.uploadFolder}/${fileKey}` : fileKey;
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: fullKey,
      ContentType: fileInfo.type
    });
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600
    });
    return {
      uploadUrl,
      fileKey: fullKey
    };
  }
  /**
   * Complete the upload process (for S3, the upload is already done via presigned URL)
   * This is a hook to record metadata or perform post-processing
   */
  async completeUpload(fileInfo) {
    const url = await this.generateAccessUrl(fileInfo.fileKey);
    return {
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type,
      key: fileInfo.fileKey,
      url,
      lastModified: fileInfo.lastModified ? new Date(fileInfo.lastModified) : /* @__PURE__ */ new Date()
    };
  }
  /**
   * Generate a presigned URL for accessing a file
   */
  async generateAccessUrl(fileKey, expiresIn = 86400) {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: fileKey
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }
  /**
   * Delete a file from S3
   */
  async deleteFile(fileKey) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey
      });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      return false;
    }
  }
};
var FilesystemProvider = class extends BaseStorageProvider {
  constructor(config) {
    super();
    this.config = config;
    if (config.createDirIfNotExist !== false) {
      this.ensureDirectoryExists(config.uploadDir);
    }
  }
  /**
   * Generate an endpoint for uploading a file
   * For filesystem, this will typically be a server-side API endpoint
   */
  async getUploadUrl(fileInfo) {
    const fileKey = this.generateFileKey(fileInfo);
    return {
      uploadUrl: "/api/upload",
      fileKey,
      // Additional form fields can be included for validation
      fields: {
        key: fileKey,
        "content-type": fileInfo.type,
        "x-upload-token": this.generateUploadToken(fileKey)
      }
    };
  }
  /**
   * Complete the upload process
   * For filesystem, this is where the actual file saving happens
   */
  async completeUpload(fileInfo) {
    try {
      const filePath = path.join(this.config.uploadDir, fileInfo.fileKey);
      const url = this.generatePublicUrl(fileInfo.fileKey);
      return {
        name: fileInfo.name,
        size: fileInfo.size,
        type: fileInfo.type,
        key: fileInfo.fileKey,
        url,
        lastModified: fileInfo.lastModified ? new Date(fileInfo.lastModified) : /* @__PURE__ */ new Date()
      };
    } catch (error) {
      console.error("Error completing filesystem upload:", error);
      throw new Error("Failed to complete upload");
    }
  }
  /**
   * Generate a URL for accessing the file
   */
  async generateAccessUrl(fileKey) {
    return this.generatePublicUrl(fileKey);
  }
  /**
   * Delete a file from filesystem
   */
  async deleteFile(fileKey) {
    try {
      const filePath = path.join(this.config.uploadDir, fileKey);
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
  async listFiles(prefix) {
    try {
      const directory = prefix ? path.join(this.config.uploadDir, prefix) : this.config.uploadDir;
      if (!fs.existsSync(directory)) {
        return [];
      }
      const files = fs.readdirSync(directory).filter((file) => fs.statSync(path.join(directory, file)).isFile()).map((file) => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        const relativePath = prefix ? `${prefix}/${file}` : file;
        return {
          name: file,
          size: stats.size,
          type: this.getMimeType(file),
          key: relativePath,
          url: this.generatePublicUrl(relativePath),
          lastModified: stats.mtime
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
  generatePublicUrl(fileKey) {
    const normalizedKey = fileKey.replace(/\\/g, "/");
    const publicPath = this.config.publicPath.endsWith("/") ? this.config.publicPath : `${this.config.publicPath}/`;
    return `${publicPath}${normalizedKey}`;
  }
  /**
   * Simple MIME type detection based on file extension
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".txt": "text/plain",
      ".csv": "text/csv"
    };
    return mimeTypes[ext] || "application/octet-stream";
  }
  /**
   * Ensure a directory exists, creating it if necessary
   */
  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  /**
   * Generate a token for validating uploads
   */
  generateUploadToken(fileKey) {
    return crypto.createHash("sha256").update(`${fileKey}-${Date.now()}`).digest("hex");
  }
};

// src/providers/provider-factory.ts
function createProvider(config) {
  const providerType = config.provider;
  switch (providerType) {
    case "s3":
      if (!config.s3) {
        throw new Error("S3 configuration is required when using S3 provider");
      }
      return new S3Provider(config.s3);
    case "filesystem":
      if (!config.filesystem) {
        throw new Error(
          "Filesystem configuration is required when using filesystem provider"
        );
      }
      return new FilesystemProvider(config.filesystem);
    default:
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}
function validateConfig(config) {
  var _a;
  if (!config.provider) {
    throw new Error("Provider type is required");
  }
  switch (config.provider) {
    case "s3":
      if (!config.s3)
        return false;
      if (!config.s3.region)
        return false;
      if (!config.s3.bucket)
        return false;
      if (((_a = config.server) == null ? void 0 : _a.mode) !== "server" && !config.s3.credentials) {
        return false;
      }
      return true;
    case "filesystem":
      if (!config.filesystem)
        return false;
      if (!config.filesystem.uploadDir)
        return false;
      if (!config.filesystem.publicPath)
        return false;
      return true;
    default:
      return false;
  }
}

// src/core/uploader.ts
var Uploader = class {
  /**
   * Creates a new Uploader instance.
   *
   * @param {UploaderConfig} config - The configuration object for the uploader
   * @throws {Error} If the configuration is invalid
   */
  constructor(config) {
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
  async uploadFile(file, folder) {
    var _a, _b, _c, _d, _e, _f;
    this.validateFile(file);
    (_b = (_a = this.config).onUploadStart) == null ? void 0 : _b.call(_a, file);
    try {
      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        folder
      };
      const { uploadUrl, fileKey, fields } = await this.provider.getUploadUrl(fileInfo);
      let uploadedFile;
      if (fields) {
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
        formData.append("file", file);
        uploadedFile = await this.uploadWithProgress(
          uploadUrl,
          {
            method: "POST",
            body: formData
          },
          file
        );
      } else {
        uploadedFile = await this.uploadWithProgress(
          uploadUrl,
          {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type
            }
          },
          file
        );
      }
      if (!uploadedFile.ok) {
        const errorText = await uploadedFile.text();
        throw new Error(`Upload failed: ${uploadedFile.status} - ${errorText}`);
      }
      const metadata = await this.provider.completeUpload({
        ...fileInfo,
        fileKey
      });
      (_d = (_c = this.config).onUploadComplete) == null ? void 0 : _d.call(_c, file, metadata);
      return metadata;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      (_f = (_e = this.config).onUploadError) == null ? void 0 : _f.call(_e, file, err);
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
  async uploadFiles(files, folder) {
    const results = [];
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
  async getFileUrl(fileKey) {
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
  async deleteFile(fileKey) {
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
  async uploadWithProgress(url, options, file) {
    return new Promise((resolve, reject) => {
      if (!this.config.onUploadProgress) {
        fetch(url, options).then(resolve).catch(reject);
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        var _a, _b;
        if (event.lengthComputable) {
          const progress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round(event.loaded / event.total * 100)
          };
          (_b = (_a = this.config).onUploadProgress) == null ? void 0 : _b.call(_a, file, progress);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: this.parseHeaders(xhr.getAllResponseHeaders())
          });
          resolve(response);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };
      xhr.open(options.method || "GET", url);
      if (options.headers) {
        Object.entries(options.headers).forEach(
          ([key, value]) => {
            xhr.setRequestHeader(key, value);
          }
        );
      }
      xhr.send(options.body);
    });
  }
  /**
   * Parse headers from XMLHttpRequest response.
   *
   * @private
   * @param {string} headerStr - Raw header string from XMLHttpRequest
   * @returns {Headers} Fetch API Headers object
   */
  parseHeaders(headerStr) {
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
  validateFile(file) {
    if (this.config.maxFileSize && file.size > this.config.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size (${this.formatFileSize(this.config.maxFileSize)})`
      );
    }
    if (this.config.allowedFileTypes && this.config.allowedFileTypes.length > 0) {
      const isAllowed = this.isFileTypeAllowed(
        file,
        this.config.allowedFileTypes
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
  isFileTypeAllowed(file, allowedTypes) {
    return allowedTypes.some((type) => {
      if (type.endsWith("/*")) {
        const category = type.split("/")[0];
        return file.type.startsWith(`${category}/`);
      }
      if (type.includes("/")) {
        return file.type === type;
      }
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
  formatFileSize(bytes) {
    if (bytes < 1024)
      return `${bytes} B`;
    if (bytes < 1024 * 1024)
      return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
};
function useUploader(options) {
  const uploaderRef = useRef(null);
  const [state, setState] = useState({
    isUploading: false,
    progress: {},
    results: {},
    errors: {}
  });
  useEffect(() => {
    const config = {
      ...options,
      onUploadStart: (file) => {
        const fileId = getFileId(file);
        setState((prev) => ({
          ...prev,
          isUploading: true,
          progress: {
            ...prev.progress,
            [fileId]: { loaded: 0, total: file.size, percentage: 0 }
          }
        }));
      },
      onUploadProgress: (file, progress) => {
        const fileId = getFileId(file);
        setState((prev) => ({
          ...prev,
          progress: {
            ...prev.progress,
            [fileId]: progress
          }
        }));
      },
      onUploadComplete: (file, result) => {
        const fileId = getFileId(file);
        setState((prev) => ({
          ...prev,
          results: {
            ...prev.results,
            [fileId]: result
          }
        }));
      },
      onUploadError: (file, error) => {
        const fileId = getFileId(file);
        setState((prev) => ({
          ...prev,
          errors: {
            ...prev.errors,
            [fileId]: error
          }
        }));
      }
    };
    uploaderRef.current = new Uploader(config);
    return () => {
      uploaderRef.current = null;
    };
  }, [options.provider, options.s3, options.filesystem]);
  const uploadFiles = useCallback(
    async (files, folder) => {
      var _a, _b;
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }
      if (files.length === 0) {
        return [];
      }
      setState((prev) => ({ ...prev, isUploading: true }));
      try {
        const results = await uploaderRef.current.uploadFiles(files, folder);
        (_a = options.onSuccess) == null ? void 0 : _a.call(options, results);
        setState((prev) => ({
          ...prev,
          isUploading: false
        }));
        return results;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        (_b = options.onError) == null ? void 0 : _b.call(options, err);
        setState((prev) => ({
          ...prev,
          isUploading: false
        }));
        throw err;
      }
    },
    [options.onSuccess, options.onError]
  );
  const getFileUrl = useCallback(async (fileKey) => {
    if (!uploaderRef.current) {
      throw new Error("Uploader not initialized");
    }
    return uploaderRef.current.getFileUrl(fileKey);
  }, []);
  const deleteFile = useCallback(async (fileKey) => {
    if (!uploaderRef.current) {
      throw new Error("Uploader not initialized");
    }
    return uploaderRef.current.deleteFile(fileKey);
  }, []);
  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: {},
      results: {},
      errors: {}
    });
  }, []);
  const getFileId = (file) => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };
  return {
    ...state,
    uploadFiles,
    getFileUrl,
    deleteFile,
    reset,
    hasErrors: Object.keys(state.errors).length > 0,
    allFilesComplete: !state.isUploading && Object.values(state.progress).every((p) => p.percentage === 100)
  };
}
var styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1e3
  },
  dialog: {
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    width: "100%",
    maxWidth: "400px",
    overflow: "hidden"
  },
  header: {
    padding: "16px",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    padding: 0,
    lineHeight: 1
  },
  content: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center"
  },
  icon: {
    marginBottom: "16px"
  },
  cloudIcon: {
    color: "#3498db"
  },
  successIcon: {
    color: "#2ecc71"
  },
  errorIcon: {
    color: "#e74c3c"
  },
  progressLabel: {
    marginBottom: "8px",
    fontSize: "14px"
  },
  progressContainer: {
    width: "100%",
    height: "8px",
    backgroundColor: "#eee",
    borderRadius: "4px",
    overflow: "hidden"
  },
  progressBar: (progress) => ({
    height: "100%",
    backgroundColor: "#3498db",
    borderRadius: "4px",
    transition: "width 0.3s ease",
    width: `${progress}%`
  }),
  status: {
    fontSize: "16px",
    fontWeight: 500,
    color: "#333"
  }
};
function UploadDialog({
  isOpen,
  onClose,
  progress,
  isComplete,
  hasErrors,
  title = "Upload File"
}) {
  if (!isOpen)
    return null;
  return /* @__PURE__ */ React.createElement("div", { style: styles.overlay, className: "upload-it-dialog-overlay" }, /* @__PURE__ */ React.createElement("div", { style: styles.dialog, className: "upload-it-dialog" }, /* @__PURE__ */ React.createElement("div", { style: styles.header, className: "upload-it-dialog-header" }, /* @__PURE__ */ React.createElement("h3", { style: styles.title, className: "upload-it-dialog-title" }, title), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      style: styles.closeButton,
      className: "upload-it-dialog-close",
      onClick: onClose,
      "aria-label": "Close"
    },
    "\xD7"
  )), /* @__PURE__ */ React.createElement("div", { style: styles.content, className: "upload-it-dialog-content" }, /* @__PURE__ */ React.createElement("div", { style: styles.icon, className: "upload-it-dialog-icon" }, isComplete ? hasErrors ? /* @__PURE__ */ React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      width: "40",
      height: "40",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: styles.errorIcon,
      className: "upload-it-icon-error"
    },
    /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ React.createElement("line", { x1: "15", y1: "9", x2: "9", y2: "15" }),
    /* @__PURE__ */ React.createElement("line", { x1: "9", y1: "9", x2: "15", y2: "15" })
  ) : /* @__PURE__ */ React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      width: "40",
      height: "40",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: styles.successIcon,
      className: "upload-it-icon-success"
    },
    /* @__PURE__ */ React.createElement("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
    /* @__PURE__ */ React.createElement("polyline", { points: "22 4 12 14.01 9 11.01" })
  ) : /* @__PURE__ */ React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      width: "40",
      height: "40",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: styles.cloudIcon,
      className: "upload-it-icon-cloud"
    },
    /* @__PURE__ */ React.createElement("path", { d: "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" })
  )), !isComplete ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "div",
    {
      style: styles.progressLabel,
      className: "upload-it-progress-label"
    },
    "Uploading... ",
    progress,
    "%"
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: styles.progressContainer,
      className: "upload-it-progress-container"
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        style: styles.progressBar(progress),
        className: "upload-it-progress-bar"
      }
    )
  )) : /* @__PURE__ */ React.createElement("div", { style: styles.status, className: "upload-it-status" }, hasErrors ? "Upload completed with errors" : "Upload complete!"))));
}

// src/components/UploadButton.tsx
function UploadButton({
  // Uploader config
  provider,
  s3,
  filesystem,
  server,
  maxFileSize,
  allowedFileTypes,
  // Button props
  children,
  className = "",
  buttonText = "Upload",
  // Upload options
  multiple = false,
  accept,
  folder,
  // Callbacks
  onSuccess,
  onError,
  // Dialog options
  showProgressDialog = true,
  dialogTitle = "Upload File",
  // Custom rendering
  renderButton,
  renderDialog
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const uploader = useUploader({
    provider,
    s3,
    filesystem,
    server,
    maxFileSize,
    allowedFileTypes,
    onSuccess: (files) => {
      onSuccess == null ? void 0 : onSuccess(files);
      if (!uploader.hasErrors) {
        setTimeout(() => {
          setDialogOpen(false);
          uploader.reset();
        }, 1e3);
      }
    },
    onError: (error) => {
      onError == null ? void 0 : onError(error);
    }
  });
  const calculateOverallProgress = () => {
    const progressValues = Object.values(uploader.progress);
    if (progressValues.length === 0)
      return 0;
    const totalLoaded = progressValues.reduce((sum, p) => sum + p.loaded, 0);
    const totalSize = progressValues.reduce((sum, p) => sum + p.total, 0);
    return Math.round(totalLoaded / totalSize * 100);
  };
  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    if (accept)
      input.accept = accept;
    input.onchange = async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0)
        return;
      if (showProgressDialog) {
        setDialogOpen(true);
      }
      try {
        await uploader.uploadFiles(Array.from(files), folder);
      } catch (error) {
        console.error("Upload error:", error);
      }
    };
    input.click();
  };
  const defaultButton = /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: `upload-it-button ${className}`,
      onClick: handleFileUpload,
      disabled: uploader.isUploading
    },
    children || buttonText
  );
  const overallProgress = calculateOverallProgress();
  const isComplete = uploader.allFilesComplete && !uploader.isUploading;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, renderButton ? renderButton({
    onClick: handleFileUpload,
    isUploading: uploader.isUploading
  }) : defaultButton, showProgressDialog && (renderDialog ? renderDialog({
    isOpen: dialogOpen,
    onClose: () => setDialogOpen(false),
    progress: overallProgress,
    isComplete,
    hasErrors: uploader.hasErrors
  }) : /* @__PURE__ */ React.createElement(
    UploadDialog,
    {
      isOpen: dialogOpen,
      onClose: () => setDialogOpen(false),
      progress: overallProgress,
      isComplete,
      hasErrors: uploader.hasErrors,
      title: dialogTitle
    }
  )));
}

// src/index.ts
function createUploader(config) {
  return new Uploader(config);
}

export { FilesystemProvider, S3Provider, UploadButton, UploadDialog, Uploader, createProvider, createUploader, useUploader };
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.mjs.map