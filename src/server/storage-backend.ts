import { StorageProvider, ProviderType, UploaderConfig } from '../core/types';
import { createProvider } from '../providers/provider-factory';

/**
 * Creates a storage backend based on the provider type and configuration
 *
 * @param providerType - The type of storage provider (s3, filesystem)
 * @param config - The configuration for the provider
 * @returns A StorageProvider instance
 */
export function createStorageBackend(
  providerType: ProviderType,
  config: any
): StorageProvider {
  const uploaderConfig: UploaderConfig = {
    provider: providerType,
  };

  // Add the provider-specific configuration
  if (providerType === 's3') {
    uploaderConfig.s3 = config;
  } else if (providerType === 'filesystem') {
    uploaderConfig.filesystem = config;
  }

  // Set server mode to 'server' since we're running on the server
  uploaderConfig.server = {
    mode: 'server',
  };

  // Create the provider
  return createProvider(uploaderConfig);
}
