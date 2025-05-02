// Export general API handlers that don't depend on Next.js
export {
  generatePresignedUrl,
  completeUpload,
  getFileAccessUrl,
} from './api-handlers';

// Export additional utility functions for server-side integration
export { createStorageBackend } from './storage-backend';
export { handleFilesystemUpload, handleS3Upload } from './upload-handlers';
export { generateFileKey } from './utils';

// Export file management utilities
export { listFiles, getFileUrl, deleteFile } from '../core/file-management';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Check if Next.js is available - without requiring it
const isNextAvailable = (() => {
  if (isBrowser) return false;

  try {
    // Use a dynamic require approach that won't cause bundlers to include Next.js
    return Boolean(
      Function(
        'try { return require("next/server"); } catch(e) { return false; }'
      )()
    );
  } catch (error) {
    return false;
  }
})();

// Next.js specific exports - these will be imported conditionally by users who need them
// We export them from a submodule to avoid dependencies when not needed
export const nextRoutes = {
  /**
   * Returns the Next.js presigned URL route handler or null if Next.js is not available
   */
  get presignedUrlRoute() {
    if (!isNextAvailable) {
      console.warn('Next.js is not available. Using null route handler.');
      return Promise.resolve(null);
    }

    return dynamicImportNextRoutes()
      .then((mod) => mod.presignedUrlRoute)
      .catch((error) => {
        console.warn('Failed to load Next.js presigned URL route:', error);
        return null;
      });
  },

  /**
   * Returns the Next.js complete upload route handler or null if Next.js is not available
   */
  get completeUploadRoute() {
    if (!isNextAvailable) {
      console.warn('Next.js is not available. Using null route handler.');
      return Promise.resolve(null);
    }

    return dynamicImportNextRoutes()
      .then((mod) => mod.completeUploadRoute)
      .catch((error) => {
        console.warn('Failed to load Next.js complete upload route:', error);
        return null;
      });
  },

  /**
   * Returns the Next.js file URL route handler or null if Next.js is not available
   */
  get getFileUrlRoute() {
    if (!isNextAvailable) {
      console.warn('Next.js is not available. Using null route handler.');
      return Promise.resolve(null);
    }

    return dynamicImportNextRoutes()
      .then((mod) => mod.getFileUrlRoute)
      .catch((error) => {
        console.warn('Failed to load Next.js get file URL route:', error);
        return null;
      });
  },
};

// Dynamic import function for Next.js routes
async function dynamicImportNextRoutes() {
  try {
    return await import('./next-routes');
  } catch (error) {
    console.warn(
      'Failed to import Next.js routes. Make sure Next.js is installed or use the general API handlers instead.'
    );
    return {
      presignedUrlRoute: null,
      completeUploadRoute: null,
      getFileUrlRoute: null,
    };
  }
}
