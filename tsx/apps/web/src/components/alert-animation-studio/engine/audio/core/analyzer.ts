/**
 * Audio Analyzer
 *
 * Main class for audio analysis using Web Audio API.
 * Processes audio from files or microphone and provides
 * frequency bands, beat detection, and spectral analysis.
 */

import type {
  AudioAnalysis,
  AudioAnalyzerConfig,
  FrequencyBand,
  FrequencyBandName,
  AnalyzerState,
} from '../types';
import {
  FREQUENCY_BANDS,
  createAllFrequencyBands,
  createDefaultAudioAnalysis,
  createAnalyzerConfig,
} from '../types';
import { getAudioContext, resumeAudioContext } from './audioContext';
import {
  calculateBandEnergy,
  calculateSpectralCentroid,
  calculateSpectralFlux,
  calculateOverallEnergy,
} from './fft';
import { BeatDetector } from './beatDetection';

// ============================================================================
// Audio Analyzer Class
// ============================================================================

/**
 * Audio analyzer for real-time audio visualization.
 *
 * Connects to audio sources (files or microphone) and provides
 * comprehensive audio analysis including frequency bands,
 * beat detection, and spectral features.
 */
export class AudioAnalyzer {
  private config: AudioAnalyzerConfig;
  private state: AnalyzerState = 'idle';

  // Web Audio API nodes
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;

  // Audio element for file playback
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;

  // Analysis data
  private fftData: Float32Array = new Float32Array(0);
  private waveformData: Float32Array = new Float32Array(0);
  private previousFFT: Float32Array = new Float32Array(0);
  private bands: FrequencyBand[] = createAllFrequencyBands();

  // Beat detection
  private beatDetector: BeatDetector | null = null;

  /**
   * Create a new audio analyzer.
   *
   * @param config - Optional configuration overrides
   */
  constructor(config?: Partial<AudioAnalyzerConfig>) {
    this.config = createAnalyzerConfig(config);
  }


