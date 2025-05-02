import React, { useState, useEffect } from 'react';
import type {
  FileMetadata,
  ProviderType,
  FilesystemConfig,
  S3Config,
} from '../core/types';
import './FileList.css';

// Type for available providers
type ProviderFilter = 'all' | ProviderType;

export interface FileListProps {
  /** Function to fetch files */
  fetchFiles: () => Promise<FileMetadata[]>;

  /** Initial files to display (optional) */
  initialFiles?: FileMetadata[];

  /** Show filter buttons for providers */
  showFilters?: boolean;

  /** Custom renderer for file items */
  renderFile?: (file: FileMetadata) => React.ReactNode;

  /** Number of columns to display (defaults to 'auto-fill') */
  columns?: number | 'auto-fill';

  /** Custom CSS class for the container */
  className?: string;

  /** Custom CSS class for each file item */
  fileClassName?: string;

  /** Show loading spinner */
  showLoading?: boolean;

  /** Text to display when no files are found */
  emptyText?: string;

  /** Callback when a file is clicked */
  onFileClick?: (file: FileMetadata) => void;

  /** Show file icons instead of image previews (default: false) */
  showFileIcons?: boolean;
}

/**
 * SVG icons for different file types
 */
export const FileIcons = {
  // Image icon
  image: (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='currentColor'
      width='24'
      height='24'>
      <path d='M19,3H5A3,3,0,0,0,2,6V18a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V6A3,3,0,0,0,19,3ZM5,5H19a1,1,0,0,1,1,1v8.36l-3.2-2.73a2.77,2.77,0,0,0-3.52,0L5,17.94V6A1,1,0,0,1,5,5ZM19,19H5.1l8.25-7.21.25-.22a.78.78,0,0,1,1,0l5.4,4.62V18A1,1,0,0,1,19,19ZM7.5,11A1.5,1.5,0,1,0,6,9.5,1.5,1.5,0,0,0,7.5,11Z' />
    </svg>
  ),
  // Document icon
  document: (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='currentColor'
      width='24'
      height='24'>
      <path d='M19,3H5A3,3,0,0,0,2,6V18a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V6A3,3,0,0,0,19,3Zm1,15a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V6A1,1,0,0,1,5,5H19a1,1,0,0,1,1,1ZM7,7h10a1,1,0,0,1,0,2H7A1,1,0,0,1,7,7Zm0,4h10a1,1,0,0,1,0,2H7a1,1,0,0,1,0-2Zm0,4h7a1,1,0,0,1,0,2H7a1,1,0,0,1,0-2Z' />
    </svg>
  ),
  // PDF icon
  pdf: (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='currentColor'
      width='24'
      height='24'>
      <path d='M20,8.94a1.31,1.31,0,0,0-.06-.27l0-.09a1.07,1.07,0,0,0-.19-.28h0l-6-6h0a1.07,1.07,0,0,0-.28-.19.32.32,0,0,0-.09,0A.88.88,0,0,0,13.05,2H7A3,3,0,0,0,4,5V19a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V9S20,9,20,8.94ZM14,5.41,16.59,8H15a1,1,0,0,1-1-1ZM18,19a1,1,0,0,1-1,1H7a1,1,0,0,1-1-1V5A1,1,0,0,1,7,4h5V7a3,3,0,0,0,3,3h3Zm-4.71-5.29A1,1,0,0,0,12,13H10a1,1,0,0,0,0,2h1v1a1,1,0,0,0,2,0V15h1a1,1,0,0,0,0-2H13V12A1,1,0,0,0,13.29,13.71Z' />
    </svg>
  ),
  // Excel/spreadsheet icon
  excel: (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='currentColor'
      width='24'
      height='24'>
      <path d='M21,5c0-.51-.49-.8-1.04-.8H15V3c0-.55-.45-1-1-1H8C7.45,2,7,2.45,7,3v1.15H4c-.55,0-1,.45-1,1V19c0,.55.44,1.4,1,1.4h16c.56,0,1-.85,1-1.4V5ZM8,6V3h6v3h-2l2,3h-.5L11,6Zm11,13H5V5h2v1c0,.55.45,1,1,1h6c.55,0,1-.45,1-1V5h4V19Z' />
      <path d='M7,13h2v2h-2Zm4,0h2v2h-2Zm4,0h2v2h-2ZM7,17h2v2h-2Zm4,0h2v2h-2Zm4,0h2v2h-2Z' />
    </svg>
  ),
  // Archive/zip icon
  archive: (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='currentColor'
      width='24'
      height='24'>
      <path d='M10,14h4a1,1,0,0,0,0-2H10a1,1,0,0,0,0,2ZM19,3H5A3,3,0,0,0,2,6V18a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V6A3,3,0,0,0,19,3Zm1,15a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V6A1,1,0,0,1,5,5H19a1,1,0,0,1,1,1Z' />
      <path d='M10,8h2v2h-2zm2,2h2v2h-2zm-2,4h2v2h-2zm2,2h2v2h-2z' />
    </svg>
  ),
  // Default file icon
  default: (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='currentColor'
      width='24'
      height='24'>
      <path d='M20,8.94a1.31,1.31,0,0,0-.06-.27l0-.09a1.07,1.07,0,0,0-.19-.28h0l-6-6h0a1.07,1.07,0,0,0-.28-.19.32.32,0,0,0-.09,0A.88.88,0,0,0,13.05,2H7A3,3,0,0,0,4,5V19a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V9S20,9,20,8.94ZM14,5.41,16.59,8H15a1,1,0,0,1-1-1ZM18,19a1,1,0,0,1-1,1H7a1,1,0,0,1-1-1V5A1,1,0,0,1,7,4h5V7a3,3,0,0,0,3,3h3Z' />
    </svg>
  ),
};

