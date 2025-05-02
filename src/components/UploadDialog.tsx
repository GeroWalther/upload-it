import React from "react";

export interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  progress: number;
  isComplete: boolean;
  hasErrors: boolean;
  title?: string;
}

// CSS styles as a JavaScript object
const styles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  dialog: {
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    width: "100%",
    maxWidth: "400px",
    overflow: "hidden",
  },
  header: {
    padding: "16px",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
  },
  content: {
    padding: "24px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginBottom: "16px",
  },
  cloudIcon: {
    color: "#3498db",
  },
  successIcon: {
    color: "#2ecc71",
  },
  errorIcon: {
    color: "#e74c3c",
  },
  progressLabel: {
    marginBottom: "8px",
    fontSize: "14px",
  },
  progressContainer: {
    width: "100%",
    height: "8px",
    backgroundColor: "#eee",
    borderRadius: "4px",
    overflow: "hidden",
  },
  progressBar: (progress: number) => ({
    height: "100%",
    backgroundColor: "#3498db",
    borderRadius: "4px",
    transition: "width 0.3s ease",
    width: `${progress}%`,
  }),
  status: {
    fontSize: "16px",
    fontWeight: 500,
    color: "#333",
  },
};

/**
 * A simple dialog component to show upload progress
 */
export function UploadDialog({
  isOpen,
  onClose,
  progress,
  isComplete,
  hasErrors,
  title = "Upload File",
}: UploadDialogProps) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} className="upload-it-dialog-overlay">
      <div style={styles.dialog} className="upload-it-dialog">
        <div style={styles.header} className="upload-it-dialog-header">
          <h3 style={styles.title} className="upload-it-dialog-title">
            {title}
          </h3>
          <button
            type="button"
            style={styles.closeButton}
            className="upload-it-dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={styles.content} className="upload-it-dialog-content">
          <div style={styles.icon} className="upload-it-dialog-icon">
            {isComplete ? (
              hasErrors ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="40"
                  height="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.errorIcon}
                  className="upload-it-icon-error"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="40"
                  height="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.successIcon}
                  className="upload-it-icon-success"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="40"
                height="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={styles.cloudIcon}
                className="upload-it-icon-cloud"
              >
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              </svg>
            )}
          </div>

          {!isComplete ? (
            <>
              <div
                style={styles.progressLabel}
                className="upload-it-progress-label"
              >
                Uploading... {progress}%
              </div>
              <div
                style={styles.progressContainer}
                className="upload-it-progress-container"
              >
                <div
                  style={styles.progressBar(progress)}
                  className="upload-it-progress-bar"
                />
              </div>
            </>
          ) : (
            <div style={styles.status} className="upload-it-status">
              {hasErrors ? "Upload completed with errors" : "Upload complete!"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
