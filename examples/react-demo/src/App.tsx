import React, { useState } from "react";
import { UploadButton, useUploader } from "upload-it";
import "./App.css";

function App() {
  const [files, setFiles] = useState<
    Array<{ name: string; url: string; key: string }>
  >([]);

  // Setup uploader with the useUploader hook
  const uploader = useUploader({
    provider: "filesystem",
    filesystem: {
      uploadDir: "./uploads",
      publicPath: "/uploads",
    },
    onSuccess: (uploadedFiles) => {
      setFiles((prev) => [...prev, ...uploadedFiles]);
    },
  });

  // Handler for manual file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploader.uploadFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="app">
      <header>
        <h1>UploadIt Demo</h1>
      </header>

      <div className="demo-section">
        <h2>UploadButton Component Demo</h2>
        <UploadButton
          provider="filesystem"
          filesystem={{
            uploadDir: "./uploads",
            publicPath: "/uploads",
          }}
          multiple={true}
          accept="image/*,.pdf"
          buttonText="Upload Files"
          onSuccess={(uploadedFiles: any) => {
            setFiles((prev) => [...prev, ...uploadedFiles]);
          }}
        />
      </div>

      <div className="demo-section">
        <h2>useUploader Hook Demo</h2>
        <div className="custom-uploader">
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={uploader.isUploading}
          />
          {uploader.isUploading && (
            <div className="progress">
              Uploading...{" "}
              {Object.values(uploader.progress)[0]?.percentage ?? 0}%
            </div>
          )}
        </div>
      </div>

      <div className="files-list">
        <h2>Uploaded Files</h2>
        {files.length === 0 ? (
          <p>No files uploaded yet.</p>
        ) : (
          <ul>
            {files.map((file) => (
              <li key={file.key}>
                {file.name} -{" "}
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
