/**
 * Mobile-optimized download utility for images and assets.
 * 
 * Handles cross-browser compatibility including:
 * - iOS Safari (no download attribute support for cross-origin)
 * - Android Chrome
 * - Desktop browsers
 */

export interface DownloadOptions {
  /** URL of the file to download */
  url: string;
  /** Suggested filename for the download */
  filename: string;
  /** MIME type of the file (default: image/png) */
  mimeType?: string;
  /** Callback on successful download */
  onSuccess?: () => void;
  /** Callback on download error */
  onError?: (error: Error) => void;
}

/**
 * Detect if running on iOS
 */
function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if running on Android
 */
function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

/**
 * Detect if running on mobile
 */
export function isMobile(): boolean {
  return isIOS() || isAndroid();
}

/**
 * Check if the browser supports the download attribute
 */
function supportsDownloadAttribute(): boolean {
  if (typeof document === 'undefined') return false;
  const a = document.createElement('a');
  return 'download' in a;
}

/**
 * Download file using fetch + blob approach (works for cross-origin on most browsers)
 */
async function downloadViaBlob(options: DownloadOptions): Promise<void> {
  const { url, filename, mimeType = 'image/png', onSuccess, onError } = options;
  
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 100);
    
    onSuccess?.();
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Download file using direct link (fallback for same-origin or when blob fails)
 */
function downloadViaLink(options: DownloadOptions): void {
  const { url, filename, onSuccess } = options;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
  
  onSuccess?.();
}

/**
 * Open image in new tab with long-press save instructions (iOS fallback)
 */
function openForManualSave(options: DownloadOptions): void {
  const { url, onSuccess } = options;
  
  // Open in new tab - user can long-press to save on iOS
  window.open(url, '_blank', 'noopener,noreferrer');
  onSuccess?.();
}

/**
 * Share API download (for mobile devices that support it)
 */
async function downloadViaShare(options: DownloadOptions): Promise<boolean> {
  const { url, filename, mimeType = 'image/png' } = options;
  
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const blob = await response.blob();
    const file = new File([blob], filename, { type: mimeType });
    
    if (!navigator.canShare({ files: [file] })) {
      return false;
    }
    
    await navigator.share({
      files: [file],
      title: filename,
    });
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Main download function - automatically selects best method for the platform
 */
export async function downloadAsset(options: DownloadOptions): Promise<void> {
  const { url, filename, onSuccess, onError } = options;
  
  // Try Web Share API first on mobile (allows saving to photos)
  if (isMobile()) {
    const shared = await downloadViaShare(options);
    if (shared) {
      onSuccess?.();
      return;
    }
  }
  
  // iOS Safari doesn't support download attribute for cross-origin
  // Try blob approach first
  if (isIOS()) {
    try {
      await downloadViaBlob(options);
      return;
    } catch {
      // Fallback: open in new tab for manual save
      openForManualSave(options);
      return;
    }
  }
  
  // Android and desktop: try blob first, fallback to direct link
  if (supportsDownloadAttribute()) {
    try {
      await downloadViaBlob(options);
      return;
    } catch {
      // Fallback to direct link
      downloadViaLink(options);
      return;
    }
  }
  
  // Last resort: open in new tab
  openForManualSave(options);
}

/**
 * Download multiple assets (with progress callback)
 */
export async function downloadMultipleAssets(
  assets: Array<{ url: string; filename: string }>,
  onProgress?: (completed: number, total: number) => void,
  onError?: (error: Error, asset: { url: string; filename: string }) => void
): Promise<void> {
  const total = assets.length;
  let completed = 0;
  
  for (const asset of assets) {
    try {
      await downloadAsset({
        url: asset.url,
        filename: asset.filename,
        onSuccess: () => {
          completed++;
          onProgress?.(completed, total);
        },
      });
      
      // Small delay between downloads to prevent overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)), asset);
    }
  }
}

/**
 * Get appropriate filename for an asset
 */
export function getAssetFilename(assetType: string, assetId: string, format = 'png'): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `aurastream-${assetType}-${assetId.slice(0, 8)}-${timestamp}.${format}`;
}
