/**
 * SessionBadge Component Tests
 * 
 * Tests for the asset type badge component.
 * 
 * @module coach/context/__tests__/SessionBadge.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SessionBadge, getAssetTypeLabel, ASSET_TYPE_LABELS } from '../SessionBadge';

describe('SessionBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default testId', () => {
      render(<SessionBadge assetType="twitch_emote" />);

      expect(screen.getByTestId('session-badge')).toBeDefined();
    });

    it('should render with custom testId', () => {
      render(<SessionBadge assetType="twitch_emote" testId="custom-badge" />);

      expect(screen.getByTestId('custom-badge')).toBeDefined();
    });

    it('should render asset type label', () => {
      render(<SessionBadge assetType="twitch_emote" />);

      expect(screen.getByText('Twitch Emote')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(<SessionBadge assetType="twitch_emote" className="custom-class" />);

      const badge = screen.getByTestId('session-badge');
      expect(badge.className).toContain('custom-class');
    });
  });

  describe('asset type labels', () => {
    it('should render correct label for twitch_emote', () => {
      render(<SessionBadge assetType="twitch_emote" />);
      expect(screen.getByText('Twitch Emote')).toBeDefined();
    });

    it('should render correct label for youtube_thumbnail', () => {
      render(<SessionBadge assetType="youtube_thumbnail" />);
      expect(screen.getByText('YouTube Thumbnail')).toBeDefined();
    });

    it('should render correct label for twitch_banner', () => {
      render(<SessionBadge assetType="twitch_banner" />);
      expect(screen.getByText('Twitch Banner')).toBeDefined();
    });

    it('should render correct label for twitch_badge', () => {
      render(<SessionBadge assetType="twitch_badge" />);
      expect(screen.getByText('Twitch Badge')).toBeDefined();
    });

    it('should render correct label for overlay', () => {
      render(<SessionBadge assetType="overlay" />);
      expect(screen.getByText('Stream Overlay')).toBeDefined();
    });

    it('should render correct label for story_graphic', () => {
      render(<SessionBadge assetType="story_graphic" />);
      expect(screen.getByText('Story Graphic')).toBeDefined();
    });

    it('should render correct label for twitch_panel', () => {
      render(<SessionBadge assetType="twitch_panel" />);
      expect(screen.getByText('Twitch Panel')).toBeDefined();
    });

    it('should render correct label for twitch_offline', () => {
      render(<SessionBadge assetType="twitch_offline" />);
      expect(screen.getByText('Twitch Offline Screen')).toBeDefined();
    });

    it('should render correct label for tiktok_story', () => {
      render(<SessionBadge assetType="tiktok_story" />);
      expect(screen.getByText('TikTok Story')).toBeDefined();
    });

    it('should render correct label for instagram_story', () => {
      render(<SessionBadge assetType="instagram_story" />);
      expect(screen.getByText('Instagram Story')).toBeDefined();
    });

    it('should render correct label for instagram_reel', () => {
      render(<SessionBadge assetType="instagram_reel" />);
      expect(screen.getByText('Instagram Reel')).toBeDefined();
    });
  });

  describe('unknown asset types', () => {
    it('should format unknown asset type with title case', () => {
      render(<SessionBadge assetType="custom_asset_type" />);
      expect(screen.getByText('Custom Asset Type')).toBeDefined();
    });

    it('should handle single word asset type', () => {
      render(<SessionBadge assetType="banner" />);
      expect(screen.getByText('Banner')).toBeDefined();
    });
  });

  describe('styling', () => {
    it('should have pill-shaped styling', () => {
      render(<SessionBadge assetType="twitch_emote" />);

      const badge = screen.getByTestId('session-badge');
      expect(badge.className).toContain('rounded-full');
    });

    it('should have accent color styling', () => {
      render(<SessionBadge assetType="twitch_emote" />);

      const badge = screen.getByTestId('session-badge');
      expect(badge.className).toContain('bg-accent-500/20');
      expect(badge.className).toContain('text-accent-400');
    });

    it('should have inline-flex display', () => {
      render(<SessionBadge assetType="twitch_emote" />);

      const badge = screen.getByTestId('session-badge');
      expect(badge.className).toContain('inline-flex');
    });

    it('should have proper padding', () => {
      render(<SessionBadge assetType="twitch_emote" />);

      const badge = screen.getByTestId('session-badge');
      expect(badge.className).toContain('px-2.5');
      expect(badge.className).toContain('py-0.5');
    });
  });

  describe('icon rendering', () => {
    it('should render an icon', () => {
      render(<SessionBadge assetType="twitch_emote" />);

      const badge = screen.getByTestId('session-badge');
      const svg = badge.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('should have aria-hidden on icon container', () => {
      render(<SessionBadge assetType="twitch_emote" />);

      const badge = screen.getByTestId('session-badge');
      // The icon is wrapped in a span with aria-hidden
      const svg = badge.querySelector('svg');
      expect(svg).toBeDefined();
      // The icon itself is decorative
      expect(svg?.parentElement?.getAttribute('aria-hidden') || svg?.getAttribute('aria-hidden')).toBeTruthy();
    });
  });

  describe('getAssetTypeLabel helper', () => {
    it('should return correct label for known types', () => {
      expect(getAssetTypeLabel('twitch_emote')).toBe('Twitch Emote');
      expect(getAssetTypeLabel('youtube_thumbnail')).toBe('YouTube Thumbnail');
      expect(getAssetTypeLabel('overlay')).toBe('Stream Overlay');
    });

    it('should format unknown types with title case', () => {
      expect(getAssetTypeLabel('unknown_type')).toBe('Unknown Type');
      expect(getAssetTypeLabel('my_custom_asset')).toBe('My Custom Asset');
    });
  });

  describe('ASSET_TYPE_LABELS constant', () => {
    it('should contain all expected asset types', () => {
      const expectedTypes = [
        'twitch_emote',
        'youtube_thumbnail',
        'twitch_banner',
        'twitch_badge',
        'twitch_panel',
        'twitch_offline',
        'overlay',
        'thumbnail',
        'banner',
        'story_graphic',
        'tiktok_story',
        'instagram_story',
        'instagram_reel',
      ];

      expectedTypes.forEach((type) => {
        expect(ASSET_TYPE_LABELS[type]).toBeDefined();
      });
    });
  });
});