/**
 * A component for displaying files from storage providers
 */
export function FileList({
  fetchFiles,
  initialFiles = [],
  showFilters = true,
  renderFile,
  columns = 'auto-fill',
  className = '',
  fileClassName = '',
  showLoading = true,
  emptyText = 'No files found',
  onFileClick,
  showFileIcons = false,
}: FileListProps): React.ReactElement {
  const [files, setFiles] = useState<FileMetadata[]>(initialFiles);
  const [loading, setLoading] = useState(initialFiles.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProviderFilter>('all');

  // Fetch files when the component mounts
  useEffect(() => {
    if (initialFiles.length === 0) {
      loadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load files from the provided fetch function
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchFiles();
      setFiles(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');
      setLoading(false);
    }
  };

  // Filter files based on selected provider
  const filteredFiles =
    filter === 'all' ? files : files.filter((file) => file.provider === filter);

  // Get file type for icon display
  const getFileType = (file: FileMetadata): string => {
    // Get extension from file name
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    // Match extension to file type
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
      return 'image';
    } else if (['pdf'].includes(extension)) {
      return 'pdf';
    } else if (['doc', 'docx', 'rtf', 'txt', 'odt'].includes(extension)) {
      return 'document';
    } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return 'excel';
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return 'archive';
    } else {
      return 'default';
    }
  };

  // Get appropriate icon for file type
  const getFileIcon = (file: FileMetadata) => {
    const fileType = getFileType(file);
    return FileIcons[fileType as keyof typeof FileIcons] || FileIcons.default;
  };

  // Default file renderer
  const defaultRenderFile = (file: FileMetadata) => {
    const isImage = file.type.startsWith('image/');
    const fileType = getFileType(file);
    const extension = file.name.split('.').pop()?.toUpperCase() || 'FILE';

    return (
      <div
        className={`upload-it-file-card ${fileClassName}`}
        onClick={() => onFileClick?.(file)}
        key={file.key}>
        <div className='upload-it-file-preview'>
          {isImage && !showFileIcons ? (
            <img src={file.url} alt={file.name} />
          ) : (
            <div className='upload-it-file-icon' data-type={fileType}>
              {getFileIcon(file)}
              <span className='file-extension'>{extension}</span>
            </div>
          )}
        </div>
        <div className='upload-it-file-info'>
          <h3 className='upload-it-file-name'>{file.name}</h3>
          <div className='upload-it-file-meta'>
            <span className='upload-it-file-size'>
              {formatFileSize(file.size)}
            </span>
            {file.provider && (
              <span className='upload-it-file-provider'>{file.provider}</span>
            )}
          </div>
          <div className='upload-it-file-actions'>
            <a
              href={file.url}
              target='_blank'
              rel='noopener noreferrer'
              onClick={(e) => e.stopPropagation()}>
              Download
            </a>
          </div>
        </div>
      </div>
    );
  };

  // Column style calculation
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns:
      typeof columns === 'number'
        ? `repeat(${columns}, 1fr)`
        : `repeat(auto-fill, minmax(250px, 1fr))`,
    gap: '1rem',
  };

  return (
    <div className={`upload-it-file-list ${className}`}>
      {error && <div className='upload-it-error'>{error}</div>}

      {showFilters && (
        <div className='upload-it-filters'>
          <button
            className={`upload-it-filter-btn ${
              filter === 'all' ? 'active' : ''
            }`}
            onClick={() => setFilter('all')}>
            All Files
          </button>
          <button
            className={`upload-it-filter-btn ${
              filter === 'filesystem' ? 'active' : ''
            }`}
            onClick={() => setFilter('filesystem')}>
            Local Files
          </button>
          <button
            className={`upload-it-filter-btn ${
              filter === 's3' ? 'active' : ''
            }`}
            onClick={() => setFilter('s3')}>
            S3 Files
          </button>
        </div>
      )}

      {loading && showLoading ? (
        <div className='upload-it-loading'>Loading files...</div>
      ) : filteredFiles.length === 0 ? (
        <div className='upload-it-empty'>{emptyText}</div>
      ) : (
        <div className='upload-it-files-grid' style={gridStyle}>
          {filteredFiles.map((file) =>
            renderFile ? renderFile(file) : defaultRenderFile(file)
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Create a hook for fetching files from a provider
export function useFileList(
  providerType: ProviderType,
  config: FilesystemConfig | S3Config,
  prefix?: string
) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to load files
  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use dynamic import to avoid including server-side code in client builds
      const { listFiles } = await import('../core/file-management');
      const data = await listFiles(providerType, config, prefix);

      setFiles(data);
      setLoading(false);
      return data;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to load files');
      console.error('Error fetching files:', error);
      setError(error);
      setLoading(false);
      return [];
    }
  };

  // Load files on mount
  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerType, prefix]);

  return {
    files,
    loading,
    error,
    refresh: loadFiles,
  };
}
