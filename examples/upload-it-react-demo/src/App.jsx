import { useState } from 'react';
import { UploadButton, FileList, DropZone } from '@gw-intech/upload-it';
import './App.css';

function App() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('filesystem');
  const [error, setError] = useState(null);

  const handleUploadComplete = (files) => {
    console.log('Uploaded files:', files);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const handleUploadError = (file, error) => {
    console.error('Upload error:', error);
    setError(`Error uploading ${file.name}: ${error.message}`);
  };

  // Function to fetch files from our API
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error(`Error fetching files: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching files:', error);
      return [];
    }
  };

  return (
    <div className='app-container'>
      <div className='upload-card'>
        <h1>Upload It - File Upload Demo</h1>

        {error && <div className='error-message'>{error}</div>}

        <div className='tabs'>
          <button
            className={`tab ${activeTab === 'filesystem' ? 'active' : ''}`}
            onClick={() => setActiveTab('filesystem')}>
            Filesystem Storage
          </button>
          <button
            className={`tab ${activeTab === 's3' ? 'active' : ''}`}
            onClick={() => setActiveTab('s3')}>
            S3 Storage
          </button>
        </div>

        <div className='tab-content'>
          {activeTab === 'filesystem' && (
            <div>
              <p>Upload files to your local filesystem</p>

              {/* New DropZone Component */}
              <div className='dropzone-container'>
                <h3>Drag and Drop</h3>
                <DropZone
                  provider='filesystem'
                  server={{
                    mode: 'server',
                    endpoints: {
                      getUploadUrl: '/api/upload/filesystem/presigned',
                      completeUpload: '/api/upload/filesystem/complete',
                      getAccessUrl: '/api/upload/filesystem/url',
                      upload: '/api/upload',
                    },
                  }}
                  onSuccess={handleUploadComplete}
                  onError={handleUploadError}
                  multiple={true}
                  accept='image/*,.pdf,.docx'
                  label='Drop files here, or click to browse'
                  activeLabel='Drop files to upload to Filesystem'
                  height={200}
                />
              </div>

              <div className='upload-button-container'>
                <h3>Or use the Button</h3>
                <UploadButton
                  provider='filesystem'
                  server={{
                    mode: 'server',
                    endpoints: {
                      getUploadUrl: '/api/upload/filesystem/presigned',
                      completeUpload: '/api/upload/filesystem/complete',
                      getAccessUrl: '/api/upload/filesystem/url',
                      upload: '/api/upload',
                    },
                  }}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  onUploadStart={(file) => {
                    console.log('Upload starting:', file.name);
                    setError(null);
                  }}
                  onUploadProgress={(file, progress) => {
                    console.log(
                      `Upload progress for ${file.name}: ${progress.percentage}%`
                    );
                  }}
                  multiple={true}
                  accept='image/*,.pdf,.docx'
                  buttonText='Upload to Filesystem'
                  className='custom-upload-button'
                />
              </div>
            </div>
          )}

          {activeTab === 's3' && (
            <div>
              <p>Upload files to S3 (configure .env for AWS credentials)</p>

              {/* New DropZone Component for S3 */}
              <div className='dropzone-container'>
                <h3>Drag and Drop</h3>
                <DropZone
                  provider='s3'
                  server={{
                    mode: 'server',
                    endpoints: {
                      getUploadUrl: '/api/upload/s3/presigned',
                      completeUpload: '/api/upload/s3/complete',
                      getAccessUrl: '/api/upload/s3/url',
                      upload: '/api/upload',
                    },
                  }}
                  onSuccess={handleUploadComplete}
                  onError={handleUploadError}
                  multiple={true}
                  accept='image/*,.pdf,.docx'
                  label='Drop files here, or click to browse'
                  activeLabel='Drop files to upload to S3'
                  height={200}
                />
              </div>

              <div className='upload-button-container'>
                <h3>Or use the Button</h3>
                <UploadButton
                  provider='s3'
                  server={{
                    mode: 'server',
                    endpoints: {
                      getUploadUrl: '/api/upload/s3/presigned',
                      completeUpload: '/api/upload/s3/complete',
                      getAccessUrl: '/api/upload/s3/url',
                      upload: '/api/upload',
                    },
                  }}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  onUploadStart={(file) => {
                    console.log('Upload starting:', file.name);
                    setError(null);
                  }}
                  onUploadProgress={(file, progress) => {
                    console.log(
                      `Upload progress for ${file.name}: ${progress.percentage}%`
                    );
                  }}
                  multiple={true}
                  accept='image/*,.pdf,.docx'
                  buttonText='Upload to S3'
                  className='custom-upload-button'
                />
              </div>
            </div>
          )}
        </div>

        {/* Using our FileList component */}
        <div className='files-section'>
          <h2>Your Files</h2>
          <FileList
            fetchFiles={fetchFiles}
            initialFiles={uploadedFiles}
            showFilters={true}
            showFileIcons={true}
            onFileClick={(file) => window.open(file.url, '_blank')}
            className='custom-file-list'
          />
        </div>
      </div>
    </div>
  );
}

export default App;
