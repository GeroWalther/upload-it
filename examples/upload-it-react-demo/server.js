/* eslint-disable no-undef */
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { join } from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import * as url from 'url';
import {
  createStorageBackend,
  handleS3Upload,
  handleFilesystemUpload,
} from '@gw-intech/upload-it/server';

// Load environment variables
config();

// Setup for ES modules in Node.js
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Basic server setup
const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer to use memory storage (no temp files)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Setup middleware
app.use(cors());
app.use(express.json());

// Configuration
const uploadDir = join(__dirname, 'public/uploads');
const publicPath = '/uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files
app.use(express.static('public'));

// Local implementation of generateFileKey to avoid Next.js dependency
// function generateFileKey(fileInfo) {
//   const timestamp = Date.now();
//   const randomString = Math.random().toString(36).substring(2, 10);
//   const sanitizedFilename = fileInfo.name.replace(/[^a-zA-Z0-9.-]/g, '_');
//   const folderPrefix = fileInfo.folder ? `${fileInfo.folder}/` : '';

//   return `${folderPrefix}${timestamp}-${randomString}-${sanitizedFilename}`;
// }

// Create provider configurations
const filesystemConfig = {
  uploadDir,
  publicPath,
  createDirIfNotExist: true,
};

const s3Config = {
  region: process.env.S3_REGION,
  bucket: process.env.S3_BUCKET,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
};

// Initialize storage backends
const filesystemBackend = createStorageBackend('filesystem', filesystemConfig);
const s3Backend = process.env.S3_BUCKET
  ? createStorageBackend('s3', s3Config)
  : null;

// ===== FILESYSTEM ROUTES =====

