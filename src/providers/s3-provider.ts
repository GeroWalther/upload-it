import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BaseStorageProvider } from "./base-provider";
import {
  FileInfo,
  CompletedFileInfo,
  UploadUrlResponse,
  FileMetadata,
  S3Config,
} from "../core/types";

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
      console.error("Error deleting file from S3:", error);
      return false;
    }
  }
}
