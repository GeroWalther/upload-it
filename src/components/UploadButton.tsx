import React, { useState } from "react";
import { UploaderConfig, FileMetadata } from "../core/types";
import { useUploader } from "../hooks/useUploader";
import { UploadDialog } from "./UploadDialog";

// Omit the callbacks from UploaderConfig that are handled internally
type UploadButtonProps = Omit<
  UploaderConfig,
  "onUploadStart" | "onUploadProgress" | "onUploadComplete" | "onUploadError"
> & {
  // Button props
  children?: React.ReactNode;
  className?: string;
  buttonText?: string;

  // Upload options
  multiple?: boolean;
  accept?: string;
  folder?: string;

  // Callbacks
  onSuccess?: (files: FileMetadata[]) => void;
  onError?: (error: Error) => void;

  // Dialog options
  showProgressDialog?: boolean;
  dialogTitle?: string;

  // Custom components
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
export function UploadButton({
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
  renderDialog,
}: UploadButtonProps) {
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  // Setup the uploader hook
  const uploader = useUploader({
    provider,
    s3,
    filesystem,
    server,
    maxFileSize,
    allowedFileTypes,
    onSuccess: (files) => {
      onSuccess?.(files);

      // Auto-close dialog after a brief delay if there are no errors
      if (!uploader.hasErrors) {
        setTimeout(() => {
          setDialogOpen(false);
          uploader.reset();
        }, 1000);
      }
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  // Calculate overall progress
  const calculateOverallProgress = (): number => {
    const progressValues = Object.values(uploader.progress);
    if (progressValues.length === 0) return 0;

    const totalLoaded = progressValues.reduce((sum, p) => sum + p.loaded, 0);
    const totalSize = progressValues.reduce((sum, p) => sum + p.total, 0);

    return Math.round((totalLoaded / totalSize) * 100);
  };

  // Handle file selection and upload
  const handleFileUpload = () => {
    // Create a file input
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    if (accept) input.accept = accept;

    // Handle file selection
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      // Open progress dialog if enabled
      if (showProgressDialog) {
        setDialogOpen(true);
      }

      try {
        // Start the upload
        await uploader.uploadFiles(Array.from(files), folder);
      } catch (error) {
        console.error("Upload error:", error);
      }
    };

    // Trigger file selection
    input.click();
  };

  // Default button rendering
  const defaultButton = (
    <button
      type="button"
      className={`upload-it-button ${className}`}
      onClick={handleFileUpload}
      disabled={uploader.isUploading}
    >
      {children || buttonText}
    </button>
  );

  // Overall progress for the dialog
  const overallProgress = calculateOverallProgress();
  const isComplete = uploader.allFilesComplete && !uploader.isUploading;

  return (
    <>
      {/* Render the button */}
      {renderButton
        ? renderButton({
            onClick: handleFileUpload,
            isUploading: uploader.isUploading,
          })
        : defaultButton}

      {/* Render the dialog if enabled */}
      {showProgressDialog &&
        (renderDialog ? (
          renderDialog({
            isOpen: dialogOpen,
            onClose: () => setDialogOpen(false),
            progress: overallProgress,
            isComplete,
            hasErrors: uploader.hasErrors,
          })
        ) : (
          <UploadDialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            progress={overallProgress}
            isComplete={isComplete}
            hasErrors={uploader.hasErrors}
            title={dialogTitle}
          />
        ))}
    </>
  );
}
