# UploadIt Next.js Demo

This demo showcases secure server-side integration of the UploadIt library with Next.js.

## Features Demonstrated

- Secure server-side credential handling
- Direct-to-S3 uploads from the client
- API routes for upload handling
- Environment variables for configuration

## Running the Demo

1. Install dependencies:

   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   ```

2. Set up environment variables:

   - Copy `env.local.example` to `.env.local`
   - Fill in your actual S3 credentials in `.env.local`

3. Start the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. Open your browser and navigate to http://localhost:3000

## Implementation Details

This demo demonstrates the recommended secure approach for using UploadIt with S3:

1. AWS credentials are stored server-side as environment variables
2. Client requests presigned URLs from the server
3. Client uploads directly to S3 using these URLs
4. Server completes the upload process and returns file metadata
5. Client can access files via secure access URLs

This approach keeps your S3 credentials secure while still allowing direct client-to-S3 uploads for performance.

### API Routes

The demo uses three API routes:

- `/api/upload/presigned` - Generates presigned upload URLs
- `/api/upload/complete` - Finalizes uploads and returns metadata
- `/api/upload/url/[fileKey]` - Generates access URLs for uploaded files

These routes are implemented using the server-side utilities from UploadIt.