// Get presigned URL
app.post('/api/upload/filesystem/presigned', async (req, res) => {
  try {
    const { fileName, contentType, folder } = req.body;
    console.log('Filesystem presigned URL request:', req.body);

    if (!fileName || !contentType) {
      return res
        .status(400)
        .json({ error: 'fileName and contentType are required' });
    }

    const fileInfo = {
      name: fileName,
      type: contentType,
      size: 0,
      folder,
    };

    try {
      // Try to use the provider first
      const result = await filesystemBackend.getUploadUrl(fileInfo);
      console.log('Filesystem backend URL generation successful:', result);
      res.json(result);
    } catch (error) {
      console.error(
        'Filesystem backend error, using custom implementation:',
        error
      );

      // Generate a fileKey manually if the backend fails
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const sanitizedFilename = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const folderPrefix = folder ? `${folder}/` : '';
      const fileKey = `${folderPrefix}${timestamp}-${randomString}-${sanitizedFilename}`;

      // Create a "presigned" URL for the filesystem (just the upload endpoint)
      const uploadUrl = '/api/upload';

      const result = {
        uploadUrl,
        fileKey,
        fields: {
          key: fileKey,
          provider: 'filesystem',
        },
      };

      console.log('Generated custom upload URL data:', result);
      res.json(result);
    }
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle file upload
app.post('/api/upload/filesystem', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    await handleFilesystemUpload(req.file.buffer, key, filesystemConfig);
    res.json({ success: true, key });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete upload
app.post('/api/upload/filesystem/complete', async (req, res) => {
  try {
    const { fileKey, name, type, size, lastModified } = req.body;
    console.log('Complete upload request:', req.body);

    if (!fileKey || !name || !type || !size) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const filePath = join(uploadDir, fileKey);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    // Create our own file metadata instead of using the provider's
    const url = `${publicPath}/${fileKey}`;
    const fullUrl = `http://localhost:${PORT}${url}`;

    const file = {
      key: fileKey,
      name,
      size,
      type,
      url: fullUrl,
      lastModified: lastModified ? new Date(lastModified) : new Date(),
    };

    console.log('Returning file metadata:', file);
    res.json({ success: true, file });
  } catch (error) {
    console.error('Error completing upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get file URL
app.get('/api/upload/filesystem/url/:fileKey', async (req, res) => {
  try {
    const { fileKey } = req.params;
    console.log('Get file URL request:', fileKey);

    if (!fileKey) {
      return res.status(400).json({ error: 'File key is required' });
    }

    const filePath = join(uploadDir, fileKey);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    // Construct URL directly instead of using the provider
    const url = `${publicPath}/${fileKey}`;
    const fullUrl = `http://localhost:${PORT}${url}`;

    console.log('Returning URL:', fullUrl);
    res.json({ url: fullUrl });
  } catch (error) {
    console.error('Error getting file URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// List files
app.get('/api/uploads/filesystem', async (req, res) => {
  try {
    const { prefix } = req.query;

    if (!filesystemBackend.listFiles) {
      return res.status(501).json({ error: 'Listing files not supported' });
    }

    const files = await filesystemBackend.listFiles(prefix);
    res.json(files);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file
app.delete('/api/upload/filesystem/:fileKey', async (req, res) => {
  try {
    const { fileKey } = req.params;

    if (!fileKey) {
      return res.status(400).json({ error: 'File key is required' });
    }

    if (!filesystemBackend.deleteFile) {
      return res.status(501).json({ error: 'Deleting files not supported' });
    }

    const success = await filesystemBackend.deleteFile(fileKey);
    res.json({ success });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== S3 ROUTES =====

// Get S3 presigned URL
app.post('/api/upload/s3/presigned', async (req, res) => {
  try {
    const { fileName, contentType, folder } = req.body;
    console.log('S3 presigned URL request:', req.body);

    if (!s3Backend) {
      console.log('S3 not configured, using fallback implementation');
      // Fallback - use custom implementation similar to filesystem
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const sanitizedFilename = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const folderPrefix = folder ? `${folder}/` : '';
      const fileKey = `${folderPrefix}${timestamp}-${randomString}-${sanitizedFilename}`;

      // Create a "presigned" URL for the filesystem (just the upload endpoint)
      const uploadUrl = '/api/upload';

      const result = {
        uploadUrl,
        fileKey,
        fields: {
          key: fileKey,
          provider: 's3',
        },
      };

      console.log('Generated fallback S3 upload URL data:', result);
      return res.json(result);
    }

    const fileInfo = {
      name: fileName,
      type: contentType,
      size: 0,
      folder,
    };

    try {
      // Try to use the backend if available
      const result = await s3Backend.getUploadUrl(fileInfo);
      console.log('S3 backend URL generation successful:', result);
      res.json(result);
    } catch (error) {
      console.error('S3 backend error, using fallback implementation:', error);

      // Fallback implementation
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const sanitizedFilename = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const folderPrefix = folder ? `${folder}/` : '';
      const fileKey = `${folderPrefix}${timestamp}-${randomString}-${sanitizedFilename}`;

      const uploadUrl = '/api/upload';

      const result = {
        uploadUrl,
        fileKey,
        fields: {
          key: fileKey,
          provider: 's3',
        },
      };

      console.log('Generated fallback S3 upload URL data:', result);
      res.json(result);
    }
  } catch (error) {
    console.error('Error generating S3 presigned URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete S3 upload
app.post('/api/upload/s3/complete', async (req, res) => {
  try {
    console.log('S3 complete upload request:', req.body);

    if (!s3Backend) {
      return res.status(400).json({
        error: 'S3 configuration missing. Please set S3 environment variables.',
      });
    }

    const { fileKey, name, size, type, lastModified } = req.body;

    if (!fileKey || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Try to use the backend if available
      const file = await s3Backend.completeUpload(req.body);
      console.log('S3 backend completion successful:', file);
      res.json({ success: true, file });
    } catch (error) {
      console.error('S3 backend error, using fallback:', error);

      // Fallback for demo purposes when S3 isn't properly configured
      // This would normally construct a URL to the S3 bucket
      const baseUrl =
        process.env.S3_BASE_URL || `http://localhost:${PORT}/uploads/s3`;
      const url = `${baseUrl}/${fileKey}`;

      const file = {
        key: fileKey,
        name,
        size: size || 0,
        type: type || 'application/octet-stream',
        url,
        lastModified: lastModified ? new Date(lastModified) : new Date(),
      };

      console.log('Returning fallback file metadata:', file);
      res.json({ success: true, file });
    }
  } catch (error) {
    console.error('Error completing S3 upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle S3 direct uploads for demo purposes
app.post('/api/upload/s3', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    if (!s3Backend) {
      // For demo purposes, if S3 is not configured, save to local filesystem
      const s3Dir = join(uploadDir, 's3');
      if (!fs.existsSync(s3Dir)) {
        fs.mkdirSync(s3Dir, { recursive: true });
      }

      await handleFilesystemUpload(req.file.buffer, key, {
        ...filesystemConfig,
        uploadDir: s3Dir,
      });
    } else {
      // In a real app, this would use S3Backend to handle the upload
      await handleS3Upload(req.file.buffer, key, s3Config);
    }

    res.json({ success: true, key });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get S3 file URL
app.get('/api/upload/s3/url/:fileKey', async (req, res) => {
  try {
    const { fileKey } = req.params;
    console.log('Get S3 file URL request:', fileKey);

    if (!s3Backend) {
      console.log('S3 not configured, using fallback URL');
      // Fallback for demo purposes
      const baseUrl =
        process.env.S3_BASE_URL || `http://localhost:${PORT}/uploads/s3`;
      const url = `${baseUrl}/${fileKey}`;
      return res.json({ url });
    }

    try {
      // Try to use the backend if available
      const url = await s3Backend.generateAccessUrl(fileKey);
      console.log('S3 backend URL generation successful:', url);
      res.json({ url });
    } catch (error) {
      console.error('S3 backend error, using fallback URL:', error);
      const baseUrl =
        process.env.S3_BASE_URL || `http://localhost:${PORT}/uploads/s3`;
      const url = `${baseUrl}/${fileKey}`;
      res.json({ url });
    }
  } catch (error) {
    console.error('Error getting S3 file URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GENERAL UPLOAD ENDPOINT =====
// This handles uploads when the client doesn't specify a provider-specific endpoint

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Received upload request to general endpoint');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File info:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    const { key, provider = 'filesystem' } = req.body;

    if (!key) {
      console.log('No key provided in request');
      return res.status(400).json({ error: 'File key is required' });
    }

    console.log(`Processing upload for provider: ${provider}, key: ${key}`);

    // Handle the upload based on the provider
    if (provider === 's3' && s3Backend) {
      await handleS3Upload(req.file.buffer, key, s3Config);
      console.log('S3 upload completed successfully');
    } else {
      // Default to filesystem if S3 is not configured or provider is filesystem
      await handleFilesystemUpload(req.file.buffer, key, filesystemConfig);
      console.log('Filesystem upload completed successfully');

      // Verify the file was saved
      const filePath = join(uploadDir, key);
      if (fs.existsSync(filePath)) {
        console.log(`File saved to ${filePath}`);
        console.log(`File size: ${fs.statSync(filePath).size} bytes`);
      } else {
        console.error(`File not found at expected path: ${filePath}`);
      }
    }

    res.json({ success: true, key });
  } catch (error) {
    console.error('Error in general upload endpoint:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ===== LIST FILES ENDPOINTS =====

// List all files from both providers
app.get('/api/files', async (req, res) => {
  try {
    console.log('Listing all files from both providers');
    const { prefix } = req.query;
    const filesystemFiles = [];
    const s3Files = [];

    // Get filesystem files
    try {
      console.log('Using direct filesystem listing');
      const directory = prefix ? join(uploadDir, prefix) : uploadDir;

      if (fs.existsSync(directory)) {
        const files = fs
          .readdirSync(directory)
          .filter((file) => {
            try {
              return fs.statSync(join(directory, file)).isFile();
            } catch (e) {
              console.error(`Error checking file ${file}:`, e);
              return false;
            }
          })
          .map((file) => {
            const filePath = join(directory, file);
            const stats = fs.statSync(filePath);
            const relativePath = prefix ? `${prefix}/${file}` : file;

            // Determine file type from extension
            const ext = file.substring(file.lastIndexOf('.')).toLowerCase();
            const mimeTypes = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.pdf': 'application/pdf',
              '.doc': 'application/msword',
              '.docx':
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              '.txt': 'text/plain',
            };

            const serverUrl = `http://localhost:${PORT}`;
            const fileUrl = `${serverUrl}${publicPath}/${relativePath}`;

            return {
              name: file,
              size: stats.size,
              type: mimeTypes[ext] || 'application/octet-stream',
              key: relativePath,
              url: fileUrl,
              lastModified: stats.mtime,
              provider: 'filesystem',
            };
          });

        filesystemFiles.push(...files);
        console.log(
          `Found ${files.length} filesystem files using direct listing`
        );
        console.log('Files:', files.map((f) => f.name).join(', '));
      } else {
        console.log(`Directory ${directory} does not exist`);
      }
    } catch (fallbackError) {
      console.error('Error in filesystem listing:', fallbackError);
    }

    // Combine and return all files
    const allFiles = [...filesystemFiles, ...s3Files];

    console.log(`Returning ${allFiles.length} total files`);
    res.json(allFiles);
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Files will be uploaded to ${uploadDir}`);
  console.log(
    `Files will be accessible at http://localhost:${PORT}${publicPath}`
  );
  console.log(
    `S3 integration ${process.env.S3_BUCKET ? 'enabled' : 'disabled'}`
  );
});
