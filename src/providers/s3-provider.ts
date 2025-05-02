import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BaseStorageProvider } from './base-provider';
import {
  FileInfo,
  CompletedFileInfo,
  UploadUrlResponse,
  FileMetadata,
  S3Config,
} from '../core/types';

/**
 * S3 storage provider implementation
 * Handles direct uploads to Amazon S3 using presigned URLs
 */
export class S3Provider extends BaseStorageProvider {
  private s3Client: S3Client;
  private config: S3Config;

  constructor(config: S3Config) {
    super();
    this.config = config;

    this.s3Client = new S3Client({
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
  }

  /**
   * Generate a presigned URL for direct uploads to S3
   */
  async getUploadUrl(fileInfo: FileInfo): Promise<UploadUrlResponse> {
    // Create a unique key for the file
    const fileKey = this.generateFileKey(fileInfo);

    // Include optional upload folder if configured
    const fullKey = this.config.uploadFolder
      ? `${this.config.uploadFolder}/${fileKey}`
      : fileKey;

    // Check if we're using server mode
    const isServerMode = (this.config as any)?.server?.mode === 'server';
    const customUploadUrl = (this.config as any)?.server?.endpoints?.upload;

    // If in server mode and we have a custom upload URL, use that instead of direct S3
    if (isServerMode && customUploadUrl) {
      return {
        uploadUrl: customUploadUrl,
        fileKey: fullKey,
        fields: {
          key: fullKey,
          'content-type': fileInfo.type,
        },
      };
    }

    // Standard S3 presigned URL approach
    // Create the command to put an object
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: fullKey,
      ContentType: fileInfo.type,
    });

    // Generate presigned URL (default expiry: 1 hour)
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    return {
      uploadUrl,
      fileKey: fullKey,
    };
  }

  /**
   * Complete the upload process (for S3, the upload is already done via presigned URL)
   * This is a hook to record metadata or perform post-processing
   */
  async completeUpload(fileInfo: CompletedFileInfo): Promise<FileMetadata> {
    // Generate a URL for accessing the file
    const url = await this.generateAccessUrl(fileInfo.fileKey);

    // Return file metadata including the access URL
    return {
      name: fileInfo.name,
      size: fileInfo.size,
      type: fileInfo.type,
      key: fileInfo.fileKey,
      url: url,
      lastModified: fileInfo.lastModified
        ? new Date(fileInfo.lastModified)
        : new Date(),
    };
  }

  /**
   * Generate a presigned URL for accessing a file
   */
  async generateAccessUrl(fileKey: string, expiresIn = 86400): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: fileKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(fileKey: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return false;
    }
  }

  /**
   * List files from an S3 bucket
   */
  async listFiles(prefix?: string): Promise<FileMetadata[]> {
    try {
      // Set up input parameters for listing objects
      const input: ListObjectsV2CommandInput = {
        Bucket: this.config.bucket,
        MaxKeys: 1000, // Adjust as needed
      };

      // Add prefix if provided (include folder prefix if configured)
      if (prefix) {
        input.Prefix = this.config.uploadFolder
          ? `${this.config.uploadFolder}/${prefix}`
          : prefix;
      } else if (this.config.uploadFolder) {
        input.Prefix = this.config.uploadFolder;
      }

      // Create and send the list command
      const command = new ListObjectsV2Command(input);
      const response = await this.s3Client.send(command);

      // Map S3 objects to FileMetadata objects
      const filePromises =
        response.Contents?.map(async (item) => {
          // Skip folder objects (those ending with /)
          if (item.Key?.endsWith('/')) {
            return null;
          }

          // Extract file name from the key
          let fileName = item.Key || '';
          if (fileName.includes('/')) {
            fileName = fileName.split('/').pop() || '';
          }

          // Generate a URL for the file
          const url = await this.generateAccessUrl(item.Key || '');

          // Create metadata object
          return {
            name: fileName,
            size: item.Size || 0,
            type: this.getMimeType(fileName),
            key: item.Key || '',
            url,
            lastModified: item.LastModified || new Date(),
          } as FileMetadata;
        }) || [];

      // Wait for all URL generation to complete
      const resolvedFiles = await Promise.all(filePromises);

      // Filter out null values (from skipped folders)
      return resolvedFiles.filter(
        (file): file is FileMetadata => file !== null
      );
    } catch (error) {
      console.error('Error listing files from S3:', error);
      return [];
    }
  }

  /**
   * Simple MIME type detection based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
