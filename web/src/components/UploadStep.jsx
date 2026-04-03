import React, { useState, useRef, useCallback } from 'react';
import { parseFile } from '../utils/parser';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  heading: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  subtext: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  dropZone: {
    border: '2px dashed #e2e8f0',
    borderRadius: '12px',
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background-color 0.15s',
    backgroundColor: '#f8fafc',
  },
  dropZoneActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  dropIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  dropLabel: {
    fontSize: '1rem',
    fontWeight: 500,
    color: '#334155',
    margin: '0 0 4px 0',
  },
  dropHint: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    margin: 0,
  },
  browseLink: {
    color: '#3b82f6',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  hiddenInput: {
    display: 'none',
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  statBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: '8px',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: '0.8125rem',
    fontWeight: 500,
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  fileName: {
    fontSize: '0.875rem',
    color: '#334155',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '400px',
  },
  fileWellCount: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginLeft: '8px',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '1.125rem',
    lineHeight: 1,
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'color 0.15s, background-color 0.15s',
  },
  clearAllBtn: {
    alignSelf: 'flex-start',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#64748b',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.15s, color 0.15s',
  },
  processing: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: '#eff6ff',
    color: '#3b82f6',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #bfdbfe',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'upload-spin 0.6s linear infinite',
  },
  errorMsg: {
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    fontSize: '0.8125rem',
    border: '1px solid #fecaca',
  },
};

// Inject spinner keyframes once
if (typeof document !== 'undefined') {
  const styleId = 'upload-step-keyframes';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `@keyframes upload-spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(styleEl);
  }
}

export default function UploadStep({ files, onFilesChange, detectedWells }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);

  const filenames = Object.keys(files);
  const fileCount = filenames.length;
  const wellCount = detectedWells.length;

  const processFiles = useCallback(async (fileList) => {
    const validFiles = Array.from(fileList).filter((f) => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ext === 'xls' || ext === 'xlsx';
    });

    if (validFiles.length === 0) {
      setErrors(['No valid .xls or .xlsx files selected.']);
      return;
    }

    setIsProcessing(true);
    setErrors([]);

    const newData = {};
    const parseErrors = [];

    const results = await Promise.allSettled(
      validFiles.map((file) =>
        parseFile(file).then((wellData) => ({ name: file.name, wellData }))
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        newData[result.value.name] = result.value.wellData;
      } else {
        parseErrors.push(result.reason?.message || 'Unknown parsing error');
      }
    }

    if (Object.keys(newData).length > 0) {
      onFilesChange({ ...files, ...newData });
    }

    if (parseErrors.length > 0) {
      setErrors(parseErrors);
    }

    setIsProcessing(false);
  }, [files, onFilesChange]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileChange = useCallback((e) => {
    if (e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  }, [processFiles]);

  const handleRemoveFile = useCallback((filename) => {
    const updated = { ...files };
    delete updated[filename];
    onFilesChange(updated);
  }, [files, onFilesChange]);

  const handleClearAll = useCallback(() => {
    onFilesChange({});
    setErrors([]);
  }, [onFilesChange]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div style={styles.container}>
      <div>
        <h2 style={styles.heading}>Upload Plate Reader Files</h2>
        <p style={styles.subtext}>
          Upload one or more .xls/.xlsx files from your plate reader. Each file represents a repeated measurement of the same plate.
        </p>
      </div>

      <div
        style={{
          ...styles.dropZone,
          ...(isDragOver ? styles.dropZoneActive : {}),
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
        aria-label="Upload plate reader files"
      >
        <div style={styles.dropIcon}>&#128196;</div>
        <p style={styles.dropLabel}>
          Drag and drop files here, or{' '}
          <span style={styles.browseLink}>browse</span>
        </p>
        <p style={styles.dropHint}>Accepts .xls and .xlsx files</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          multiple
          style={styles.hiddenInput}
          onChange={handleFileChange}
        />
      </div>

      {isProcessing && (
        <div style={styles.processing}>
          <span style={styles.spinner} />
          Processing files...
        </div>
      )}

      {errors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {errors.map((err, i) => (
            <div key={i} style={styles.errorMsg}>{err}</div>
          ))}
        </div>
      )}

      {fileCount > 0 && (
        <>
          <div style={styles.statsRow}>
            <span style={styles.statBadge}>
              {fileCount} file{fileCount !== 1 ? 's' : ''} uploaded
            </span>
            <span style={styles.statBadge}>
              {wellCount} well{wellCount !== 1 ? 's' : ''} detected
            </span>
          </div>

          <div style={styles.fileList}>
            {filenames.map((name) => {
              const wellsInFile = Object.keys(files[name] || {}).length;
              return (
                <div key={name} style={styles.fileCard}>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <span style={styles.fileName}>{name}</span>
                    <span style={styles.fileWellCount}>
                      {wellsInFile} well{wellsInFile !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    style={styles.removeBtn}
                    onClick={() => handleRemoveFile(name)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#94a3b8';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title={`Remove ${name}`}
                    aria-label={`Remove ${name}`}
                  >
                    &#x2715;
                  </button>
                </div>
              );
            })}
          </div>

          <button
            style={styles.clearAllBtn}
            onClick={handleClearAll}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            Clear All
          </button>
        </>
      )}
    </div>
  );
}
