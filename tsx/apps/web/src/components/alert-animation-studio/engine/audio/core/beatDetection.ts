/**
 * Beat Detection Engine
 *
 * Energy flux-based beat detection with beat classification
 * and BPM estimation.
 */

import type { BeatInfo, BeatType } from '../types';
import { createBeatInfo } from '../types';
import { calculateBandEnergy } from './fft';

// ============================================================================
// Constants
// ============================================================================

/** Minimum time between beats in ms (prevents double detection) */
const MIN_BEAT_INTERVAL = 100;

/** Maximum beats to keep in history for BPM calculation */
const MAX_BEAT_HISTORY = 32;

/** Number of energy samples to keep for threshold calculation */
const ENERGY_HISTORY_SIZE = 43; // ~1 second at 60fps

/** Frequency ranges for beat classification */
const KICK_RANGE = { min: 20, max: 150 };
const SNARE_RANGE = { min: 150, max: 1000 };
const HIHAT_RANGE = { min: 4000, max: 16000 };

// ============================================================================
// Beat Detector Class
// ============================================================================

/**
 * Beat detector using energy flux analysis.
 *
 * Detects beats by analyzing sudden increases in audio energy
 * and classifies them based on frequency content.
 */
export class BeatDetector {
  private sampleRate: number;
  private fftSize: number;
  private sensitivity: number;

  // Energy history for adaptive threshold
  private energyHistory: number[] = [];
  private kickHistory: number[] = [];
  private snareHistory: number[] = [];
  private hihatHistory: number[] = [];

  // Beat history for BPM calculation
  private beatHistory: BeatInfo[] = [];
  private lastBeatTime: number = 0;

  // Previous frame data
  private previousEnergy: number = 0;
  private previousKickEnergy: number = 0;
  private previousSnareEnergy: number = 0;
  private previousHihatEnergy: number = 0;

  // Estimated BPM
  private estimatedBpm: number = 0;

