/**
 * Audio Core Module Exports
 *
 * Core audio processing functionality including context management,
 * FFT processing, beat detection, and the main analyzer class.
 */

// Audio Context Management
export {
  createAudioContext,
  resumeAudioContext,
  getAudioContext,
  getAudioContextSync,
  isAudioContextSupported,
  isAudioContextReady,
  getAudioContextState,
  closeAudioContext,
  onAudioContextStateChange,
  resumeOnUserInteraction,
  ensureAudioContext,
} from './audioContext';

// FFT Processing
export {
  calculateBandEnergy,
  normalizeFFTData,
  calculateSpectralCentroid,
  calculateSpectralFlux,
  calculateOverallEnergy,
  getDominantFrequency,
  smoothFFTData,
} from './fft';

// Beat Detection
export { BeatDetector } from './beatDetection';

// Main Analyzer
export { AudioAnalyzer } from './analyzer';
