// Core exports
export { Uploader } from "./core/uploader";
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
} from "./core/types";

// Provider exports
export { S3Provider } from "./providers/s3-provider";
export { FilesystemProvider } from "./providers/filesystem-provider";
export { createProvider } from "./providers/provider-factory";

// Hook exports
export { useUploader } from "./hooks/useUploader";

// Component exports
export { UploadButton } from "./components/UploadButton";
export { UploadDialog } from "./components/UploadDialog";

// Convenience function to create an uploader instance
import { Uploader } from "./core/uploader";
import { UploaderConfig } from "./core/types";

export function createUploader(config: UploaderConfig) {
  return new Uploader(config);
}
