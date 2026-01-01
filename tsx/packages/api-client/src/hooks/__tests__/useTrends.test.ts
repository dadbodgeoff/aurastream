/**
 * Trends Hooks Unit & Property Tests
 * 
 * Tests for useTrends.ts hooks including:
 * - useDailyBrief
 * - useYouTubeTrending
 * - useTwitchLive
 * - useCrossPlatformTrends
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
  useDailyBrief,
  useYouTubeTrending,
  useTwitchLive,
  useTwitchGames,
  useTrendingKeywords,
  useVelocityAlerts,
  useCrossPlatformTrends,
  trendsKeys,
} from '../useTrends';

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

describe('useTrends Hooks', () => {
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
              trendsKeys.all,
              trendsKeys.dailyBrief(),
              trendsKeys.youtube(),
              trendsKeys.twitch(),
              trendsKeys.velocity()
            ),
            (key) => {
              expect(Array.isArray(key)).toBe(true);
            }
          )
        );
      });

      it('all query keys should start with "trends"', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(
              trendsKeys.all,
              trendsKeys.dailyBrief(),
              trendsKeys.youtube(),
              trendsKeys.twitch(),
              trendsKeys.velocity()
            ),
            (key) => {
              expect(key[0]).toBe('trends');
            }
          )
        );
      });

      it('youtube trending keys with different categories should be unique', () => {
        fc.assert(
          fc.property(
            fc.tuple(
              fc.constantFrom('gaming', 'entertainment', 'music', 'education'),
              fc.constantFrom('gaming', 'entertainment', 'music', 'education')
            ).filter(([a, b]) => a !== b),
            ([cat1, cat2]) => {
              const key1 = trendsKeys.youtubeTrending(cat1);
              const key2 = trendsKeys.youtubeTrending(cat2);
              expect(key1).not.toEqual(key2);
            }
          )
        );
      });
    });

    describe('Unit Tests', () => {
      it('should have correct base key', () => {
        expect(trendsKeys.all).toEqual(['trends']);
      });

      it('should have correct daily brief key', () => {
        expect(trendsKeys.dailyBrief()).toEqual(['trends', 'daily-brief']);
      });

      it('should have correct youtube trending key', () => {
        expect(trendsKeys.youtubeTrending('gaming')).toEqual(['trends', 'youtube', 'trending', 'gaming']);
      });

      it('should have correct twitch live key', () => {
        expect(trendsKeys.twitchLive('33214')).toEqual(['trends', 'twitch', 'live', '33214']);
      });

      it('should have correct velocity alerts key', () => {
        expect(trendsKeys.velocityAlerts()).toEqual(['trends', 'velocity', 'alerts']);
      });
    });
  });

  describe('useYouTubeTrending', () => {
    describe('Unit Tests', () => {
      it('should fetch YouTube trending videos', async () => {
        const mockResponse = {
          videos: [
            {
              video_id: 'abc123',
              title: 'Epic Gaming Video',
              thumbnail: 'https://i.ytimg.com/vi/abc123/maxresdefault.jpg',
              channel_id: 'UC123',
              channel_title: 'Gaming Channel',
              category: 'gaming',
              published_at: '2025-12-31T10:00:00Z',
              view_count: 1500000,
              like_count: 50000,
              comment_count: 5000,
              engagement_rate: 3.67,
              viral_score: 85,
              velocity: 12.5,
              insight: 'Trending due to new game release',
              duration_seconds: 600,
              is_live: false,
              is_short: false,
              tags: ['gaming', 'fortnite'],
            },
          ],
          category: 'gaming',
          region: 'US',
          fetched_at: '2025-12-31T12:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const { result } = renderHook(() => useYouTubeTrending('gaming', 20), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data?.[0].videoId).toBe('abc123');
        expect(result.current.data?.[0].views).toBe(1500000);
        expect(result.current.data?.[0].viralScore).toBe(85);
      });

      it('should handle empty response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            videos: [],
            category: 'gaming',
            region: 'US',
            fetched_at: '2025-12-31T12:00:00Z',
          }),
        });

        const { result } = renderHook(() => useYouTubeTrending(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
      });
    });
  });

  describe('useTwitchLive', () => {
    describe('Unit Tests', () => {
      it('should fetch Twitch live streams', async () => {
        const mockResponse = {
          streams: [
            {
              user_id: 'user123',
              user_name: 'TopStreamer',
              game_id: '33214',
              game_name: 'Fortnite',
              viewer_count: 50000,
              thumbnail: 'https://twitch.tv/thumb.jpg',
              title: 'Epic Stream',
              started_at: '2025-12-31T08:00:00Z',
              duration_minutes: 240,
              language: 'en',
              tags: ['English', 'Competitive'],
              is_mature: false,
            },
          ],
          total_viewers: 50000,
          fetched_at: '2025-12-31T12:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const { result } = renderHook(() => useTwitchLive(20), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data?.[0].streamerName).toBe('TopStreamer');
        expect(result.current.data?.[0].viewerCount).toBe(50000);
      });
    });
  });

  describe('useTwitchGames', () => {
    describe('Unit Tests', () => {
      it('should fetch Twitch games', async () => {
        const mockResponse = {
          games: [
            {
              game_id: '33214',
              name: 'Fortnite',
              twitch_viewers: 500000,
              twitch_streams: 5000,
              box_art_url: 'https://twitch.tv/fortnite.jpg',
              top_tags: ['Battle Royale', 'Competitive'],
              avg_viewers_per_stream: 100,
              top_languages: ['en', 'es', 'pt'],
            },
          ],
          fetched_at: '2025-12-31T12:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const { result } = renderHook(() => useTwitchGames(20), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data?.[0].gameId).toBe('33214');
        expect(result.current.data?.[0].name).toBe('Fortnite');
        expect(result.current.data?.[0].twitchViewers).toBe(500000);
      });
    });
  });

  describe('useTrendingKeywords', () => {
    describe('Unit Tests', () => {
      it('should fetch trending keywords', async () => {
        const mockResponse = {
          title_keywords: [
            { keyword: 'fortnite', count: 25, avg_views: 1500000, source: 'title' },
            { keyword: 'chapter', count: 20, avg_views: 1200000, source: 'title' },
          ],
          tag_keywords: [
            { keyword: 'gaming', count: 50, avg_views: 1000000, source: 'tag' },
          ],
          topic_keywords: [],
          caption_keywords: [],
          hashtags: ['#fortnite', '#gaming', '#chapter6'],
          category: 'gaming',
          generated_at: '2025-12-31T12:00:00Z',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const { result } = renderHook(() => useTrendingKeywords('gaming'), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.titleKeywords).toHaveLength(2);
        expect(result.current.data?.titleKeywords[0].keyword).toBe('fortnite');
        expect(result.current.data?.hashtags).toContain('#fortnite');
      });
    });
  });

  describe('useCrossPlatformTrends', () => {
    describe('Unit Tests', () => {
      it('should fetch cross-platform data', async () => {
        const mockResponse = {
          hot_games: [
            {
              game_id: '33214',
              name: 'Fortnite',
              twitch_viewers: 500000,
              twitch_streams: 5000,
              youtube_videos: 100,
              youtube_total_views: 50000000,
              trend: 'rising',
            },
          ],
          rising_creators: [
            {
              creator_id: 'creator123',
              creator_name: 'RisingStreamer',
              platform: 'twitch',
              profile_url: 'https://twitch.tv/risingstreamer',
              current_viewers: 5000,
              growth_percent: 150,
              category: 'Fortnite',
            },
          ],
          message: null,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const { result } = renderHook(() => useCrossPlatformTrends(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.hotGames).toHaveLength(1);
        expect(result.current.data?.hotGames[0].name).toBe('Fortnite');
        expect(result.current.data?.risingCreators).toHaveLength(1);
        expect(result.current.data?.risingCreators[0].creatorName).toBe('RisingStreamer');
        expect(result.current.data?.risingCreators[0].growthPercent).toBe(150);
      });

      it('should handle placeholder response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            hot_games: [],
            rising_creators: [],
            message: 'Cross-platform correlation coming soon',
          }),
        });

        const { result } = renderHook(() => useCrossPlatformTrends(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.hotGames).toEqual([]);
        expect(result.current.data?.message).toBe('Cross-platform correlation coming soon');
      });
    });
  });

  describe('useVelocityAlerts', () => {
    describe('Unit Tests', () => {
      it('should fetch velocity alerts', async () => {
        const mockResponse = {
          alerts: [
            {
              id: 'alert123',
              alert_type: 'game_spike',
              platform: 'twitch',
              subject_id: '33214',
              subject_name: 'Fortnite',
              subject_thumbnail: 'https://twitch.tv/fortnite.jpg',
              current_value: 750000,
              previous_value: 500000,
              change_percent: 50,
              velocity_score: 85,
              severity: 'high',
              insight: 'New season launch driving viewership',
              is_active: true,
              detected_at: '2025-12-31T10:00:00Z',
            },
          ],
          total_active: 1,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const { result } = renderHook(() => useVelocityAlerts(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data?.[0].alertType).toBe('game_spike');
        expect(result.current.data?.[0].changePercent).toBe(50);
        expect(result.current.data?.[0].severity).toBe('high');
      });
    });
  });
});