  /**
   * Create a new beat detector.
   *
   * @param sampleRate - Audio sample rate (typically 44100)
   * @param fftSize - FFT size used for analysis
   * @param sensitivity - Detection sensitivity (0-1, default 0.7)
   */
  constructor(
    sampleRate: number,
    fftSize: number,
    sensitivity: number = 0.7
  ) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.sensitivity = Math.max(0.1, Math.min(1, sensitivity));
  }


  /**
   * Detect a beat from FFT data.
   *
   * @param fftData - Float32Array of FFT frequency data
   * @returns BeatInfo if beat detected, null otherwise
   */
  detect(fftData: Float32Array): BeatInfo | null {
    const currentTime = performance.now();

    // Enforce minimum beat interval
    if (currentTime - this.lastBeatTime < MIN_BEAT_INTERVAL) {
      this.updateHistory(fftData);
      return null;
    }

    // Calculate energy in different frequency bands
    const kickEnergy = calculateBandEnergy(
      fftData,
      KICK_RANGE.min,
      KICK_RANGE.max,
      this.sampleRate,
      this.fftSize
    );

    const snareEnergy = calculateBandEnergy(
      fftData,
      SNARE_RANGE.min,
      SNARE_RANGE.max,
      this.sampleRate,
      this.fftSize
    );

    const hihatEnergy = calculateBandEnergy(
      fftData,
      HIHAT_RANGE.min,
      HIHAT_RANGE.max,
      this.sampleRate,
      this.fftSize
    );

    // Calculate overall energy
    const totalEnergy = (kickEnergy + snareEnergy + hihatEnergy) / 3;

    // Calculate energy flux (change from previous frame)
    const kickFlux = kickEnergy - this.previousKickEnergy;
    const snareFlux = snareEnergy - this.previousSnareEnergy;
    const hihatFlux = hihatEnergy - this.previousHihatEnergy;
    const totalFlux = totalEnergy - this.previousEnergy;

    // Get adaptive thresholds
    const kickThreshold = this.getAdaptiveThreshold(this.kickHistory);
    const snareThreshold = this.getAdaptiveThreshold(this.snareHistory);
    const hihatThreshold = this.getAdaptiveThreshold(this.hihatHistory);
    const totalThreshold = this.getAdaptiveThreshold(this.energyHistory);

    // Detect beat type based on which band has the strongest onset
    let beatDetected = false;
    let beatType: BeatType = 'other';
    let strength = 0;
    let confidence = 0;

    // Check for kick (bass) beat
    if (kickFlux > kickThreshold * (1 - this.sensitivity)) {
      beatDetected = true;
      beatType = 'kick';
      strength = Math.min(1, kickFlux / kickThreshold);
      confidence = this.calculateConfidence(kickFlux, kickThreshold);
    }

    // Check for snare beat (may override kick if stronger)
    if (snareFlux > snareThreshold * (1 - this.sensitivity)) {
      const snareStrength = Math.min(1, snareFlux / snareThreshold);
      if (snareStrength > strength) {
        beatDetected = true;
        beatType = 'snare';
        strength = snareStrength;
        confidence = this.calculateConfidence(snareFlux, snareThreshold);
      }
    }

    // Check for hihat beat
    if (hihatFlux > hihatThreshold * (1 - this.sensitivity)) {
      const hihatStrength = Math.min(1, hihatFlux / hihatThreshold);
      if (hihatStrength > strength && !beatDetected) {
        beatDetected = true;
        beatType = 'hihat';
        strength = hihatStrength;
        confidence = this.calculateConfidence(hihatFlux, hihatThreshold);
      }
    }

    // Fallback to overall energy detection
    if (!beatDetected && totalFlux > totalThreshold * (1 - this.sensitivity)) {
      beatDetected = true;
      beatType = 'other';
      strength = Math.min(1, totalFlux / totalThreshold);
      confidence = this.calculateConfidence(totalFlux, totalThreshold);
    }

    // Update history
    this.updateHistory(fftData);
    this.previousEnergy = totalEnergy;
    this.previousKickEnergy = kickEnergy;
    this.previousSnareEnergy = snareEnergy;
    this.previousHihatEnergy = hihatEnergy;

    if (beatDetected) {
      const beat = createBeatInfo(currentTime, strength, beatType, confidence);
      this.recordBeat(beat);
      return beat;
    }

    return null;
  }

  /**
   * Calculate adaptive threshold from energy history.
   */
  private getAdaptiveThreshold(history: number[]): number {
    if (history.length === 0) {
      return 0.1;
    }

    // Calculate mean and standard deviation
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance =
      history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      history.length;
    const stdDev = Math.sqrt(variance);

    // Threshold is mean + 1.5 standard deviations
    return mean + stdDev * 1.5;
  }

  /**
   * Calculate confidence score for beat detection.
   */
  private calculateConfidence(flux: number, threshold: number): number {
    if (threshold <= 0) {
      return 0.5;
    }
    // Confidence based on how much flux exceeds threshold
    const ratio = flux / threshold;
    return Math.min(1, Math.max(0, (ratio - 1) / 2 + 0.5));
  }

  /**
   * Update energy history arrays.
   */
  private updateHistory(fftData: Float32Array): void {
    const kickEnergy = calculateBandEnergy(
      fftData,
      KICK_RANGE.min,
      KICK_RANGE.max,
      this.sampleRate,
      this.fftSize
    );

    const snareEnergy = calculateBandEnergy(
      fftData,
      SNARE_RANGE.min,
      SNARE_RANGE.max,
      this.sampleRate,
      this.fftSize
    );

    const hihatEnergy = calculateBandEnergy(
      fftData,
      HIHAT_RANGE.min,
      HIHAT_RANGE.max,
      this.sampleRate,
      this.fftSize
    );

    const totalEnergy = (kickEnergy + snareEnergy + hihatEnergy) / 3;

    // Add to history, maintaining max size
    this.energyHistory.push(totalEnergy);
    this.kickHistory.push(kickEnergy);
    this.snareHistory.push(snareEnergy);
    this.hihatHistory.push(hihatEnergy);

    if (this.energyHistory.length > ENERGY_HISTORY_SIZE) {
      this.energyHistory.shift();
      this.kickHistory.shift();
      this.snareHistory.shift();
      this.hihatHistory.shift();
    }
  }

  /**
   * Record a detected beat and update BPM estimation.
   */
  private recordBeat(beat: BeatInfo): void {
    this.beatHistory.push(beat);
    this.lastBeatTime = beat.time;

    // Maintain max history size
    if (this.beatHistory.length > MAX_BEAT_HISTORY) {
      this.beatHistory.shift();
    }

    // Update BPM estimation
    this.updateBpmEstimate();
  }

  /**
   * Update BPM estimate from beat history.
   */
  private updateBpmEstimate(): void {
    if (this.beatHistory.length < 4) {
      return;
    }

    // Calculate intervals between beats
    const intervals: number[] = [];
    for (let i = 1; i < this.beatHistory.length; i++) {
      const interval = this.beatHistory[i].time - this.beatHistory[i - 1].time;
      // Only consider reasonable intervals (30-300 BPM range)
      if (interval >= 200 && interval <= 2000) {
        intervals.push(interval);
      }
    }

    if (intervals.length < 3) {
      return;
    }

    // Calculate median interval (more robust than mean)
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];

    // Convert to BPM
    this.estimatedBpm = Math.round(60000 / medianInterval);
  }

  /**
   * Get the current BPM estimate.
   */
  getBpm(): number {
    return this.estimatedBpm;
  }

  /**
   * Get the beat history.
   */
  getBeatHistory(): BeatInfo[] {
    return [...this.beatHistory];
  }

  /**
   * Get time since last beat in milliseconds.
   */
  getTimeSinceLastBeat(): number {
    if (this.lastBeatTime === 0) {
      return Infinity;
    }
    return performance.now() - this.lastBeatTime;
  }

  /**
   * Get current beat phase (0-1) based on estimated BPM.
   */
  getBeatPhase(): number {
    if (this.estimatedBpm <= 0 || this.lastBeatTime === 0) {
      return 0;
    }

    const beatInterval = 60000 / this.estimatedBpm;
    const timeSinceBeat = this.getTimeSinceLastBeat();

    return (timeSinceBeat % beatInterval) / beatInterval;
  }

  /**
   * Reset the beat detector state.
   */
  reset(): void {
    this.energyHistory = [];
    this.kickHistory = [];
    this.snareHistory = [];
    this.hihatHistory = [];
    this.beatHistory = [];
    this.lastBeatTime = 0;
    this.previousEnergy = 0;
    this.previousKickEnergy = 0;
    this.previousSnareEnergy = 0;
    this.previousHihatEnergy = 0;
    this.estimatedBpm = 0;
  }

  /**
   * Update sensitivity.
   */
  setSensitivity(sensitivity: number): void {
    this.sensitivity = Math.max(0.1, Math.min(1, sensitivity));
  }
}