  /**
   * Initialize the audio context and analyser node.
   */
  private async initialize(): Promise<void> {
    if (this.audioContext && this.analyserNode) {
      return;
    }

    this.state = 'connecting';

    try {
      this.audioContext = await getAudioContext();

      // Create analyser node
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = this.config.fftSize;
      this.analyserNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
      this.analyserNode.minDecibels = this.config.minDecibels;
      this.analyserNode.maxDecibels = this.config.maxDecibels;

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);

      // Initialize data arrays
      const bufferLength = this.analyserNode.frequencyBinCount;
      this.fftData = new Float32Array(bufferLength);
      this.waveformData = new Float32Array(bufferLength);
      this.previousFFT = new Float32Array(bufferLength);

      // Initialize beat detector
      this.beatDetector = new BeatDetector(
        this.audioContext.sampleRate,
        this.config.fftSize,
        this.config.beatSensitivity
      );

      this.state = 'active';
    } catch (error) {
      this.state = 'error';
      throw error;
    }
  }

  /**
   * Connect to an audio file.
   *
   * @param url - URL of the audio file
   * @returns The HTMLAudioElement for playback control
   */
  async connectFile(url: string): Promise<HTMLAudioElement> {
    await this.initialize();

    if (!this.audioContext || !this.analyserNode || !this.gainNode) {
      throw new Error('Audio context not initialized');
    }

    // Disconnect existing source
    this.disconnectSource();

    // Create audio element
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.src = url;

    // Create media element source
    const source = this.audioContext.createMediaElementSource(this.audioElement);
    source.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);

    this.sourceNode = source;

    return this.audioElement;
  }

  /**
   * Connect to microphone input.
   */
  async connectMicrophone(): Promise<void> {
    await this.initialize();

    if (!this.audioContext || !this.analyserNode) {
      throw new Error('Audio context not initialized');
    }

    // Disconnect existing source
    this.disconnectSource();

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // Create media stream source
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyserNode);
      // Don't connect to destination to avoid feedback

      this.sourceNode = source;
    } catch (error) {
      this.state = 'error';
      throw new Error('Microphone access denied');
    }
  }

  /**
   * Disconnect the current audio source.
   */
  private disconnectSource(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  /**
   * Perform audio analysis and return current state.
   *
   * @returns Complete audio analysis data
   */
  analyze(): AudioAnalysis {
    if (!this.analyserNode || !this.audioContext) {
      return createDefaultAudioAnalysis();
    }

    // Get FFT data
    this.analyserNode.getFloatFrequencyData(this.fftData);
    this.analyserNode.getFloatTimeDomainData(this.waveformData);

    // Process frequency bands
    this.updateBands();

    // Calculate spectral features
    const energy = calculateOverallEnergy(this.fftData);
    const spectralCentroid = calculateSpectralCentroid(
      this.fftData,
      this.audioContext.sampleRate,
      this.config.fftSize
    );
    const spectralFlux = calculateSpectralFlux(this.fftData, this.previousFFT);

    // Detect beats
    const beat = this.beatDetector?.detect(this.fftData) ?? null;
    const beats = this.beatDetector?.getBeatHistory() ?? [];
    const bpm = this.beatDetector?.getBpm() ?? 0;
    const beatPhase = this.beatDetector?.getBeatPhase() ?? 0;
    const timeSinceLastBeat = this.beatDetector?.getTimeSinceLastBeat() ?? Infinity;

    // Store previous FFT for next frame
    this.previousFFT.set(this.fftData);

    // Get playback info
    const isPlaying = this.audioElement ? !this.audioElement.paused : false;
    const currentTime = this.audioElement?.currentTime ?? 0;
    const duration = this.audioElement?.duration ?? 0;

    return {
      fft: this.fftData,
      waveform: this.waveformData,
      bands: this.bands,
      energy,
      spectralCentroid,
      spectralFlux,
      beats,
      currentBeatIndex: beats.length - 1,
      timeSinceLastBeat,
      bpm,
      beatPhase,
      isPlaying,
      currentTime,
      duration,
    };
  }

  /**
   * Update frequency band values.
   */
  private updateBands(): void {
    if (!this.audioContext) return;

    const sampleRate = this.audioContext.sampleRate;

    for (let i = 0; i < this.bands.length; i++) {
      const band = this.bands[i];
      const definition = FREQUENCY_BANDS[i];

      // Calculate current band energy
      const value = calculateBandEnergy(
        this.fftData,
        definition.minHz,
        definition.maxHz,
        sampleRate,
        this.config.fftSize
      );

      // Apply smoothing
      band.value =
        band.value * this.config.bandSmoothing +
        value * (1 - this.config.bandSmoothing);

      // Update peak with decay
      if (value > band.peak) {
        band.peak = value;
      } else {
        band.peak *= this.config.peakDecay;
      }

      // Update rolling average
      band.average = band.average * 0.95 + value * 0.05;
    }
  }

  /**
   * Get a specific frequency band by name.
   *
   * @param name - Band name
   * @returns The frequency band or undefined
   */
  getBand(name: FrequencyBandName): FrequencyBand | undefined {
    return this.bands.find((band) => band.name === name);
  }

  /**
   * Resume the audio context (call on user interaction).
   */
  async resume(): Promise<void> {
    if (this.audioContext) {
      await resumeAudioContext(this.audioContext);
    }
  }

  /**
   * Set the volume (0-1).
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get current analyzer state.
   */
  getState(): AnalyzerState {
    return this.state;
  }

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<AudioAnalyzerConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.analyserNode) {
      if (config.smoothingTimeConstant !== undefined) {
        this.analyserNode.smoothingTimeConstant = config.smoothingTimeConstant;
      }
      if (config.minDecibels !== undefined) {
        this.analyserNode.minDecibels = config.minDecibels;
      }
      if (config.maxDecibels !== undefined) {
        this.analyserNode.maxDecibels = config.maxDecibels;
      }
    }

    if (this.beatDetector && config.beatSensitivity !== undefined) {
      this.beatDetector.setSensitivity(config.beatSensitivity);
    }
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.disconnectSource();

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    this.beatDetector?.reset();
    this.beatDetector = null;

    this.audioContext = null;
    this.state = 'disposed';
  }
}
