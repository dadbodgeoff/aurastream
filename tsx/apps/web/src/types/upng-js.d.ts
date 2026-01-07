declare module 'upng-js' {
  interface UPNGImage {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: Array<{
      rect: { x: number; y: number; width: number; height: number };
      delay: number;
      dispose: number;
      blend: number;
    }>;
    tabs: Record<string, unknown>;
    data: ArrayBuffer;
  }

  /**
   * Decodes a PNG/APNG file.
   * @param buffer - The PNG file data as ArrayBuffer
   * @returns Decoded image object
   */
  export function decode(buffer: ArrayBuffer): UPNGImage;

  /**
   * Converts decoded image to RGBA8 format.
   * @param img - Decoded image from decode()
   * @returns Array of ArrayBuffers, one per frame
   */
  export function toRGBA8(img: UPNGImage): ArrayBuffer[];

  /**
   * Encodes frames to APNG.
   * @param imgs - Array of RGBA frame data (ArrayBuffer or Uint8Array)
   * @param w - Width in pixels
   * @param h - Height in pixels
   * @param cnum - Color count (0 = auto, 256 = indexed)
   * @param dels - Array of frame delays in milliseconds
   * @param loops - Number of loops (0 = infinite)
   * @returns Encoded APNG as ArrayBuffer
   */
  export function encode(
    imgs: ArrayBuffer[],
    w: number,
    h: number,
    cnum: number,
    dels: number[],
    loops?: number
  ): ArrayBuffer;

  /**
   * Encodes a single frame to PNG.
   * @param img - RGBA frame data
   * @param w - Width
   * @param h - Height
   * @param cnum - Color count
   * @returns Encoded PNG as ArrayBuffer
   */
  export function encodeLL(
    img: ArrayBuffer[],
    w: number,
    h: number,
    cnum: number
  ): ArrayBuffer;

  const UPNG: {
    decode: typeof decode;
    toRGBA8: typeof toRGBA8;
    encode: typeof encode;
    encodeLL: typeof encodeLL;
  };

  export default UPNG;
}
