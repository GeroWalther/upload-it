// Core exports
export { Uploader } from './core/uploader';
export type {
  UploaderConfig,
  FileMetadata,
  FileInfo,
  CompletedFileInfo,
  UploadProgress,
  ProviderType,
  StorageProvider,
  S3Config,
  FilesystemConfig,
  ServerConfig,
} from './core/types';

// Provider exports
export { S3Provider } from './providers/s3-provider';
export { FilesystemProvider } from './providers/filesystem-provider';
export { createProvider } from './providers/provider-factory';

// Hook exports
export { useUploader } from './hooks/useUploader';

// Component exports
export { UploadButton } from './components/UploadButton';
export { UploadDialog } from './components/UploadDialog';
export { FileList, useFileList } from './components/FileList';
export { DropZone } from './components/DropZone';

// API handlers (server utilities without Next.js dependencies)
export {
  generatePresignedUrl,
  completeUpload,
  getFileAccessUrl,
} from './server/api-handlers';

// Convenience function to create an uploader instance
import { Uploader } from './core/uploader';
import { UploaderConfig } from './core/types';

export function createUploader(config: UploaderConfig) {
  return new Uploader(config);
}

// Note: Next.js specific routes are available via import from '@gw-intech/upload-it/server'

// Export file management utilities
export { listFiles, getFileUrl, deleteFile } from './server';
