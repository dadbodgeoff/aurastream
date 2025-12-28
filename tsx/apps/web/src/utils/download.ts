/**
 * Mobile-optimized download utility for images and assets.
 * 
 * Handles cross-browser compatibility including:
 * - iOS Safari (no download attribute support for cross-origin)
 * - macOS Safari
 * - Android Chrome
 * - Desktop browsers
 * 
 * Safari/iOS Strategy:
 * 1. Try Web Share API (allows "Save Image" on iOS)
 * 2. Try blob download with data URL
 * 3. Fallback to opening image in new tab with save instructions
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
  /** Show iOS save instructions toast */
  onShowIOSInstructions?: () => void;
}

/**
 * Detect if running on iOS (iPhone, iPad, iPod)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  // Check for iOS devices
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Check for iPad on iOS 13+ (reports as Mac)
  const isIPadOS = navigator.userAgent.includes('Mac') && 'ontouchend' in document;
  
  return isIOSDevice || isIPadOS;
}

/**
 * Detect if running on Safari (any platform)
 */
export function isSafari(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  
  const ua = navigator.userAgent;
  // Safari but not Chrome/Edge/etc
  return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium');
}

/**
 * Detect if running on Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

/**
 * Detect if running on mobile
 */
export function isMobile(): boolean {
  return isIOS() || isAndroid();
}

/**
 * Check if Web Share API with files is supported
 */
function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.share) return false;
  if (!navigator.canShare) return false;
  return true;
}

/**
 * Download via Web Share API - best for iOS as it allows "Save Image"
 */
async function downloadViaShare(options: DownloadOptions): Promise<boolean> {
  const { url, filename, mimeType = 'image/png', onSuccess } = options;
  
  if (!canShareFiles()) return false;
  
  try {
    // Fetch the image as blob
    const response = await fetch(url, { 
      mode: 'cors', 
      credentials: 'omit',
      cache: 'force-cache',
    });
    
    if (!response.ok) return false;
    
    const blob = await response.blob();
    const file = new File([blob], filename, { type: mimeType });
    
    // Check if we can share this file type
    if (!navigator.canShare({ files: [file] })) return false;
    
    await navigator.share({
      files: [file],
      title: filename,
    });
    
    onSuccess?.();
    return true;
  } catch (error) {
    // User cancelled or share failed
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled - still consider it handled
      return true;
    }
    return false;
  }
}

/**
 * Download via blob + data URL (works better on Safari than object URL)
 */
async function downloadViaDataUrl(options: DownloadOptions): Promise<boolean> {
  const { url, filename, onSuccess, onError } = options;
  
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Convert to data URL for Safari compatibility
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
        
        onSuccess?.();
        resolve(true);
      };
      
      reader.onerror = () => {
        resolve(false);
      };
      
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Download via blob + object URL (standard approach)
 */
async function downloadViaBlob(options: DownloadOptions): Promise<boolean> {
  const { url, filename, onSuccess, onError } = options;
  
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
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
    return true;
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Open image in new tab for manual save (iOS fallback)
 * On iOS, user can long-press to save to Photos
 */
function openForManualSave(options: DownloadOptions): void {
  const { url, onSuccess, onShowIOSInstructions } = options;
  
  // Open in new tab
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
  
  // Show instructions if callback provided
  if (newWindow && onShowIOSInstructions) {
    onShowIOSInstructions();
  }
  
  onSuccess?.();
}

/**
 * Main download function - automatically selects best method for the platform
 * 
 * Strategy by platform:
 * - iOS: Share API → Data URL → Open in new tab with instructions
 * - Safari (macOS): Data URL → Blob → Open in new tab
 * - Android: Share API → Blob
 * - Other: Blob → Direct link
 */
export async function downloadAsset(options: DownloadOptions): Promise<void> {
  const { onShowIOSInstructions } = options;
  
  // iOS: Best experience is via Share API (allows "Save Image")
  if (isIOS()) {
    // Try Share API first - this gives the best UX on iOS
    const shared = await downloadViaShare(options);
    if (shared) return;
    
    // Try data URL approach (sometimes works on iOS Safari)
    const dataUrlWorked = await downloadViaDataUrl(options);
    if (dataUrlWorked) return;
    
    // Fallback: open in new tab with instructions
    openForManualSave({
      ...options,
      onShowIOSInstructions: onShowIOSInstructions || (() => {
        // Default: show alert with instructions
        setTimeout(() => {
          alert('To save: Long-press the image and tap "Add to Photos"');
        }, 500);
      }),
    });
    return;
  }
  
  // Safari on macOS: Data URL works better than blob URL
  if (isSafari()) {
    const dataUrlWorked = await downloadViaDataUrl(options);
    if (dataUrlWorked) return;
    
    const blobWorked = await downloadViaBlob(options);
    if (blobWorked) return;
    
    // Fallback
    openForManualSave(options);
    return;
  }
  
  // Android: Try Share API first (allows saving to gallery)
  if (isAndroid()) {
    const shared = await downloadViaShare(options);
    if (shared) return;
    
    const blobWorked = await downloadViaBlob(options);
    if (blobWorked) return;
    
    openForManualSave(options);
    return;
  }
  
  // Desktop Chrome/Firefox/Edge: Standard blob approach
  const blobWorked = await downloadViaBlob(options);
  if (blobWorked) return;
  
  // Last resort
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

/**
 * Copy image to clipboard (for sharing)
 * Works on most modern browsers including Safari
 */
export async function copyImageToClipboard(url: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const blob = await response.blob();
    
    // Safari requires specific MIME type
    const pngBlob = blob.type === 'image/png' 
      ? blob 
      : await convertToPng(blob);
    
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ]);
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert blob to PNG (for clipboard compatibility)
 */
async function convertToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          reject(new Error('Could not convert to PNG'));
        }
      }, 'image/png');
    };
    
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = URL.createObjectURL(blob);
  });
}
