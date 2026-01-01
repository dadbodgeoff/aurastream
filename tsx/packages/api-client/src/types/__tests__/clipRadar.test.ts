/**
 * Clip Radar Types Property Tests
 * 
 * Tests for type definitions and field aliases in clipRadar.ts
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ViralClip, FreshClip, DailyRecap } from '../clipRadar';

describe('Clip Radar Types', () => {
  describe('ViralClip Type', () => {
    describe('Property Tests', () => {
      it('ViralClip should have id and clipId as the same value', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            (clipId) => {
              const clip: ViralClip = {
                id: clipId,
                clipId: clipId,
                title: 'Test Clip',
                url: 'https://clips.twitch.tv/test',
                thumbnailUrl: 'https://clips.twitch.tv/test/thumb.jpg',
                broadcasterName: 'Streamer',
                creatorName: 'Clipper',
                gameId: '33214',
                gameName: 'Fortnite',
                language: 'en',
                duration: 30,
                viewCount: 1000,
                velocity: 5,
                velocityScore: 50,
                totalGained: 900,
                ageMinutes: 30,
                alertReason: 'high_velocity',
                createdAt: new Date().toISOString(),
              };
              
              expect(clip.id).toBe(clip.clipId);
            }
          )
        );
      });

      it('velocityScore should be between 0 and 100', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 100 }),
            (score) => {
              const clip: ViralClip = {
                id: 'test',
                clipId: 'test',
                title: 'Test',
                url: 'https://test.com',
                thumbnailUrl: 'https://test.com/thumb.jpg',
                broadcasterName: 'Test',
                creatorName: 'Test',
                gameId: '33214',
                gameName: 'Fortnite',
                language: 'en',
                duration: 30,
                viewCount: 1000,
                velocity: score / 10,
                velocityScore: score,
                totalGained: 900,
                ageMinutes: 30,
                alertReason: 'high_velocity',
                createdAt: new Date().toISOString(),
              };
              
              expect(clip.velocityScore).toBeGreaterThanOrEqual(0);
              expect(clip.velocityScore).toBeLessThanOrEqual(100);
            }
          )
        );
      });
    });

    describe('Unit Tests', () => {
      it('should allow creating a valid ViralClip', () => {
        const clip: ViralClip = {
          id: 'abc123',
          clipId: 'abc123',
          title: 'Amazing Play',
          url: 'https://clips.twitch.tv/abc123',
          thumbnailUrl: 'https://clips.twitch.tv/abc123/thumb.jpg',
          broadcasterName: 'TopStreamer',
          creatorName: 'ClipMaster',
          gameId: '33214',
          gameName: 'Fortnite',
          language: 'en',
          duration: 30,
          viewCount: 50000,
          velocity: 8.5,
          velocityScore: 85,
          totalGained: 45000,
          ageMinutes: 45,
          alertReason: 'high_velocity',
          createdAt: '2025-12-31T12:00:00Z',
        };

        expect(clip.id).toBe('abc123');
        expect(clip.clipId).toBe('abc123');
        expect(clip.velocityScore).toBe(85);
      });
    });
  });

  describe('FreshClip Type', () => {
    describe('Unit Tests', () => {
      it('should allow creating a valid FreshClip', () => {
        const clip: FreshClip = {
          clipId: 'fresh123',
          title: 'Fresh Clip',
          url: 'https://clips.twitch.tv/fresh123',
          thumbnailUrl: 'https://clips.twitch.tv/fresh123/thumb.jpg',
          broadcasterName: 'Streamer',
          creatorName: 'Clipper',
          gameId: '33214',
          gameName: 'Fortnite',
          language: 'en',
          duration: 25,
          viewCount: 500,
          velocity: 2.5,
          ageMinutes: 10,
          createdAt: '2025-12-31T12:00:00Z',
        };

        expect(clip.clipId).toBe('fresh123');
        expect(clip.ageMinutes).toBe(10);
      });
    });
  });

  describe('DailyRecap Type', () => {
    describe('Unit Tests', () => {
      it('should allow creating a valid DailyRecap', () => {
        const recap: DailyRecap = {
          recapDate: '2025-12-31',
          totalClipsTracked: 1000,
          totalViralClips: 50,
          totalViewsTracked: 5000000,
          peakVelocity: 25.5,
          topClips: [],
          categoryStats: {
            '33214': {
              gameName: 'Fortnite',
              totalClips: 200,
              viralCount: 15,
            },
          },
          pollsCount: 288,
          firstPollAt: '2025-12-31T00:00:00Z',
          lastPollAt: '2025-12-31T23:55:00Z',
        };

        expect(recap.recapDate).toBe('2025-12-31');
        expect(recap.totalViralClips).toBe(50);
        expect(recap.categoryStats['33214'].gameName).toBe('Fortnite');
      });
    });
  });
});
