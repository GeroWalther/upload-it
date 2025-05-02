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
        throw new Error(
          'Filesystem configuration is required when using filesystem provider'
        );
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
      // Warn if trying to validate filesystem config in browser environment
      if (isBrowser) {
        console.warn(
          'Validating filesystem provider in a browser environment. ' +
            'This provider is designed for server-side use.'
        );
      }

      if (!config.filesystem) return false;
      if (!config.filesystem.uploadDir) return false;
      if (!config.filesystem.publicPath) return false;
      return true;

    default:
      return false;
  }
}
