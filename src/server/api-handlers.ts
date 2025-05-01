import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3Config,
  FileInfo,
  CompletedFileInfo,
  FileMetadata,
} from "../core/types";

/**
 * Server-side handler for generating presigned URLs for uploads
 * Uses environment variables or provided credentials (in a secure backend context)
 */
export async function generatePresignedUrl(
  fileInfo: FileInfo,
  config: S3Config,
): Promise<{ uploadUrl: string; fileKey: string }> {
  const s3Client = createS3Client(config);

  // Generate a file key
  const timestamp = Date.now();
  const sanitizedFilename = fileInfo.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const folderPrefix = fileInfo.folder ? `${fileInfo.folder}/` : "";
  const uploadFolder = config.uploadFolder ? `${config.uploadFolder}/` : "";
  const fileKey = `${uploadFolder}${folderPrefix}${timestamp}-${sanitizedFilename}`;

  // Create the command to put an object
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: fileKey,
    ContentType: fileInfo.type,
  });

  // Generate presigned URL (default expiry: 1 hour)
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    uploadUrl,
    fileKey,
  };
}

/**
 * Server-side handler for completing an upload
 */
export async function completeUpload(
  fileInfo: CompletedFileInfo,
  config: S3Config,
): Promise<FileMetadata> {
  const s3Client = createS3Client(config);

  // Generate an access URL
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: fileInfo.fileKey,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 86400 }); // 24 hours

  // Return metadata
  return {
    name: fileInfo.name,
    size: fileInfo.size,
    type: fileInfo.type,
    key: fileInfo.fileKey,
    url,
    lastModified: fileInfo.lastModified
      ? new Date(fileInfo.lastModified)
      : new Date(),
  };
}

/**
 * Server-side handler for getting an access URL for a file
 */
export async function getFileAccessUrl(
  fileKey: string,
  config: S3Config,
  expiresIn = 86400, // 24 hours
): Promise<string> {
  const s3Client = createS3Client(config);

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: fileKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Create an S3 client with the provided configuration
 */
function createS3Client(config: S3Config): S3Client {
  return new S3Client({
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
