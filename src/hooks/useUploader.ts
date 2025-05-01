import { useState, useCallback, useEffect, useRef } from "react";
import { Uploader } from "../core/uploader";
import { UploaderConfig, FileMetadata, UploadProgress } from "../core/types";

interface UseUploaderState {
  isUploading: boolean;
  progress: Record<string, UploadProgress>;
  results: Record<string, FileMetadata>;
  errors: Record<string, Error>;
}

interface UseUploaderOptions
  extends Omit<
    UploaderConfig,
    "onUploadStart" | "onUploadProgress" | "onUploadComplete" | "onUploadError"
  > {
  onSuccess?: (files: FileMetadata[]) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for using the Uploader
 */
export function useUploader(options: UseUploaderOptions) {
  // Create uploader instance
  const uploaderRef = useRef<Uploader | null>(null);

  // Track upload state
  const [state, setState] = useState<UseUploaderState>({
    isUploading: false,
    progress: {},
    results: {},
    errors: {},
  });

  // Initialize uploader
  useEffect(() => {
    // Create the full config with callbacks
    const config: UploaderConfig = {
      ...options,
      onUploadStart: (file) => {
        const fileId = getFileId(file);
        setState((prev) => ({
          ...prev,
          isUploading: true,
          progress: {
            ...prev.progress,
            [fileId]: { loaded: 0, total: file.size, percentage: 0 },
          },
        }));
      },
      onUploadProgress: (file, progress) => {
        const fileId = getFileId(file);
        setState((prev) => ({
          ...prev,
          progress: {
            ...prev.progress,
            [fileId]: progress,
          },
        }));
      },
      onUploadComplete: (file, result) => {
        const fileId = getFileId(file);
        setState((prev) => ({
          ...prev,
          results: {
            ...prev.results,
            [fileId]: result,
          },
        }));
      },
      onUploadError: (file, error) => {
        const fileId = getFileId(file);
        setState((prev) => ({
          ...prev,
          errors: {
            ...prev.errors,
            [fileId]: error,
          },
        }));
      },
    };

    // Create the uploader with this config
    uploaderRef.current = new Uploader(config);

    // Cleanup
    return () => {
      uploaderRef.current = null;
    };
  }, [options.provider, options.s3, options.filesystem]);

  // Upload files function
  const uploadFiles = useCallback(
    async (files: File[], folder?: string) => {
      if (!uploaderRef.current) {
        throw new Error("Uploader not initialized");
      }

      if (files.length === 0) {
        return [];
      }

      setState((prev) => ({ ...prev, isUploading: true }));

      try {
        const results = await uploaderRef.current.uploadFiles(files, folder);

        // Call success callback
        options.onSuccess?.(results);

        // Update state when complete
        setState((prev) => ({
          ...prev,
          isUploading: false,
        }));

        return results;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Call error callback
        options.onError?.(err);

        setState((prev) => ({
          ...prev,
          isUploading: false,
        }));

        throw err;
      }
    },
    [options.onSuccess, options.onError],
  );

  // Generate a URL for a file
  const getFileUrl = useCallback(async (fileKey: string) => {
    if (!uploaderRef.current) {
      throw new Error("Uploader not initialized");
    }

    return uploaderRef.current.getFileUrl(fileKey);
  }, []);

  // Delete a file
  const deleteFile = useCallback(async (fileKey: string) => {
    if (!uploaderRef.current) {
      throw new Error("Uploader not initialized");
    }

    return uploaderRef.current.deleteFile(fileKey);
  }, []);

  // Reset the state
  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: {},
      results: {},
      errors: {},
    });
  }, []);

  // Helper to get a unique ID for a file
  const getFileId = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  return {
    ...state,
    uploadFiles,
    getFileUrl,
    deleteFile,
    reset,
    hasErrors: Object.keys(state.errors).length > 0,
    allFilesComplete:
      !state.isUploading &&
      Object.values(state.progress).every((p) => p.percentage === 100),
  };
}
