/**
 * Clipboard Export Module
 * 
 * Provides clipboard functionality for copying exported images.
 * Includes browser support detection and fallback mechanisms.
 */

// ============================================================================
// Browser Support Detection
// ============================================================================

/**
 * Check if the Clipboard API is supported for writing images
 * 
 * @returns Whether clipboard image writing is supported
 */
export function isClipboardSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard !== 'undefined' &&
    typeof navigator.clipboard.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  );
}

/**
 * Check if the legacy clipboard API is available (for text fallback)
 * 
 * @returns Whether legacy clipboard is available
 */
export function isLegacyClipboardSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.execCommand === 'function'
  );
}

// ============================================================================
// Clipboard Operations
// ============================================================================

/**
 * Copy an image blob to the clipboard
 * Uses the modern Clipboard API with ClipboardItem
 * 
 * @param blob - Image blob to copy
 * @returns Promise that resolves when copy is complete
 * @throws Error if clipboard is not supported or copy fails
 */
export async function copyToClipboard(blob: Blob): Promise<void> {
  if (!isClipboardSupported()) {
    throw new Error('Clipboard API is not supported in this browser');
  }

  try {
    // Create a ClipboardItem with the image blob
    // Note: Most browsers only support PNG for clipboard images
    const clipboardItem = new ClipboardItem({
      [blob.type]: blob,
    });

    await navigator.clipboard.write([clipboardItem]);
  } catch (error) {
    // If the blob type isn't supported, try converting to PNG
    if (blob.type !== 'image/png') {
      const pngBlob = await convertToPng(blob);
      const clipboardItem = new ClipboardItem({
        'image/png': pngBlob,
      });
      await navigator.clipboard.write([clipboardItem]);
    } else {
      throw error;
    }
  }
}

/**
 * Copy an image from a data URL to the clipboard
 * Converts the data URL to a blob first
 * 
 * @param dataUrl - Base64 data URL of the image
 * @returns Promise that resolves when copy is complete
 */
export async function copyDataUrlToClipboard(dataUrl: string): Promise<void> {
  const blob = await dataUrlToBlob(dataUrl);
  return copyToClipboard(blob);
}

/**
 * Copy image to clipboard with fallback for older browsers
 * Falls back to copying the data URL as text if image copy fails
 * 
 * @param blob - Image blob to copy
 * @param dataUrl - Data URL fallback
 * @returns Promise resolving to success status and method used
 */
export async function copyToClipboardWithFallback(
  blob: Blob,
  dataUrl: string
): Promise<{ success: boolean; method: 'image' | 'text' | 'none' }> {
  // Try modern clipboard API first
  if (isClipboardSupported()) {
    try {
      await copyToClipboard(blob);
      return { success: true, method: 'image' };
    } catch {
      // Fall through to text fallback
    }
  }

  // Try copying data URL as text
  if (isLegacyClipboardSupported()) {
    try {
      await copyTextToClipboard(dataUrl);
      return { success: true, method: 'text' };
    } catch {
      // Fall through to failure
    }
  }

  return { success: false, method: 'none' };
}

/**
 * Copy text to clipboard using the modern API or fallback
 * 
 * @param text - Text to copy
 * @returns Promise that resolves when copy is complete
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  // Try modern API first
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback to execCommand
  if (isLegacyClipboardSupported()) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textArea);
    }
    return;
  }

  throw new Error('Clipboard is not supported in this browser');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a data URL to a Blob
 * 
 * @param dataUrl - Data URL string
 * @returns Promise resolving to Blob
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Convert an image blob to PNG format
 * Required because most browsers only support PNG for clipboard
 * 
 * @param blob - Source image blob
 * @returns Promise resolving to PNG blob
 */
async function convertToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (pngBlob) => {
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error('Failed to convert to PNG'));
          }
        },
        'image/png',
        1.0
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for conversion'));
    };

    img.src = url;
  });
}

// ============================================================================
// Clipboard Status Types
// ============================================================================

/**
 * Result of a clipboard operation
 */
export interface ClipboardResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Method used for the copy operation */
  method: 'image' | 'text' | 'none';
  /** Error message if operation failed */
  error?: string;
}

/**
 * Clipboard support status
 */
export interface ClipboardSupport {
  /** Whether modern Clipboard API is supported */
  modern: boolean;
  /** Whether legacy execCommand is supported */
  legacy: boolean;
  /** Whether any clipboard method is available */
  any: boolean;
}

/**
 * Get clipboard support status for the current browser
 * 
 * @returns Clipboard support status object
 */
export function getClipboardSupport(): ClipboardSupport {
  const modern = isClipboardSupported();
  const legacy = isLegacyClipboardSupported();

  return {
    modern,
    legacy,
    any: modern || legacy,
  };
}
