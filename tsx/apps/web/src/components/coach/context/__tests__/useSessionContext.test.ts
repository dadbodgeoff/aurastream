/**
 * useSessionContext Hook Tests
 * 
 * Tests for the session state management hook.
 * 
 * @module coach/context/__tests__/useSessionContext.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionContext } from '../useSessionContext';

describe('useSessionContext', () => {
  const defaultOptions = {
    sessionId: 'session-123',
    assetType: 'twitch_emote',
    brandKitName: 'My Brand Kit',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return session ID from options', () => {
      const { result } = renderHook(() => useSessionContext(defaultOptions));

      expect(result.current.sessionId).toBe('session-123');
    });

    it('should return asset type from options', () => {
      const { result } = renderHook(() => useSessionContext(defaultOptions));

      expect(result.current.assetType).toBe('twitch_emote');
    });

    it('should return brand kit name from options', () => {
      const { result } = renderHook(() => useSessionContext(defaultOptions));

      expect(result.current.brandKitName).toBe('My Brand Kit');
    });

    it('should return null for brand kit name when not provided', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          sessionId: 'session-123',
          assetType: 'twitch_emote',
        })
      );

      expect(result.current.brandKitName).toBeNull();
    });

    it('should default to 10 total turns', () => {
      const { result } = renderHook(() => useSessionContext(defaultOptions));

      expect(result.current.totalTurns).toBe(10);
    });

    it('should use custom total turns when provided', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 15,
        })
      );

      expect(result.current.totalTurns).toBe(15);
    });

    it('should start with 0 turns used by default', () => {
      const { result } = renderHook(() => useSessionContext(defaultOptions));

      expect(result.current.turnsUsed).toBe(0);
    });

    it('should use initial turns used when provided', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          initialTurnsUsed: 5,
        })
      );

      expect(result.current.turnsUsed).toBe(5);
    });
  });

  describe('turns calculation', () => {
    it('should calculate turns remaining correctly', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 10,
          initialTurnsUsed: 3,
        })
      );

      expect(result.current.turnsRemaining).toBe(7);
    });

    it('should not return negative turns remaining', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 5,
          initialTurnsUsed: 10,
        })
      );

      expect(result.current.turnsRemaining).toBe(0);
    });
  });

  describe('isLowTurns', () => {
    it('should be false when turns remaining >= 3', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 10,
          initialTurnsUsed: 7,
        })
      );

      expect(result.current.turnsRemaining).toBe(3);
      expect(result.current.isLowTurns).toBe(false);
    });

    it('should be true when turns remaining < 3 and > 0', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 10,
          initialTurnsUsed: 8,
        })
      );

      expect(result.current.turnsRemaining).toBe(2);
      expect(result.current.isLowTurns).toBe(true);
    });

    it('should be true when 1 turn remaining', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 10,
          initialTurnsUsed: 9,
        })
      );

      expect(result.current.turnsRemaining).toBe(1);
      expect(result.current.isLowTurns).toBe(true);
    });

    it('should be false when 0 turns remaining', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 10,
          initialTurnsUsed: 10,
        })
      );

      expect(result.current.turnsRemaining).toBe(0);
      expect(result.current.isLowTurns).toBe(false);
    });
  });

  describe('incrementTurns', () => {
    it('should increment turns used by 1', () => {
      const { result } = renderHook(() => useSessionContext(defaultOptions));

      expect(result.current.turnsUsed).toBe(0);

      act(() => {
        result.current.incrementTurns();
      });

      expect(result.current.turnsUsed).toBe(1);
    });

    it('should update turns remaining when incremented', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 10,
        })
      );

      expect(result.current.turnsRemaining).toBe(10);

      act(() => {
        result.current.incrementTurns();
      });

      expect(result.current.turnsRemaining).toBe(9);
    });

    it('should not exceed total turns', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 3,
          initialTurnsUsed: 3,
        })
      );

      act(() => {
        result.current.incrementTurns();
      });

      expect(result.current.turnsUsed).toBe(3);
      expect(result.current.turnsRemaining).toBe(0);
    });

    it('should trigger isLowTurns when crossing threshold', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 10,
          initialTurnsUsed: 7,
        })
      );

      expect(result.current.isLowTurns).toBe(false);

      act(() => {
        result.current.incrementTurns();
      });

      expect(result.current.turnsRemaining).toBe(2);
      expect(result.current.isLowTurns).toBe(true);
    });
  });

  describe('endSession', () => {
    it('should set session ID to null when ended', () => {
      const { result } = renderHook(() => useSessionContext(defaultOptions));

      expect(result.current.sessionId).toBe('session-123');

      act(() => {
        result.current.endSession();
      });

      expect(result.current.sessionId).toBeNull();
    });
  });

  describe('resetSession', () => {
    it('should reset turns used to 0', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          initialTurnsUsed: 5,
        })
      );

      expect(result.current.turnsUsed).toBe(5);

      act(() => {
        result.current.resetSession();
      });

      expect(result.current.turnsUsed).toBe(0);
    });

    it('should restore session ID after reset', () => {
      const { result } = renderHook(() => useSessionContext(defaultOptions));

      act(() => {
        result.current.endSession();
      });

      expect(result.current.sessionId).toBeNull();

      act(() => {
        result.current.resetSession();
      });

      expect(result.current.sessionId).toBe('session-123');
    });

    it('should reset turns remaining to total', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          ...defaultOptions,
          totalTurns: 10,
          initialTurnsUsed: 7,
        })
      );

      expect(result.current.turnsRemaining).toBe(3);

      act(() => {
        result.current.resetSession();
      });

      expect(result.current.turnsRemaining).toBe(10);
    });
  });

  describe('null session ID', () => {
    it('should handle null session ID', () => {
      const { result } = renderHook(() =>
        useSessionContext({
          sessionId: null,
          assetType: 'twitch_emote',
        })
      );

      expect(result.current.sessionId).toBeNull();
    });
  });
});
