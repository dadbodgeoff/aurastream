/**
 * Sound Effects System
 * 
 * Optional audio feedback for Canvas Studio interactions.
 * Uses Web Audio API for low-latency playback.
 */

import type { SoundEffect, SoundSettings } from './types';

// ============================================================================
// Sound Configuration
// ============================================================================

const SOUND_URLS: Record<SoundEffect, string> = {
  click: '/sounds/click.mp3',
  success: '/sounds/success.mp3',
  achievement: '/sounds/achievement.mp3',
  whoosh: '/sounds/whoosh.mp3',
  pop: '/sounds/pop.mp3',
  celebration: '/sounds/celebration.mp3',
  error: '/sounds/error.mp3',
};

// Fallback to generated tones if audio files not available
const TONE_FREQUENCIES: Record<SoundEffect, number[]> = {
  click: [800],
  success: [523, 659, 784],
  achievement: [523, 659, 784, 1047],
  whoosh: [200, 400, 600],
  pop: [1000],
  celebration: [523, 659, 784, 1047, 1319],
  error: [200, 150],
};

// ============================================================================
// Sound Manager Class
// ============================================================================

class SoundManager {
  private audioContext: AudioContext | null = null;
  private settings: SoundSettings = {
    enabled: false, // Disabled by default
    volume: 0.5,
  };
  private audioCache: Map<SoundEffect, AudioBuffer> = new Map();
  private isInitialized = false;

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.isInitialized = true;
      
      // Preload sounds
      await this.preloadSounds();
    } catch (error) {
      console.warn('Failed to initialize audio context:', error);
    }
  }

  /**
   * Preload all sound effects
   */
  private async preloadSounds(): Promise<void> {
    if (!this.audioContext) return;

    for (const [effect, url] of Object.entries(SOUND_URLS)) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          this.audioCache.set(effect as SoundEffect, audioBuffer);
        }
      } catch {
        // Sound file not available, will use generated tone
      }
    }
  }

  /**
   * Update sound settings
   */
  setSettings(settings: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * Get current settings
   */
  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  /**
   * Play a sound effect
   */
  async play(effect: SoundEffect): Promise<void> {
    if (!this.settings.enabled) return;

    // Initialize on first play (requires user interaction)
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext) return;

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const cachedBuffer = this.audioCache.get(effect);
    if (cachedBuffer) {
      this.playBuffer(cachedBuffer);
    } else {
      this.playGeneratedTone(effect);
    }
  }

  /**
   * Play an audio buffer
   */
  private playBuffer(buffer: AudioBuffer): void {
    if (!this.audioContext) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = this.settings.volume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.start(0);
  }

  /**
   * Play a generated tone as fallback
   */
  private playGeneratedTone(effect: SoundEffect): void {
    if (!this.audioContext) return;

    const frequencies = TONE_FREQUENCIES[effect];
    const duration = effect === 'celebration' ? 0.5 : 0.1;

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = freq;

      gainNode.gain.value = this.settings.volume * 0.3;
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext!.currentTime + duration
      );

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      const startTime = this.audioContext!.currentTime + index * 0.05;
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  }

  /**
   * Enable sounds
   */
  enable(): void {
    this.settings.enabled = true;
  }

  /**
   * Disable sounds
   */
  disable(): void {
    this.settings.enabled = false;
  }

  /**
   * Toggle sounds
   */
  toggle(): boolean {
    this.settings.enabled = !this.settings.enabled;
    return this.settings.enabled;
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    this.settings.volume = Math.max(0, Math.min(1, volume));
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const soundManager = new SoundManager();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Play a sound effect
 */
export function playSound(effect: SoundEffect): void {
  soundManager.play(effect);
}

/**
 * Enable sound effects
 */
export function enableSounds(): void {
  soundManager.enable();
}

/**
 * Disable sound effects
 */
export function disableSounds(): void {
  soundManager.disable();
}

/**
 * Toggle sound effects
 */
export function toggleSounds(): boolean {
  return soundManager.toggle();
}

/**
 * Set sound volume
 */
export function setSoundVolume(volume: number): void {
  soundManager.setVolume(volume);
}

/**
 * Get sound settings
 */
export function getSoundSettings(): SoundSettings {
  return soundManager.getSettings();
}
