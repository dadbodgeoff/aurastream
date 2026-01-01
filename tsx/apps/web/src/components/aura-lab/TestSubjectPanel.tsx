'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Lock, Unlock, RefreshCw, Check, AlertCircle } from 'lucide-react';

import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from './constants';

interface TestSubjectPanelProps {
  /** Subject ID from the API (used for fusion requests) */
  subjectId: string | null;
  /** URL to display the subject image */
  subjectImageUrl: string | null;
  /** Whether the subject is locked for fusion */
  isLocked: boolean;
  /** Callback when a file is uploaded */
  onUpload: (file: File) => void;
  /** Callback to lock the current subject */
  onLock: () => void;
  /** Callback to unlock and allow changing the subject */
  onUnlock: () => void;
  /** Whether an upload is in progress */
  isUploading?: boolean;
}

/**
 * TestSubjectPanel - Left panel for uploading and locking test subjects.
 * 
 * Features:
 * - Drag & drop upload zone
 * - Image preview
 * - Lock/unlock functionality
 * - Visual states: empty, uploading, preview, locked
 */
export function TestSubjectPanel({
  subjectId: _subjectId, // Kept for API consistency, used by parent for fusion requests
  subjectImageUrl,
  isLocked,
  onUpload,
  onLock,
  onUnlock,
  isUploading = false,
}: TestSubjectPanelProps) {
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        // Could add toast notification here
        console.error('File too large. Max size is 15MB.');
        return;
      }

      onUpload(file);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: isLocked || isUploading,
  });

  const hasError = fileRejections.length > 0;
  const hasSubject = Boolean(subjectImageUrl);

  return (
    <div
      className={`
        relative flex flex-col h-full rounded-2xl overflow-hidden
        bg-background-surface/80 backdrop-blur-sm border-2 transition-all duration-300
        ${isLocked 
          ? 'border-green-500/50 shadow-lg shadow-green-500/20' 
          : 'border-border-default/50'
        }
      `}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`
            w-2 h-2 rounded-full transition-colors
            ${isLocked ? 'bg-green-500 animate-pulse' : hasSubject ? 'bg-yellow-500' : 'bg-text-disabled'}
          `} />
          <h3 className="text-sm font-semibold text-text-primary">Test Subject</h3>
        </div>
        {isLocked && (
          <span className="text-xs text-green-400 font-medium flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Locked
          </span>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 flex flex-col">
        <AnimatePresence mode="wait">
          {/* Empty State - Upload Dropzone */}
          {!hasSubject && !isUploading && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col"
            >
              <div
                {...getRootProps()}
                className={`
                  flex-1 flex flex-col items-center justify-center
                  rounded-xl border-2 border-dashed cursor-pointer
                  transition-all duration-200
                  ${isDragActive
                    ? 'border-interactive-500 bg-interactive-500/10 scale-[1.02]'
                    : hasError
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-border-default hover:border-border-strong hover:bg-background-elevated/50'
                  }
                `}
              >
                <input {...getInputProps()} />

                <div className={`
                  p-4 rounded-full mb-4 transition-colors
                  ${isDragActive ? 'bg-interactive-500/20' : 'bg-background-elevated'}
                `}>
                  {hasError ? (
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  ) : (
                    <Upload className={`w-8 h-8 ${isDragActive ? 'text-interactive-400' : 'text-text-secondary'}`} />
                  )}
                </div>

                <p className={`text-sm font-medium mb-1 ${
                  isDragActive ? 'text-interactive-300' : hasError ? 'text-red-400' : 'text-text-secondary'
                }`}>
                  {isDragActive
                    ? 'Drop your subject here'
                    : hasError
                    ? 'Invalid file'
                    : 'Upload your PFP or logo'
                  }
                </p>
                <p className="text-xs text-text-tertiary mb-3">
                  {hasError
                    ? 'JPEG, PNG, WebP only. Max 15MB.'
                    : 'Drag & drop or click to browse'
                  }
                </p>

                {/* File type hints */}
                <div className="flex gap-1.5">
                  {['PNG', 'JPG', 'WebP'].map((type) => (
                    <span
                      key={type}
                      className="px-2 py-0.5 text-micro font-mono text-text-tertiary bg-background-elevated/80 rounded"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Uploading State */}
          {isUploading && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              <div className="relative w-20 h-20 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-border-default" />
                <div className="absolute inset-0 rounded-full border-4 border-interactive-500 border-t-transparent animate-spin" />
                <div className="absolute inset-2 rounded-full bg-background-elevated flex items-center justify-center">
                  <Upload className="w-6 h-6 text-interactive-400" />
                </div>
              </div>
              <p className="text-sm text-text-secondary font-medium">Uploading...</p>
              <p className="text-xs text-text-tertiary mt-1">Preparing test subject</p>
            </motion.div>
          )}

          {/* Preview State (not locked) */}
          {hasSubject && !isLocked && !isUploading && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col"
            >
              {/* Image Preview */}
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="relative">
                  <img
                    src={subjectImageUrl!}
                    alt="Test subject preview"
                    className="max-w-full max-h-48 rounded-lg object-contain shadow-lg"
                  />
                  {/* Glow effect */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-interactive-500/20 to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 mt-4">
                <button
                  onClick={onLock}
                  className="
                    w-full py-3 px-4 rounded-lg font-semibold text-sm
                    bg-green-600 hover:bg-green-500
                    text-white shadow-lg shadow-green-500/25
                    transition-all duration-200 hover:scale-[1.02]
                    flex items-center justify-center gap-2
                  "
                >
                  <Lock className="w-4 h-4" />
                  Lock In Subject
                </button>

                <button
                  {...getRootProps()}
                  className="
                    w-full py-2 px-4 rounded-lg text-sm
                    bg-background-elevated hover:bg-border-default
                    text-text-secondary hover:text-text-secondary
                    transition-colors flex items-center justify-center gap-2
                  "
                >
                  <input {...getInputProps()} />
                  <RefreshCw className="w-3.5 h-3.5" />
                  Change Image
                </button>
              </div>
            </motion.div>
          )}

          {/* Locked State */}
          {hasSubject && isLocked && (
            <motion.div
              key="locked"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col"
            >
              {/* Locked Image */}
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="relative">
                  <img
                    src={subjectImageUrl!}
                    alt="Locked test subject"
                    className="max-w-full max-h-48 rounded-lg object-contain shadow-lg ring-2 ring-green-500/50"
                  />
                  {/* Locked badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  {/* Glow effect */}
                  <div 
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    style={{ boxShadow: '0 0 40px rgba(34, 197, 94, 0.2)' }}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="text-center mb-4">
                <p className="text-sm text-green-400 font-medium">Subject Locked</p>
                <p className="text-xs text-text-tertiary mt-1">Ready for fusion experiments</p>
              </div>

              {/* Unlock button */}
              <button
                onClick={onUnlock}
                className="
                  w-full py-2 px-4 rounded-lg text-sm
                  bg-background-elevated hover:bg-border-default border border-border-default
                  text-text-secondary hover:text-text-secondary
                  transition-colors flex items-center justify-center gap-2
                "
              >
                <Unlock className="w-3.5 h-3.5" />
                Change Subject
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Animated border glow when locked */}
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 30px rgba(34, 197, 94, 0.1)',
          }}
        />
      )}
    </div>
  );
}

export default TestSubjectPanel;
