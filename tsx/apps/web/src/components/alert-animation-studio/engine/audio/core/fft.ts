/**
 * FFT Processing Utilities
 *
 * Functions for processing FFT data from Web Audio API AnalyserNode.
 * Includes frequency band energy calculation and normalization.
 */

// ============================================================================
// FFT Data Processing
// ============================================================================

/**
 * Calculate the energy in a specific frequency range from FFT data.
 *
 * @param fftData - Float32Array of FFT frequency data (in dB)
 * @param minHz - Minimum frequency in Hz
 * @param maxHz - Maximum frequency in Hz
 * @param sampleRate - Audio sample rate (typically 44100)
 * @param fftSize - FFT size used for analysis
 * @returns Normalized energy value (0-1)
 */
export function calculateBandEnergy(
  fftData: Float32Array,
  minHz: number,
  maxHz: number,
  sampleRate: number,
  fftSize: number
): number {
  if (fftData.length === 0) {
    return 0;
  }

  // Calculate frequency resolution (Hz per bin)
  const frequencyResolution = sampleRate / fftSize;

  // Calculate bin indices for the frequency range
  const minBin = Math.floor(minHz / frequencyResolution);
  const maxBin = Math.min(
    Math.ceil(maxHz / frequencyResolution),
    fftData.length - 1
  );

  // Ensure valid range
  if (minBin >= maxBin || minBin >= fftData.length) {
    return 0;
  }

  // Sum energy in the frequency range
  let sum = 0;
  let count = 0;

  for (let i = minBin; i <= maxBin; i++) {
    // FFT data is in dB, convert to linear scale for averaging
    // dB values are typically negative (-90 to -10)
    const dbValue = fftData[i];
    // Convert dB to linear (0-1 range approximately)
    const linearValue = Math.pow(10, dbValue / 20);
    sum += linearValue;
    count++;
  }

  if (count === 0) {
    return 0;
  }

  // Return average energy, clamped to 0-1
  const average = sum / count;
  return Math.min(1, Math.max(0, average));
}


/**
 * Normalize FFT data from dB scale to 0-1 range.
 *
 * @param fftData - Float32Array of FFT frequency data (in dB)
 * @param minDb - Minimum decibels (floor)
 * @param maxDb - Maximum decibels (ceiling)
 * @returns New Float32Array with normalized values (0-1)
 */
export function normalizeFFTData(
  fftData: Float32Array,
  minDb: number,
  maxDb: number
): Float32Array {
  const normalized = new Float32Array(fftData.length);
  const range = maxDb - minDb;

  if (range <= 0) {
    return normalized;
  }

  for (let i = 0; i < fftData.length; i++) {
    // Clamp to range and normalize
    const clamped = Math.max(minDb, Math.min(maxDb, fftData[i]));
    normalized[i] = (clamped - minDb) / range;
  }

  return normalized;
}

/**
 * Calculate the spectral centroid (center of mass of the spectrum).
 *
 * The spectral centroid indicates the "brightness" of a sound.
 * Higher values indicate more high-frequency content.
 *
 * @param fftData - Float32Array of FFT frequency data
 * @param sampleRate - Audio sample rate
 * @param fftSize - FFT size used for analysis
 * @returns Spectral centroid in Hz
 */
export function calculateSpectralCentroid(
  fftData: Float32Array,
  sampleRate: number,
  fftSize: number
): number {
  if (fftData.length === 0) {
    return 0;
  }

  const frequencyResolution = sampleRate / fftSize;

  let weightedSum = 0;
  let magnitudeSum = 0;

  for (let i = 0; i < fftData.length; i++) {
    // Convert dB to linear magnitude
    const magnitude = Math.pow(10, fftData[i] / 20);
    const frequency = i * frequencyResolution;

    weightedSum += frequency * magnitude;
    magnitudeSum += magnitude;
  }

  if (magnitudeSum === 0) {
    return 0;
  }

  return weightedSum / magnitudeSum;
}

/**
 * Calculate spectral flux (rate of change in the spectrum).
 *
 * Spectral flux is useful for detecting onsets and beats.
 * Higher values indicate rapid changes in the frequency content.
 *
 * @param currentFFT - Current frame FFT data
 * @param previousFFT - Previous frame FFT data
 * @returns Spectral flux value (0-1 normalized)
 */
export function calculateSpectralFlux(
  currentFFT: Float32Array,
  previousFFT: Float32Array
): number {
  if (currentFFT.length === 0 || previousFFT.length === 0) {
    return 0;
  }

  const length = Math.min(currentFFT.length, previousFFT.length);
  let flux = 0;

  for (let i = 0; i < length; i++) {
    // Convert to linear scale
    const current = Math.pow(10, currentFFT[i] / 20);
    const previous = Math.pow(10, previousFFT[i] / 20);

    // Only count positive changes (onset detection)
    const diff = current - previous;
    if (diff > 0) {
      flux += diff;
    }
  }

  // Normalize by number of bins
  return Math.min(1, flux / length);
}

/**
 * Calculate overall energy from FFT data.
 *
 * @param fftData - Float32Array of FFT frequency data
 * @returns Normalized energy value (0-1)
 */
export function calculateOverallEnergy(fftData: Float32Array): number {
  if (fftData.length === 0) {
    return 0;
  }

  let sum = 0;

  for (let i = 0; i < fftData.length; i++) {
    // Convert dB to linear and square for energy
    const linear = Math.pow(10, fftData[i] / 20);
    sum += linear * linear;
  }

  // RMS energy, normalized
  const rms = Math.sqrt(sum / fftData.length);
  return Math.min(1, rms);
}

/**
 * Get the dominant frequency from FFT data.
 *
 * @param fftData - Float32Array of FFT frequency data
 * @param sampleRate - Audio sample rate
 * @param fftSize - FFT size used for analysis
 * @returns Dominant frequency in Hz
 */
export function getDominantFrequency(
  fftData: Float32Array,
  sampleRate: number,
  fftSize: number
): number {
  if (fftData.length === 0) {
    return 0;
  }

  let maxValue = -Infinity;
  let maxIndex = 0;

  for (let i = 0; i < fftData.length; i++) {
    if (fftData[i] > maxValue) {
      maxValue = fftData[i];
      maxIndex = i;
    }
  }

  const frequencyResolution = sampleRate / fftSize;
  return maxIndex * frequencyResolution;
}

/**
 * Apply smoothing between current and previous FFT data.
 *
 * @param current - Current FFT data
 * @param previous - Previous FFT data
 * @param smoothing - Smoothing factor (0-1, higher = smoother)
 * @returns Smoothed FFT data
 */
export function smoothFFTData(
  current: Float32Array,
  previous: Float32Array,
  smoothing: number
): Float32Array {
  if (previous.length === 0) {
    return current;
  }

  const result = new Float32Array(current.length);
  const length = Math.min(current.length, previous.length);

  for (let i = 0; i < length; i++) {
    result[i] = previous[i] * smoothing + current[i] * (1 - smoothing);
  }

  // Copy remaining values if current is longer
  for (let i = length; i < current.length; i++) {
    result[i] = current[i];
  }

  return result;
}
