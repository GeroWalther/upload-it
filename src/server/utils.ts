import { FileInfo } from '../core/types';

/**
 * Generates a unique file key for storage
 *
 * @param fileInfo - Information about the file
 * @returns A unique file key
 */
export function generateFileKey(fileInfo: FileInfo): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const sanitizedFilename = fileInfo.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const folderPrefix = fileInfo.folder ? `${fileInfo.folder}/` : '';

  return `${folderPrefix}${timestamp}-${randomString}-${sanitizedFilename}`;
}
