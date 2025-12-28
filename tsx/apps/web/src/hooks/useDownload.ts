/**
 * useDownload - Hook for downloading assets with platform-aware UX
 * 
 * Provides:
 * - Automatic platform detection
 * - iOS-specific save instructions
 * - Toast notifications for feedback
 * - Loading states
 */

import { useState, useCallback } from 'react';
import { 
  downloadAsset, 
  getAssetFilename, 
  isIOS, 
  isSafari,
  copyImageToClipboard,
} from '@/utils/download';

export interface UseDownloadOptions {
  /** Show toast notification */
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export interface DownloadState {
  isDownloading: boolean;
  error: Error | null;
}

export function useDownload(options: UseDownloadOptions = {}) {
  const { showToast } = options;
  const [state, setState] = useState<DownloadState>({
    isDownloading: false,
    error: null,
  });

  /**
   * Download a single asset
   */
  const download = useCallback(async (
    url: string,
    filename?: string,
    assetType?: string,
    assetId?: string
  ) => {
    setState({ isDownloading: true, error: null });

    const finalFilename = filename || (assetType && assetId 
      ? getAssetFilename(assetType, assetId)
      : `aurastream-asset-${Date.now()}.png`
    );

    try {
      await downloadAsset({
        url,
        filename: finalFilename,
        onSuccess: () => {
          setState({ isDownloading: false, error: null });
          
          // Show appropriate success message
          if (isIOS()) {
            // On iOS, the share sheet handles feedback
          } else {
            showToast?.('Download started', 'success');
          }
        },
        onError: (error) => {
          setState({ isDownloading: false, error });
          showToast?.('Download failed. Please try again.', 'error');
        },
        onShowIOSInstructions: () => {
          // Show iOS-specific instructions
          showToast?.(
            'Long-press the image and tap "Add to Photos" to save',
            'info'
          );
        },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState({ isDownloading: false, error: err });
      showToast?.('Download failed. Please try again.', 'error');
    }
  }, [showToast]);

  /**
   * Copy image to clipboard
   */
  const copyImage = useCallback(async (url: string) => {
    try {
      const success = await copyImageToClipboard(url);
      if (success) {
        showToast?.('Image copied to clipboard', 'success');
      } else {
        showToast?.('Could not copy image', 'error');
      }
      return success;
    } catch {
      showToast?.('Could not copy image', 'error');
      return false;
    }
  }, [showToast]);

  /**
   * Share image via native share sheet
   */
  const shareImage = useCallback(async (
    url: string,
    title?: string
  ) => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      showToast?.('Sharing not supported on this device', 'error');
      return false;
    }

    try {
      // Try sharing with file first (better UX)
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      const blob = await response.blob();
      const file = new File([blob], title || 'image.png', { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title || 'AuraStream Asset',
        });
        return true;
      }

      // Fallback to URL sharing
      await navigator.share({
        title: title || 'AuraStream Asset',
        url,
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled - not an error
        return true;
      }
      showToast?.('Could not share image', 'error');
      return false;
    }
  }, [showToast]);

  return {
    ...state,
    download,
    copyImage,
    shareImage,
    isIOS: isIOS(),
    isSafari: isSafari(),
  };
}
