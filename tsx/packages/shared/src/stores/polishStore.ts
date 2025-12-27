/**
 * Polish Store using Zustand
 * Manages celebration/polish state across the application
 *
 * Features:
 * - Priority-based celebration queue
 * - Subscription pattern for celebration changes
 * - Reduced motion preference support
 * - Enable/disable celebrations globally
 *
 * @module stores/polishStore
 */

import { create } from 'zustand';
import type { RarityTier } from '../constants/rarity';
import { RARITY_CONFIG, getRarityIndex } from '../constants/rarity';

/**
 * Celebration type for different kinds of celebrations
 */
export type CelebrationType = 'achievement' | 'milestone' | 'reward' | 'levelUp' | 'custom';

/**
 * Represents a celebration to be displayed
 */
export interface Celebration {
  /** Unique identifier for the celebration */
  id: string;
  /** Type of celebration */
  type: CelebrationType;
  /** Title text to display */
  title: string;
  /** Optional description text */
  description?: string;
  /** Rarity tier affecting visual style */
  rarity: RarityTier;
  /** Priority level (higher = more important, jumps ahead in queue) */
  priority: number;
  /** Duration in milliseconds (defaults based on rarity if not provided) */
  duration?: number;
  /** Additional custom data for the celebration */
  data?: Record<string, unknown>;
  /** Timestamp when the celebration was created */
  createdAt: number;
}

/**
 * Input type for queueing a celebration (id and createdAt are auto-generated)
 */
export type CelebrationInput = Omit<Celebration, 'id' | 'createdAt'>;

/**
 * Listener function type for celebration subscriptions
 */
export type CelebrationListener = (celebration: Celebration | null) => void;

/**
 * Polish store state interface
 */
export interface PolishState {
  // State
  /** Queue of pending celebrations, sorted by priority */
  celebrationQueue: Celebration[];
  /** Currently displayed celebration */
  currentCelebration: Celebration | null;
  /** Whether a celebration is currently being shown */
  isShowingCelebration: boolean;
  /** Whether celebrations are enabled globally */
  celebrationsEnabled: boolean;
  /** Whether reduced motion is preferred */
  reducedMotion: boolean;

  // Actions
  /** Add a celebration to the queue */
  queueCelebration: (celebration: CelebrationInput) => void;
  /** Show the next celebration from the queue */
  showNextCelebration: () => void;
  /** Dismiss the current celebration */
  dismissCelebration: () => void;
  /** Clear all pending celebrations */
  clearQueue: () => void;
  /** Enable or disable celebrations globally */
  setCelebrationsEnabled: (enabled: boolean) => void;
  /** Set reduced motion preference */
  setReducedMotion: (reduced: boolean) => void;

  // Subscriptions
  /** Subscribe to celebration changes */
  subscribe: (listener: CelebrationListener) => () => void;
}

/**
 * Default priority values based on rarity tier
 * Higher rarity = higher default priority
 */
const RARITY_DEFAULT_PRIORITY: Record<RarityTier, number> = {
  common: 10,
  rare: 20,
  epic: 30,
  legendary: 40,
  mythic: 50,
} as const;

/**
 * Default duration values based on rarity tier (in milliseconds)
 * Higher rarity = longer display time
 */
const RARITY_DEFAULT_DURATION: Record<RarityTier, number> = {
  common: 3000,
  rare: 4000,
  epic: 5000,
  legendary: 6000,
  mythic: 8000,
} as const;

/**
 * Generate a unique ID for celebrations
 * Uses crypto.randomUUID if available, falls back to timestamp-based ID
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `celebration-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Sort celebrations by priority (descending) and createdAt (ascending for same priority)
 */
function sortByPriority(a: Celebration, b: Celebration): number {
  // Higher priority first
  if (a.priority !== b.priority) {
    return b.priority - a.priority;
  }
  // Same priority: FIFO (earlier createdAt first)
  return a.createdAt - b.createdAt;
}

/**
 * Calculate effective priority for a celebration
 * Uses provided priority or defaults based on rarity
 */
function getEffectivePriority(celebration: CelebrationInput): number {
  return celebration.priority ?? RARITY_DEFAULT_PRIORITY[celebration.rarity];
}

