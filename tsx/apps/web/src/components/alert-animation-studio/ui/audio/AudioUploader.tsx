'use client';

/**
 * Audio Uploader Component
 *
 * Drag-and-drop or file picker for audio files.
 * Shows loaded file info and supports removal.
 *
 * @module ui/audio/AudioUploader
 */

import { useCallback, useRef, useState, memo } from 'react';
import { Upload, Music, X, FileAudio, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface AudioFileInfo {
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** Audio duration in seconds */
  duration: number;
  /** MIME type */
  type: string;
  /** Object URL for playback */
  url: string;
}

export interface AudioUploaderProps {
  /** Callback when audio file is loaded */
  onAudioLoad: (file: File, info: AudioFileInfo) => void;
  /** Currently loaded audio info */
  currentAudio: AudioFileInfo | null;
  /** Callback when audio is removed */
  onRemove: () => void;
  /** Accepted file types */
  acceptedTypes?: string[];
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ACCEPTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/webm'];
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB

// ============================================================================
// Component
// ============================================================================

/**
 * Audio file uploader with drag-and-drop support.
 */
export const AudioUploader = memo(function AudioUploader({
  onAudioLoad,
  currentAudio,
  onRemove,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSize = DEFAULT_MAX_SIZE,
  className,
}: AudioUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Validate file
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.some((type) => file.type === type || file.type.startsWith(type.split('/')[0]))) {
        return 'Invalid file type. Please upload an audio file.';
      }
      if (file.size > maxSize) {
        return `File too large. Maximum size is ${formatFileSize(maxSize)}.`;
      }
      return null;
    },
    [acceptedTypes, maxSize]
  );

  // Process audio file
  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setIsLoading(false);
        return;
      }

      try {
        // Create object URL
        const url = URL.createObjectURL(file);

        // Get audio duration
        const duration = await getAudioDuration(url);

        const info: AudioFileInfo = {
          name: file.name,
          size: file.size,
          duration,
          type: file.type,
          url,
        };

        onAudioLoad(file, info);
      } catch (err) {
        setError('Failed to load audio file. Please try another file.');
        console.error('Audio load error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [validateFile, onAudioLoad]
  );

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [processFile]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  // Handle click to open file picker
  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Handle remove
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (currentAudio?.url) {
        URL.revokeObjectURL(currentAudio.url);
      }
      onRemove();
    },
    [currentAudio, onRemove]
  );

  return (
    <div className={cn('relative', className)}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload audio file"
      />

      {currentAudio ? (
        /* Loaded Audio Display */
        <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
            <FileAudio className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 truncate">{currentAudio.name}</p>
            <p className="text-xs text-gray-500">
              {formatDuration(currentAudio.duration)} • {formatFileSize(currentAudio.size)}
            </p>
          </div>
          <button
            onClick={handleRemove}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
            aria-label="Remove audio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Upload Dropzone */
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            isDragging
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-gray-700 hover:border-gray-600 bg-gray-800/30 hover:bg-gray-800/50',
            isLoading && 'pointer-events-none opacity-50'
          )}
          role="button"
          tabIndex={0}
          aria-label="Upload audio file"
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
          {isLoading ? (
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-700/50 rounded-full flex items-center justify-center">
                {isDragging ? (
                  <Music className="w-6 h-6 text-purple-400" />
                ) : (
                  <Upload className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-300">
                  {isDragging ? 'Drop audio file here' : 'Drag & drop audio file'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  or click to browse • MP3, WAV, OGG
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Utility Functions
// ============================================================================

async function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      reject(new Error('Failed to load audio metadata'));
    });
    audio.src = url;
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default AudioUploader;
