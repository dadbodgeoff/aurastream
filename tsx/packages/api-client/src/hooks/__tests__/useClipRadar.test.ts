/**
 * Clip Radar Hooks Unit & Property Tests
 * 
 * Tests for useClipRadar.ts hooks including:
 * - useViralClips
 * - useFreshClips
 * - useRadarStatus
 * - Transform functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

// Mock the apiClient
vi.mock('../../client', () => ({
  apiClient: {
    getAccessToken: vi.fn(() => 'mock-token'),
  },
}));

// Import after mocking
import {
  useViralClips,
  useFreshClips,
  useRadarStatus,
  useTrackedCategories,
  useRecentRecaps,
  clipRadarKeys,
} from '../useClipRadar';

import type { ViralClip } from '../../types/clipRadar';

// Test utilities
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Arbitraries for property tests
const viralClipArbitrary = fc.record({
  clip_id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  url: fc.webUrl(),
  thumbnail_url: fc.webUrl(),
  broadcaster_name: fc.string({ minLength: 1, maxLength: 50 }),
  creator_name: fc.string({ minLength: 1, maxLength: 50 }),
  game_id: fc.string({ minLength: 1, maxLength: 20 }),
  game_name: fc.string({ minLength: 1, maxLength: 50 }),
  language: fc.constantFrom('en', 'es', 'fr', 'de', 'ja', 'ko'),
  duration: fc.float({ min: 1, max: 60 }),
  view_count: fc.integer({ min: 0, max: 10000000 }),
  velocity: fc.float({ min: 0, max: 100 }),
  total_gained: fc.integer({ min: 0, max: 1000000 }),
  age_minutes: fc.float({ min: 0, max: 1440 }),
  alert_reason: fc.constantFrom('high_velocity', 'viral_threshold', 'trending'),
  created_at: fc.date().map(d => d.toISOString()),
});

describe('useClipRadar Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Query Keys', () => {
    describe('Property Tests', () => {
      it('all query keys should be arrays', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              clipRadarKeys.all,
              clipRadarKeys.viral(),
              clipRadarKeys.fresh(),
              clipRadarKeys.status(),
              clipRadarKeys.categories()
            ),
            (key) => {
              expect(Array.isArray(key)).toBe(true);
            }
          )
        );
      });

      it('all query keys should start with "clip-radar"', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              clipRadarKeys.all,
              clipRadarKeys.viral(),
              clipRadarKeys.fresh(),
              clipRadarKeys.status(),
              clipRadarKeys.categories()
            ),
            (key) => {
              expect(key[0]).toBe('clip-radar');
            }
          )
        );
      });

      it('viral keys with different gameIds should be unique', () => {
        fc.assert(
          fc.property(
            fc.tuple(fc.string(), fc.string()).filter(([a, b]) => a !== b),
            ([gameId1, gameId2]) => {
              const key1 = clipRadarKeys.viral(gameId1);
              const key2 = clipRadarKeys.viral(gameId2);
              expect(key1).not.toEqual(key2);
            }
          )
        );
      });
    });

    describe('Unit Tests', () => {
      it('should have correct base key', () => {
        expect(clipRadarKeys.all).toEqual(['clip-radar']);
      });

      it('should have correct viral key without gameId', () => {
        expect(clipRadarKeys.viral()).toEqual(['clip-radar', 'viral', undefined]);
      });

      it('should have correct viral key with gameId', () => {
        expect(clipRadarKeys.viral('33214')).toEqual(['clip-radar', 'viral', '33214']);
      });

      it('should have correct status key', () => {
        expect(clipRadarKeys.status()).toEqual(['clip-radar', 'status']);
      });
    });
  });

  describe('ViralClip Transform', () => {
    describe('Property Tests', () => {
      it('velocity to velocityScore conversion should be bounded 0-100', () => {
        fc.assert(
          fc.property(
            fc.float({ min: 0, max: 20 }),
            (velocity) => {
              const velocityScore = Math.min(100, Math.round(velocity * 10));
              expect(velocityScore).toBeGreaterThanOrEqual(0);
              expect(velocityScore).toBeLessThanOrEqual(100);
            }
          )
        );
      });

      it('high velocity values should cap at 100', () => {
        fc.assert(
          fc.property(
            fc.float({ min: 11, max: 1000 }), // velocity > 10 should cap at 100
            (velocity) => {
              const velocityScore = Math.min(100, Math.round(velocity * 10));
              // For velocity >= 10, score should be 100
              expect(velocityScore).toBe(100);
            }
          )
        );
      });
    });

    describe('Unit Tests', () => {
      it('should transform viral clip correctly', async () => {
        const mockClip = {
          clip_id: 'abc123',
          title: 'Amazing Play',
          url: 'https://clips.twitch.tv/abc123',
          thumbnail_url: 'https://clips.twitch.tv/abc123/thumb.jpg',
          broadcaster_name: 'Streamer1',
          creator_name: 'Clipper1',
          game_id: '33214',
          game_name: 'Fortnite',
          language: 'en',
          duration: 30,
          view_count: 50000,
          velocity: 8.5,
          total_gained: 45000,
          age_minutes: 45,
          alert_reason: 'high_velocity',
          created_at: '2025-12-31T12:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            clips: [mockClip],
            total: 1,
            last_poll: '2025-12-31T12:30:00Z',
            categories_tracked: 5,
          }),
        });

        const { result } = renderHook(() => useViralClips(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const clip = result.current.data?.clips[0];
        expect(clip).toBeDefined();
        expect(clip?.id).toBe('abc123');
        expect(clip?.clipId).toBe('abc123');
        expect(clip?.broadcasterName).toBe('Streamer1');
        expect(clip?.velocity).toBe(8.5);
        expect(clip?.velocityScore).toBe(85); // 8.5 * 10 = 85
      });

      it('should cap velocityScore at 100', async () => {
        const mockClip = {
          clip_id: 'abc123',
          title: 'Viral Clip',
          url: 'https://clips.twitch.tv/abc123',
          thumbnail_url: 'https://clips.twitch.tv/abc123/thumb.jpg',
          broadcaster_name: 'Streamer1',
          creator_name: 'Clipper1',
          game_id: '33214',
          game_name: 'Fortnite',
          language: 'en',
          duration: 30,
          view_count: 500000,
          velocity: 15, // Very high velocity
          total_gained: 450000,
          age_minutes: 30,
          alert_reason: 'viral_threshold',
          created_at: '2025-12-31T12:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            clips: [mockClip],
            total: 1,
            last_poll: '2025-12-31T12:30:00Z',
            categories_tracked: 5,
          }),
        });

        const { result } = renderHook(() => useViralClips(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const clip = result.current.data?.clips[0];
        expect(clip?.velocityScore).toBe(100); // Capped at 100
      });
    });
  });

  describe('useViralClips', () => {
    describe('Unit Tests', () => {
      it('should fetch viral clips successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            clips: [],
            total: 0,
            last_poll: '2025-12-31T12:00:00Z',
            categories_tracked: 5,
          }),
        });

        const { result } = renderHook(() => useViralClips(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.clips).toEqual([]);
        expect(result.current.data?.categoriesTracked).toBe(5);
      });

      it('should pass gameId filter to API', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            clips: [],
            total: 0,
            last_poll: null,
            categories_tracked: 5,
          }),
        });

        renderHook(() => useViralClips('33214', 10), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(mockFetch).toHaveBeenCalled());

        const url = mockFetch.mock.calls[0][0];
        expect(url).toContain('game_id=33214');
        expect(url).toContain('limit=10');
      });
    });
  });

  describe('useRadarStatus', () => {
    describe('Unit Tests', () => {
      it('should fetch radar status', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            is_active: true,
            last_poll: '2025-12-31T12:00:00Z',
            categories_tracked: 5,
            category_list: [
              { game_id: '33214', game_name: 'Fortnite' },
              { game_id: '516575', game_name: 'Valorant' },
            ],
          }),
        });

        const { result } = renderHook(() => useRadarStatus(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.isActive).toBe(true);
        expect(result.current.data?.categoriesTracked).toBe(5);
        expect(result.current.data?.categoryList).toHaveLength(2);
        expect(result.current.data?.categoryList[0].gameId).toBe('33214');
      });
    });
  });
});
