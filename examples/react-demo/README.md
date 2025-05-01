# UploadIt React Demo

This demo showcases the basic functionality of the UploadIt library with a React application using Vite.

## Features Demonstrated

- `UploadButton` component with the filesystem provider
- `useUploader` hook for custom upload UI
- File upload progress tracking
- Displaying uploaded files

## Running the Demo

1. Install dependencies:

   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   ```

2. Create uploads directory:

   ```bash
   mkdir public/uploads
   ```

3. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. Open your browser and navigate to http://localhost:5173

## Implementation Details

This demo uses the filesystem provider, which stores files in the local filesystem. In a real-world application, you would likely use the S3 provider for cloud storage.

The demo shows two methods of using UploadIt:

1. The `UploadButton` component for a ready-to-use UI
2. The `useUploader` hook for custom integration with your own UI components

Both methods share the same uploaded files list to demonstrate how they work together.
