# UploadIt

A flexible and reusable file upload library with support for S3 and filesystem storage.

## Features

- 📤 Direct client-side uploads to S3
- 💾 Local filesystem support
- 🔒 Secure server-side credential handling
- 📊 Upload progress tracking
- 🔄 Automatic URL refreshing
- ⚛️ React components and hooks
- 📱 Next.js integration
- 🔌 Provider-based architecture

## Installation

```bash
npm install upload-it
# or
yarn add upload-it
# or
pnpm add upload-it
```

## Usage

### Basic Usage with React Component

```jsx
import { UploadButton } from "upload-it/react";

function MyApp() {
  return (
    <UploadButton
      provider="s3"
      s3={{
        region: "us-east-1",
        bucket: "my-bucket",
        credentials: {
          /* For development only! See secure usage below */
        },
      }}
      onUploadComplete={(files) => console.log("Uploaded files:", files)}
      multiple={true}
      accept="image/*,.pdf"
    />
  );
}
```

### Secure Usage with Next.js

1. Create API routes for uploads:

```tsx
// app/api/upload/presigned/route.ts
import { presignedUrlRoute } from "upload-it/server";
export { presignedUrlRoute as POST };

// app/api/upload/complete/route.ts
import { completeUploadRoute } from "upload-it/server";
export { completeUploadRoute as POST };

// app/api/upload/url/[fileKey]/route.ts
import { getFileUrlRoute } from "upload-it/server";
export { getFileUrlRoute as GET };
```

2. Configure environment variables:

```
UPLOAD_IT_S3_REGION=us-east-1
UPLOAD_IT_S3_BUCKET=my-bucket
UPLOAD_IT_S3_ACCESS_KEY=your-access-key
UPLOAD_IT_S3_SECRET_KEY=your-secret-key
UPLOAD_IT_S3_FOLDER=uploads
```

3. Use the component with server mode:

```jsx
import { UploadButton } from "upload-it/react";

function MyApp() {
  return (
    <UploadButton
      provider="s3"
      server={{
        mode: "server",
        endpoints: {
          getUploadUrl: "/api/upload/presigned",
          completeUpload: "/api/upload/complete",
          getAccessUrl: "/api/upload/url",
        },
      }}
      onUploadComplete={(files) => console.log("Uploaded files:", files)}
    />
  );
}
```

### Using the React Hook

```jsx
import { useUploader } from "upload-it";
import { useState } from "react";

function MyUploader() {
  const [files, setFiles] = useState([]);

  const uploader = useUploader({
    provider: "s3",
    s3: {
      region: "us-east-1",
      bucket: "my-bucket",
      credentials: {
        /* ... */
      },
    },
    onSuccess: (uploadedFiles) => {
      setFiles(uploadedFiles);
    },
  });

  const handleFileChange = async (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles.length > 0) {
      await uploader.uploadFiles(Array.from(selectedFiles));
    }
  };

  return (
    <div>
      <input type="file" multiple onChange={handleFileChange} />
      {uploader.isUploading && (
        <div>
          Uploading... {Object.values(uploader.progress)[0]?.percentage}%
        </div>
      )}
      {files.map((file) => (
        <div key={file.key}>
          {file.name} -{" "}
          <a href={file.url} target="_blank" rel="noopener noreferrer">
            View
          </a>
        </div>
      ))}
    </div>
  );
}
```

### Filesystem Storage

```jsx
import { UploadButton } from "upload-it/react";

function MyApp() {
  return (
    <UploadButton
      provider="filesystem"
      filesystem={{
        uploadDir: "./public/uploads",
        publicPath: "/uploads",
      }}
      onUploadComplete={(files) => console.log("Uploaded files:", files)}
    />
  );
}
```

### Core API (Non-React)

```js
import { createUploader } from "upload-it";

const uploader = createUploader({
  provider: "s3",
  s3: {
    region: "us-east-1",
    bucket: "my-bucket",
    credentials: {
      /* ... */
    },
  },
  onUploadProgress: (file, progress) => {
    console.log(`${file.name}: ${progress.percentage}%`);
  },
});

async function uploadFile(file) {
  try {
    const result = await uploader.uploadFile(file);
    console.log("File uploaded:", result);
    return result;
  } catch (error) {
    console.error("Upload failed:", error);
  }
}
```

## Component Props