/**
 * Calculate effective duration for a celebration
 * Uses provided duration or defaults based on rarity
 */
function getEffectiveDuration(celebration: Celebration): number {
  return celebration.duration ?? RARITY_DEFAULT_DURATION[celebration.rarity];
}

// Store for subscription listeners
const listeners = new Set<CelebrationListener>();

/**
 * Notify all listeners of a celebration change
 */
function notifyListeners(celebration: Celebration | null): void {
  listeners.forEach((listener) => {
    try {
      listener(celebration);
    } catch (error) {
      console.error('Error in celebration listener:', error);
    }
  });
}

/**
 * Polish store for managing celebration state
 */
export const usePolishStore = create<PolishState>((set, get) => ({
  // Initial state
  celebrationQueue: [],
  currentCelebration: null,
  isShowingCelebration: false,
  celebrationsEnabled: true,
  reducedMotion: false,

  // Actions
  queueCelebration: (celebrationInput) => {
    const state = get();

    // Don't queue if celebrations are disabled
    if (!state.celebrationsEnabled) {
      return;
    }

    const celebration: Celebration = {
      ...celebrationInput,
      id: generateId(),
      priority: getEffectivePriority(celebrationInput),
      createdAt: Date.now(),
    };

    set((state) => {
      const newQueue = [...state.celebrationQueue, celebration].sort(sortByPriority);
      return { celebrationQueue: newQueue };
    });

    // If no celebration is currently showing, show this one
    if (!state.isShowingCelebration) {
      get().showNextCelebration();
    }
  },

  showNextCelebration: () => {
    const state = get();

    // Don't show if celebrations are disabled
    if (!state.celebrationsEnabled) {
      return;
    }

    // Don't show if already showing a celebration
    if (state.isShowingCelebration) {
      return;
    }

    // Don't show if queue is empty
    if (state.celebrationQueue.length === 0) {
      return;
    }

    // Get the highest priority celebration (first in sorted queue)
    const [nextCelebration, ...remainingQueue] = state.celebrationQueue;

    set({
      currentCelebration: nextCelebration,
      isShowingCelebration: true,
      celebrationQueue: remainingQueue,
    });

    // Notify listeners
    notifyListeners(nextCelebration);
  },

  dismissCelebration: () => {
    const state = get();

    if (!state.isShowingCelebration) {
      return;
    }

    set({
      currentCelebration: null,
      isShowingCelebration: false,
    });

    // Notify listeners that celebration was dismissed
    notifyListeners(null);

    // Show next celebration if queue is not empty
    // Use setTimeout to allow state to settle
    setTimeout(() => {
      get().showNextCelebration();
    }, 100);
  },

  clearQueue: () => {
    set({
      celebrationQueue: [],
    });
  },

  setCelebrationsEnabled: (enabled) => {
    set({ celebrationsEnabled: enabled });

    // If disabling, also dismiss current celebration
    if (!enabled) {
      const state = get();
      if (state.isShowingCelebration) {
        set({
          currentCelebration: null,
          isShowingCelebration: false,
        });
        notifyListeners(null);
      }
    }
  },

  setReducedMotion: (reduced) => {
    set({ reducedMotion: reduced });
  },

  // Subscriptions
  subscribe: (listener) => {
    listeners.add(listener);

    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
    };
  },
}));

/**
 * Get the default duration for a celebration based on its rarity
 * @param celebration - The celebration to get duration for
 * @returns Duration in milliseconds
 */
export function getCelebrationDuration(celebration: Celebration): number {
  return getEffectiveDuration(celebration);
}

/**
 * Get the default priority for a rarity tier
 * @param rarity - The rarity tier
 * @returns Default priority value
 */
export function getDefaultPriority(rarity: RarityTier): number {
  return RARITY_DEFAULT_PRIORITY[rarity];
}

/**
 * Get the default duration for a rarity tier
 * @param rarity - The rarity tier
 * @returns Default duration in milliseconds
 */
export function getDefaultDuration(rarity: RarityTier): number {
  return RARITY_DEFAULT_DURATION[rarity];
}
