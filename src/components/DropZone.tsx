import React, { useState, useRef, useCallback } from 'react';
import { UploaderConfig, FileMetadata } from '../core/types';
import { useUploader } from '../hooks/useUploader';
import { UploadDialog } from './UploadDialog';
import './DropZone.css';

// Omit the callbacks from UploaderConfig that are handled internally
type DropZoneProps = Omit<
  UploaderConfig,
  'onUploadStart' | 'onUploadProgress' | 'onUploadComplete' | 'onUploadError'
> & {
  // Container props
  className?: string;
  activeClassName?: string;

  // Content props
  children?: React.ReactNode;
  label?: string;
  activeLabel?: string;
  icon?: React.ReactNode;
  showAcceptedTypes?: boolean;
  compact?: boolean;

  // Upload options
  multiple?: boolean;
  accept?: string;
  folder?: string;

  // Style properties
  height?: string | number;
  width?: string | number;

  // Callbacks
  onSuccess?: (files: FileMetadata[]) => void;
  onError?: (error: Error) => void;

  // Dialog options
  showProgressDialog?: boolean;
  showInlineProgress?: boolean;
  dialogTitle?: string;

  // Custom renderers
  renderDropzone?: (props: {
    isDragActive: boolean;
    isUploading: boolean;
    open: () => void;
    getRootProps: () => any;
    getInputProps: () => any;
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
 * DropZone component for drag-and-drop file uploads
 */
export function DropZone({
  // Uploader config
  provider,
  s3,
  filesystem,
  server,
  maxFileSize,
  allowedFileTypes,

  // Container props
  className = '',
  activeClassName = '',

  // Content props
  children,
  label = 'Drag & drop files here, or click to browse',
  activeLabel = 'Drop files to upload',
  icon,
  showAcceptedTypes = true,
  compact = false,

  // Upload options
  multiple = true,
  accept,
  folder,

  // Style properties
  height = 'auto',
  width = '100%',

  // Callbacks
  onSuccess,
  onError,

  // Dialog options
  showProgressDialog = true,
  showInlineProgress = true,
  dialogTitle = 'Upload Files',

  // Custom renderers
  renderDropzone,
  renderDialog,
}: DropZoneProps) {
  // Drop zone state
  const [isDragActive, setIsDragActive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Format file types for display
  const formatAcceptedTypes = () => {
    if (!accept) return null;

    const types = accept.split(',').map((type) => type.trim());

    // Convert to more readable format
    const formattedTypes = types.map((type) => {
      if (type.startsWith('.')) {
        return type.toUpperCase().substring(1); // Convert .pdf to PDF
      } else if (type.includes('/*')) {
        return type.split('/')[0].toUpperCase(); // Convert image/* to IMAGE
      } else {
        // For specific mime types, convert to more readable format
        const parts = type.split('/');
        if (parts.length === 2) {
          return parts[1].toUpperCase(); // application/pdf to PDF
        }
        return type;
      }
    });

    // Return unique types
    return [...new Set(formattedTypes)];
  };

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    // Open progress dialog if enabled
    if (showProgressDialog) {
      setDialogOpen(true);
    }

    try {
      // Start the upload
      await uploader.uploadFiles(files, folder);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  // Open the file browser
  const openFileDialog = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  // Handle file selection via click
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    handleFileUpload(Array.from(files));

    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  // Drag event handlers
  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(true);
    },
    []
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    },
    []
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);
    },
    []
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragActive(false);

      if (event.dataTransfer) {
        const files = Array.from(event.dataTransfer.files);
        if (files.length > 0) {
          // Filter files by accept pattern if specified
          let filesToUpload = files;
          if (accept) {
            const acceptTypes = accept.split(',').map((type) => type.trim());
            filesToUpload = files.filter((file) => {
              return acceptTypes.some((type) => {
                if (type.startsWith('.')) {
                  // Check file extension
                  return file.name.toLowerCase().endsWith(type.toLowerCase());
                } else if (type.includes('*')) {
                  // Handle wildcard MIME types like "image/*"
                  const [category] = type.split('/');
                  return file.type.startsWith(`${category}/`);
                } else {
                  // Exact MIME type match
                  return file.type === type;
                }
              });
            });
          }

          // If multiple is false, only take the first file
          if (!multiple && filesToUpload.length > 1) {
            filesToUpload = [filesToUpload[0]];
          }

          handleFileUpload(filesToUpload);
        }
      }
    },
    [accept, multiple]
  );

  // Getter functions for custom rendering
  const getRootProps = () => ({
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onClick: openFileDialog,
    className: `upload-it-dropzone ${className} ${compact ? 'compact' : ''} ${
      isDragActive ? `upload-it-dropzone-active ${activeClassName}` : ''
    } ${uploader.isUploading ? 'upload-it-uploading' : ''}`,
    style: { height, width },
  });

  const getInputProps = () => ({
    ref: inputRef,
    type: 'file',
    multiple,
    accept,
    onChange: handleFileSelect,
    style: { display: 'none' },
  });

  // Overall progress for the dialog
  const overallProgress = calculateOverallProgress();
  const isComplete = uploader.allFilesComplete && !uploader.isUploading;

  // Get accepted file types
  const acceptedTypes = formatAcceptedTypes();

  // Default dropzone rendering
  const defaultDropzone = (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <div className='upload-it-dropzone-content'>
        {icon || (
          <svg
            className='upload-it-icon'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
            />
          </svg>
        )}
        {children || (
          <div className='upload-it-dropzone-text'>
            {isDragActive ? activeLabel : label}
            {showAcceptedTypes && acceptedTypes && acceptedTypes.length > 0 && (
              <div className='upload-it-file-types'>
                {acceptedTypes.map((type, index) => (
                  <span key={index} className='upload-it-file-type'>
                    {type}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline upload progress */}
      {showInlineProgress && uploader.isUploading && (
        <div
          className='upload-it-upload-progress'
          style={{ width: `${overallProgress}%` }}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Render the dropzone */}
      {renderDropzone
        ? renderDropzone({
            isDragActive,
            isUploading: uploader.isUploading,
            open: openFileDialog,
            getRootProps,
            getInputProps,
          })
        : defaultDropzone}

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