### UploadButton Props

The `UploadButton` component accepts the following props:

#### Core Configuration

| Prop               | Type                   | Required                      | Description                                    |
| ------------------ | ---------------------- | ----------------------------- | ---------------------------------------------- |
| `provider`         | `'s3' \| 'filesystem'` | Yes                           | Storage provider to use                        |
| `s3`               | `S3Config`             | Only with s3 provider         | S3 configuration                               |
| `filesystem`       | `FilesystemConfig`     | Only with filesystem provider | Filesystem configuration                       |
| `server`           | `ServerConfig`         | No                            | Server configuration for secure mode           |
| `maxFileSize`      | `number`               | No                            | Maximum file size in bytes                     |
| `allowedFileTypes` | `string[]`             | No                            | Allowed file types (e.g., ['image/*', '.pdf']) |

#### UI Customization

| Prop                 | Type              | Required | Default         | Description                         |
| -------------------- | ----------------- | -------- | --------------- | ----------------------------------- |
| `className`          | `string`          | No       | `''`            | CSS class applied to the button     |
| `buttonText`         | `string`          | No       | `'Upload'`      | Text displayed on the button        |
| `children`           | `React.ReactNode` | No       | `null`          | Content to render inside the button |
| `showProgressDialog` | `boolean`         | No       | `true`          | Whether to show the progress dialog |
| `dialogTitle`        | `string`          | No       | `'Upload File'` | Title for the progress dialog       |

#### Upload Options

| Prop       | Type      | Required | Default     | Description                              |
| ---------- | --------- | -------- | ----------- | ---------------------------------------- |
| `multiple` | `boolean` | No       | `false`     | Allow multiple file selection            |
| `accept`   | `string`  | No       | `undefined` | File type filter (e.g., "image/\*,.pdf") |
| `folder`   | `string`  | No       | `undefined` | Optional folder path for uploaded files  |

#### Callbacks

| Prop        | Type                              | Required | Description                               |
| ----------- | --------------------------------- | -------- | ----------------------------------------- |
| `onSuccess` | `(files: FileMetadata[]) => void` | No       | Called when uploads complete successfully |
| `onError`   | `(error: Error) => void`          | No       | Called when an error occurs               |

#### Advanced Customization

| Prop           | Type                                                                                                                               | Required | Description             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------- |
| `renderButton` | `(props: { onClick: () => void; isUploading: boolean }) => React.ReactNode`                                                        | No       | Custom button rendering |
| `renderDialog` | `(props: { isOpen: boolean; onClose: () => void; progress: number; isComplete: boolean; hasErrors: boolean; }) => React.ReactNode` | No       | Custom dialog rendering |

## Configuration Options

### Common Options

| Option             | Type                   | Description                                      |
| ------------------ | ---------------------- | ------------------------------------------------ |
| `provider`         | `'s3' \| 'filesystem'` | Storage provider to use                          |
| `maxFileSize`      | `number`               | Maximum file size in bytes                       |
| `allowedFileTypes` | `string[]`             | Allowed file types (e.g., `['image/*', '.pdf']`) |

### S3 Provider Options

| Option         | Type                                               | Description                                 |
| -------------- | -------------------------------------------------- | ------------------------------------------- |
| `region`       | `string`                                           | AWS region                                  |
| `bucket`       | `string`                                           | S3 bucket name                              |
| `credentials`  | `{ accessKeyId: string, secretAccessKey: string }` | AWS credentials                             |
| `endpoint`     | `string`                                           | Custom endpoint (for S3-compatible storage) |
| `uploadFolder` | `string`                                           | Folder prefix for uploaded files            |

### Filesystem Provider Options

| Option                | Type      | Description                          |
| --------------------- | --------- | ------------------------------------ |
| `uploadDir`           | `string`  | Directory to store uploaded files    |
| `publicPath`          | `string`  | Public URL path to access files      |
| `createDirIfNotExist` | `boolean` | Create directory if it doesn't exist |

### Server Options

| Option      | Type                                                                        | Description                          |
| ----------- | --------------------------------------------------------------------------- | ------------------------------------ |
| `mode`      | `'client' \| 'server'`                                                      | Whether to use client or server mode |
| `endpoints` | `{ getUploadUrl?: string, completeUpload?: string, getAccessUrl?: string }` | API endpoints for server operations  |

## License

MIT
