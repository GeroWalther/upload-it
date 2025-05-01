/**
 * types.ts
Defines all TypeScript interfaces and types used throughout the package
Includes provider types, configuration options, and file metadata structures
Serves as the central type system for the entire package

/**
 * Supported provider types
 */
export type ProviderType = "s3" | "filesystem";

/**
 * Common file metadata interface
 */
export interface FileMetadata {
  id?: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  key?: string;
  lastModified?: Date;
}

/**
 * Response from getting an upload URL
 */
export interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
  fields?: Record<string, string>; // For form uploads (e.g., S3 POST policy)
}

/**
 * Information about a file to be uploaded
 */
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  folder?: string;
}

/**
 * Information about a completed file upload
 */
export interface CompletedFileInfo extends FileInfo {
  fileKey: string;
}

/**
 * Base provider interface that all storage providers must implement
 */
export interface StorageProvider {
  // Get a URL or endpoint for uploading a file
  getUploadUrl(fileInfo: FileInfo): Promise<UploadUrlResponse>;

  // Complete the upload process (e.g., record in DB, move file, etc)
  completeUpload(fileInfo: CompletedFileInfo): Promise<FileMetadata>;

  // Generate a URL to access the file
  generateAccessUrl(fileKey: string, expiresIn?: number): Promise<string>;

  // Optional methods
  deleteFile?(fileKey: string): Promise<boolean>;
  listFiles?(prefix?: string): Promise<FileMetadata[]>;
}

/**
 * S3 specific configuration
 */
export interface S3Config {
  region: string;
  bucket: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string; // For custom endpoints (MinIO, etc)
  forcePathStyle?: boolean;
  uploadFolder?: string; // Folder prefix for uploads
}

/**
 * Filesystem specific configuration
 */
export interface FilesystemConfig {
  uploadDir: string; // Physical directory to store files
  publicPath: string; // Public URL path to access files
  createDirIfNotExist?: boolean;
}

/**
 * Server configuration for secure credentials handling
 */
export interface ServerConfig {
  mode: "client" | "server";
  endpoints?: {
    getUploadUrl?: string;
    completeUpload?: string;
    getAccessUrl?: string;
  };
}

/**
 * Upload progress information
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload configuration options
 */
export interface UploaderConfig {
  provider: ProviderType;
  s3?: S3Config;
  filesystem?: FilesystemConfig;
  server?: ServerConfig;

  // Common options
  maxFileSize?: number;
  allowedFileTypes?: string[];

  // Callbacks
  onUploadStart?: (file: File) => void;
  onUploadProgress?: (file: File, progress: UploadProgress) => void;
  onUploadComplete?: (file: File, result: FileMetadata) => void;
  onUploadError?: (file: File, error: Error) => void;
}
