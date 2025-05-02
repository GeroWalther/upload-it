import { UploaderConfig, StorageProvider, ProviderType } from '../core/types';
import { S3Provider } from './s3-provider';
import { FilesystemProvider } from './filesystem-provider';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Factory function to create the appropriate provider based on configuration
 */
export function createProvider(config: UploaderConfig): StorageProvider {
  const providerType = config.provider;

  switch (providerType) {
    case 's3':
      if (!config.s3) {
        throw new Error('S3 configuration is required when using S3 provider');
      }
      return new S3Provider(config.s3);

    case 'filesystem':
      if (isBrowser) {
        console.warn(
          'Filesystem provider is not recommended for browser environments. ' +
            'It has limited functionality and will not be able to access the file system. ' +
            'Consider using the S3 provider for client-side uploads.'
        );
      }

      if (!config.filesystem) {
        // For browser environments, create a dummy configuration to avoid errors
        if (isBrowser) {
          config.filesystem = {
            uploadDir: '/virtual/uploads',
            publicPath: '/uploads',
            createDirIfNotExist: false,
          };
        } else {
          throw new Error(
            'Filesystem configuration is required when using filesystem provider'
          );
        }
      }
      return new FilesystemProvider(config.filesystem);

    default:
      throw new Error(`Unsupported provider type: ${providerType as string}`);
  }
}

/**
 * Check if the configuration is valid for a specific provider
 */
export function validateConfig(config: UploaderConfig): boolean {
  if (!config.provider) {
    throw new Error('Provider type is required');
  }

  switch (config.provider) {
    case 's3':
      if (!config.s3) return false;
      if (!config.s3.region) return false;
      if (!config.s3.bucket) return false;

      // In server mode, credentials might be provided through environment variables
      if (config.server?.mode !== 'server' && !config.s3.credentials) {
        return false;
      }

      return true;

    case 'filesystem':
      // Special handling for browser environments
      if (isBrowser) {
        console.warn(
          'Validating filesystem provider in a browser environment. ' +
            'This provider is designed for server-side use.'
        );

        // For browser environments, allow the configuration to pass validation
        // with a warning, but still attempt to use the provided config if any
        if (!config.filesystem) {
          config.filesystem = {
            uploadDir: '/virtual/uploads',
            publicPath: '/uploads',
            createDirIfNotExist: false,
          };
        }

        return true;
      }

      // Normal validation for Node.js environments
      if (!config.filesystem) return false;
      if (!config.filesystem.uploadDir) return false;
      if (!config.filesystem.publicPath) return false;
      return true;

    default:
      return false;
  }
}
