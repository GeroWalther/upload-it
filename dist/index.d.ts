import React from 'react';

/**
 * types.ts
Defines all TypeScript interfaces and types used throughout the package
Includes provider types, configuration options, and file metadata structures
Serves as the central type system for the entire package

/**
 * Supported provider types
 */
type ProviderType = "s3" | "filesystem";
/**
 * Common file metadata interface
 */
interface FileMetadata {
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
interface UploadUrlResponse {
    uploadUrl: string;
    fileKey: string;
    fields?: Record<string, string>;
}
/**
 * Information about a file to be uploaded
 */
interface FileInfo {
    name: string;
    size: number;
    type: string;
    lastModified?: number;
    folder?: string;
}
/**
 * Information about a completed file upload
 */
interface CompletedFileInfo extends FileInfo {
    fileKey: string;
}
/**
 * Base provider interface that all storage providers must implement
 */
interface StorageProvider {
    getUploadUrl(fileInfo: FileInfo): Promise<UploadUrlResponse>;
    completeUpload(fileInfo: CompletedFileInfo): Promise<FileMetadata>;
    generateAccessUrl(fileKey: string, expiresIn?: number): Promise<string>;
    deleteFile?(fileKey: string): Promise<boolean>;
    listFiles?(prefix?: string): Promise<FileMetadata[]>;
}
/**
 * S3 specific configuration
 */
interface S3Config {
    region: string;
    bucket: string;
    credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    endpoint?: string;
    forcePathStyle?: boolean;
    uploadFolder?: string;
}
/**
 * Filesystem specific configuration
 */
interface FilesystemConfig {
    uploadDir: string;
    publicPath: string;
    createDirIfNotExist?: boolean;
}
/**
 * Server configuration for secure credentials handling
 */
interface ServerConfig {
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
interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}
/**
 * Upload configuration options
 */
interface UploaderConfig {
    provider: ProviderType;
    s3?: S3Config;
    filesystem?: FilesystemConfig;
    server?: ServerConfig;
    maxFileSize?: number;
    allowedFileTypes?: string[];
    onUploadStart?: (file: File) => void;
    onUploadProgress?: (file: File, progress: UploadProgress) => void;
    onUploadComplete?: (file: File, result: FileMetadata) => void;
    onUploadError?: (file: File, error: Error) => void;
}

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
declare class Uploader {
    private provider;
    private config;
    /**
     * Creates a new Uploader instance.
     *
     * @param {UploaderConfig} config - The configuration object for the uploader
     * @throws {Error} If the configuration is invalid
     */
    constructor(config: UploaderConfig);
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
    uploadFile(file: File, folder?: string): Promise<FileMetadata>;
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
    uploadFiles(files: File[], folder?: string): Promise<FileMetadata[]>;
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
    getFileUrl(fileKey: string): Promise<string>;
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
    deleteFile(fileKey: string): Promise<boolean>;
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
    private uploadWithProgress;
    /**
     * Parse headers from XMLHttpRequest response.
     *
     * @private
     * @param {string} headerStr - Raw header string from XMLHttpRequest
     * @returns {Headers} Fetch API Headers object
     */
    private parseHeaders;
    /**
     * Validate a file before upload.
     * Checks size and file type restrictions.
     *
     * @private
     * @param {File} file - The file to validate
     * @throws {Error} If validation fails
     */
    private validateFile;
    /**
     * Check if a file type is allowed based on configuration.
     *
     * @private
     * @param {File} file - The file to check
     * @param {string[]} allowedTypes - Array of allowed MIME types or extensions
     * @returns {boolean} True if the file type is allowed
     */
    private isFileTypeAllowed;
    /**
     * Format file size for human-readable display.
     *
     * @private
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size (e.g., "1.5 MB")
     */
    private formatFileSize;
}

/**
 * Abstract base class for storage providers
 * Provides common functionality and ensures all providers implement required methods
 */
declare abstract class BaseStorageProvider implements StorageProvider {
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
    abstract generateAccessUrl(fileKey: string, expiresIn?: number): Promise<string>;
    /**
     * Delete a file
     */
    deleteFile(fileKey: string): Promise<boolean>;
    /**
     * List files
     */
    listFiles(prefix?: string): Promise<FileMetadata[]>;
    /**
     * Sanitize a filename
     */
    protected sanitizeFilename(filename: string): string;
    /**
     * Generate a unique file key
     */
    protected generateFileKey(fileInfo: FileInfo): string;
}

/**
 * S3 storage provider implementation
 * Handles direct uploads to Amazon S3 using presigned URLs
 */
declare class S3Provider extends BaseStorageProvider {
    private s3Client;
    private config;
    constructor(config: S3Config);
    /**
     * Generate a presigned URL for direct uploads to S3
     */
    getUploadUrl(fileInfo: FileInfo): Promise<UploadUrlResponse>;
    /**
     * Complete the upload process (for S3, the upload is already done via presigned URL)
     * This is a hook to record metadata or perform post-processing
     */
    completeUpload(fileInfo: CompletedFileInfo): Promise<FileMetadata>;
    /**
     * Generate a presigned URL for accessing a file
     */
    generateAccessUrl(fileKey: string, expiresIn?: number): Promise<string>;
    /**
     * Delete a file from S3
     */
    deleteFile(fileKey: string): Promise<boolean>;
}

/**
 * Filesystem storage provider implementation
 * Handles uploads to the local filesystem
 */
declare class FilesystemProvider extends BaseStorageProvider {
    private config;
    constructor(config: FilesystemConfig);
    /**
     * Generate an endpoint for uploading a file
     * For filesystem, this will typically be a server-side API endpoint
     */
    getUploadUrl(fileInfo: FileInfo): Promise<UploadUrlResponse>;
    /**
     * Complete the upload process
     * For filesystem, this is where the actual file saving happens
     */
    completeUpload(fileInfo: CompletedFileInfo): Promise<FileMetadata>;
    /**
     * Generate a URL for accessing the file
     */
    generateAccessUrl(fileKey: string): Promise<string>;
    /**
     * Delete a file from filesystem
     */
    deleteFile(fileKey: string): Promise<boolean>;
    /**
     * List files from a directory
     */
    listFiles(prefix?: string): Promise<FileMetadata[]>;
    /**
     * Generate a public URL for a file
     */
    private generatePublicUrl;
    /**
     * Simple MIME type detection based on file extension
     */
    private getMimeType;
    /**
     * Ensure a directory exists, creating it if necessary
     */
    private ensureDirectoryExists;
    /**
     * Generate a token for validating uploads
     */
    private generateUploadToken;
}

/**
 * Factory function to create the appropriate provider based on configuration
 */
declare function createProvider(config: UploaderConfig): StorageProvider;

interface UseUploaderOptions extends Omit<UploaderConfig, "onUploadStart" | "onUploadProgress" | "onUploadComplete" | "onUploadError"> {
    onSuccess?: (files: FileMetadata[]) => void;
    onError?: (error: Error) => void;
}
/**
 * React hook for using the Uploader
 */
declare function useUploader(options: UseUploaderOptions): {
    uploadFiles: (files: File[], folder?: string) => Promise<FileMetadata[]>;
    getFileUrl: (fileKey: string) => Promise<string>;
    deleteFile: (fileKey: string) => Promise<boolean>;
    reset: () => void;
    hasErrors: boolean;
    allFilesComplete: boolean;
    isUploading: boolean;
    progress: Record<string, UploadProgress>;
    results: Record<string, FileMetadata>;
    errors: Record<string, Error>;
};

type UploadButtonProps = Omit<UploaderConfig, "onUploadStart" | "onUploadProgress" | "onUploadComplete" | "onUploadError"> & {
    children?: React.ReactNode;
    className?: string;
    buttonText?: string;
    multiple?: boolean;
    accept?: string;
    folder?: string;
    onSuccess?: (files: FileMetadata[]) => void;
    onError?: (error: Error) => void;
    showProgressDialog?: boolean;
    dialogTitle?: string;
    renderButton?: (props: {
        onClick: () => void;
        isUploading: boolean;
    }) => React.ReactNode;
    renderDialog?: (props: {
        isOpen: boolean;
        onClose: () => void;
        progress: number;
        isComplete: boolean;
        hasErrors: boolean;
    }) => React.ReactNode;
};
/**
 * UploadButton component for file uploads
 */
declare function UploadButton({ provider, s3, filesystem, server, maxFileSize, allowedFileTypes, children, className, buttonText, multiple, accept, folder, onSuccess, onError, showProgressDialog, dialogTitle, renderButton, renderDialog, }: UploadButtonProps): React.JSX.Element;

interface UploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    progress: number;
    isComplete: boolean;
    hasErrors: boolean;
    title?: string;
}
/**
 * A simple dialog component to show upload progress
 */
declare function UploadDialog({ isOpen, onClose, progress, isComplete, hasErrors, title, }: UploadDialogProps): React.JSX.Element | null;

declare function createUploader(config: UploaderConfig): Uploader;

export { CompletedFileInfo, FileInfo, FileMetadata, FilesystemConfig, FilesystemProvider, ProviderType, S3Config, S3Provider, ServerConfig, StorageProvider, UploadButton, UploadDialog, UploadProgress, Uploader, UploaderConfig, createProvider, createUploader, useUploader };
