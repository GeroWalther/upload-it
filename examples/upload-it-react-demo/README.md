# Upload-It React Demo

A demonstration of the `@gw-intech/upload-it` package with both filesystem and S3 storage options.

## Features

- File uploads to local filesystem
- File uploads to S3 (when configured)
- Upload progress tracking
- File listing and preview
- React-based UI

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

Edit the `.env` file to set up your S3 credentials if you want to use S3 storage. For local filesystem storage, no additional configuration is needed.

```
# S3 Configuration
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

## Running the application

Run both the React frontend and Express backend:

```bash
npm run dev:all
```

Or run them separately:

```bash
# Run just the frontend
npm run dev

# Run just the backend
npm run server
```

## Usage

1. Open the application in your browser (usually at http://localhost:5173)
2. Choose between Filesystem or S3 storage using the tabs
3. Click the Upload button to select and upload files
4. View the uploaded files in the list below

## API Endpoints

### Filesystem Storage

- `POST /api/upload/filesystem/presigned` - Get presigned upload URL
- `POST /api/upload/filesystem` - Upload file
- `POST /api/upload/filesystem/complete` - Complete the upload process
- `GET /api/upload/filesystem/url/:fileKey` - Get file access URL
- `GET /api/uploads/filesystem` - List uploaded files
- `DELETE /api/upload/filesystem/:fileKey` - Delete file

### S3 Storage

- `POST /api/upload/s3/presigned` - Get presigned upload URL for S3
- `POST /api/upload/s3/complete` - Complete S3 upload process
- `GET /api/upload/s3/url/:fileKey` - Get S3 file access URL

## License

MIT
