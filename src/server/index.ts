// Export Next.js specific routes
export {
  presignedUrlRoute,
  completeUploadRoute,
  getFileUrlRoute,
} from './next-routes';

// Also re-export the API handlers for convenience
export {
  generatePresignedUrl,
  completeUpload,
  getFileAccessUrl,
} from './api-handlers';
