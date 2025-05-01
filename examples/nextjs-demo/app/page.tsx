"use client";

import React, { useState } from "react";
import { UploadButton } from "upload-it";

export default function Home() {
  const [files, setFiles] = useState<
    Array<{ name: string; url: string; key: string }>
  >([]);

  return (
    <main>
      <h1>UploadIt Next.js Demo</h1>

      <div className="card">
        <h2>Server-side S3 Upload</h2>
        <p>
          This demo uses server-side credential handling for secure S3 uploads.
        </p>

        <div style={{ marginTop: "1.5rem" }}>
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
            multiple={true}
            accept="image/*,.pdf"
            buttonText="Upload Files"
            className="button"
            onSuccess={(uploadedFiles) => {
              setFiles((prev) => [...prev, ...uploadedFiles]);
            }}
          />
        </div>
      </div>

      <div className="files-list">
        <h2>Uploaded Files</h2>
        {files.length === 0 ? (
          <p>No files have been uploaded yet. Try uploading some!</p>
        ) : (
          <div>
            {files.map((file) => (
              <div key={file.key} className="file-item">
                <span>{file.name}</span>
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  View File
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
