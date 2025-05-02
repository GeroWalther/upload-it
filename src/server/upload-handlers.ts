import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { FilesystemConfig, S3Config } from '../core/types';
// import { generateFileKey } from './utils';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Handles uploading a file buffer to the filesystem
 *
 * @param buffer - The file buffer to upload
 * @param key - The key (path) to save the file with
 * @param config - Filesystem configuration
 * @returns Promise that resolves when the file is saved
 */
export async function handleFilesystemUpload(
  buffer: Buffer,
  key: string,
  config: FilesystemConfig
): Promise<void> {
  const filePath = path.join(config.uploadDir, key);

  // Create directory if it doesn't exist
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write the buffer directly to file
  fs.writeFileSync(filePath, buffer);
}

/**
 * Handles uploading a file buffer to S3
 *
 * @param buffer - The file buffer to upload
 * @param key - The key (path) to save the file with
 * @param config - S3 configuration
 * @returns Promise that resolves when the file is uploaded
 */
export async function handleS3Upload(
  buffer: Buffer,
  key: string,
  config: S3Config
): Promise<void> {
  // Create S3 client
  const s3Client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: config.credentials
      ? {
          accessKeyId: config.credentials.accessKeyId,
          secretAccessKey: config.credentials.secretAccessKey,
        }
      : undefined,
    forcePathStyle: config.forcePathStyle ?? true,
  });

  // Upload the buffer directly to S3
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: buffer,
  });

  await s3Client.send(command);
}
