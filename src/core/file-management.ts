import { createStorageBackend } from '../server/storage-backend';
import type {
  FileMetadata,
  ProviderType,
  FilesystemConfig,
  S3Config,
} from './types';
import fs from 'fs';
import path from 'path';

/**
 * List files from a storage provider (filesystem or S3)
 *
 * @param providerType - The type of provider ('filesystem' or 's3')
 * @param config - The provider configuration
 * @param prefix - Optional prefix to filter files by (folder path)
 * @returns A promise that resolves to an array of file metadata
 */
export async function listFiles(
  providerType: ProviderType,
  config: FilesystemConfig | S3Config,
  prefix?: string
): Promise<FileMetadata[]> {
  try {
    // Create the storage backend using the factory
    const provider = createStorageBackend(providerType, config);

    // Check if the provider supports listing files
    if (provider.listFiles) {
      try {
        // Call the provider's listFiles method
        return await provider.listFiles(prefix);
      } catch (error) {
        console.error(`Error using provider's listFiles method:`, error);

        // For filesystem provider, we can implement a fallback
        if (
          providerType === 'filesystem' &&
          'uploadDir' in config &&
          'publicPath' in config
        ) {
          return await listFilesFromFilesystem(
            config.uploadDir,
            config.publicPath,
            prefix
          );
        }

        // Re-throw for other providers
        throw error;
      }
    } else if (
      providerType === 'filesystem' &&
      'uploadDir' in config &&
      'publicPath' in config
    ) {
      // Direct filesystem listing when provider doesn't support listFiles
      return await listFilesFromFilesystem(
        config.uploadDir,
        config.publicPath,
        prefix
      );
    }

    console.warn(`The ${providerType} provider does not support listing files`);
    return [];
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

/**
 * Direct filesystem implementation for listing files
 */
async function listFilesFromFilesystem(
  uploadDir: string,
  publicPath: string,
  prefix?: string
): Promise<FileMetadata[]> {
  try {
    // Skip if not in Node.js environment
    if (typeof window !== 'undefined') {
      console.warn('listFilesFromFilesystem is only available on the server');
      return [];
    }

    const directory = prefix ? path.join(uploadDir, prefix) : uploadDir;

    if (!fs.existsSync(directory)) {
      console.warn(`Directory ${directory} does not exist`);
      return [];
    }

    // Determine server base URL - this is best effort in direct filesystem mode
    const getServerBaseUrl = () => {
      // Check common environment variables
      if (process.env.SERVER_URL) return process.env.SERVER_URL;

      // Default to localhost with common port
      const port = process.env.PORT || 3000;
      return `http://localhost:${port}`;
    };

    const serverBaseUrl = getServerBaseUrl();

    return fs
      .readdirSync(directory)
      .filter((file) => {
        try {
          return fs.statSync(path.join(directory, file)).isFile();
        } catch (e) {
          console.error(`Error checking file ${file}:`, e);
          return false;
        }
      })
      .map((file) => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        const relativePath = prefix ? `${prefix}/${file}` : file;

        // Determine file type from extension
        const ext = path.extname(file).toLowerCase();
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.txt': 'text/plain',
        };

        return {
          name: file,
          size: stats.size,
          type: mimeTypes[ext] || 'application/octet-stream',
          key: relativePath,
          url: `${serverBaseUrl}${publicPath}/${relativePath}`,
          lastModified: stats.mtime,
          provider: 'filesystem',
        };
      });
  } catch (error) {
    console.error('Error in filesystem listing:', error);
    return [];
  }
}

/**
 * Get the URL for a specific file from a storage provider
 *
 * @param providerType - The type of provider ('filesystem' or 's3')
 * @param config - The provider configuration
 * @param fileKey - The key of the file to get the URL for
 * @returns A promise that resolves to the file URL
 */
export async function getFileUrl(
  providerType: ProviderType,
  config: FilesystemConfig | S3Config,
  fileKey: string
): Promise<string> {
  try {
    // Create the storage backend using the factory
    const provider = createStorageBackend(providerType, config);

    // Call the provider's generateAccessUrl method
    return await provider.generateAccessUrl(fileKey);
  } catch (error) {
    console.error('Error getting file URL:', error);
    throw error;
  }
}

/**
 * Delete a file from a storage provider
 *
 * @param providerType - The type of provider ('filesystem' or 's3')
 * @param config - The provider configuration
 * @param fileKey - The key of the file to delete
 * @returns A promise that resolves to a boolean indicating success
 */
export async function deleteFile(
  providerType: ProviderType,
  config: FilesystemConfig | S3Config,
  fileKey: string
): Promise<boolean> {
  try {
    // Create the storage backend using the factory
    const provider = createStorageBackend(providerType, config);

    // Check if the provider supports deleting files
    if (!provider.deleteFile) {
      console.warn(
        `The ${providerType} provider does not support deleting files`
      );
      return false;
    }

    // Call the provider's deleteFile method
    return await provider.deleteFile(fileKey);
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}
