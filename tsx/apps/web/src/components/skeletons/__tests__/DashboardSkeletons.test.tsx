/**
 * Dashboard Skeleton Components Tests
 * 
 * Tests for streaming SSR skeleton loading components.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import {
  StatsSkeleton,
  RecentAssetsSkeleton,
  ActiveJobsSkeleton,
  BrandKitsSkeleton,
  GenerationPageSkeleton,
  DashboardSkeleton,
} from '../DashboardSkeletons';

// Mock the useReducedMotion hook from @aurastream/shared
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('Dashboard Skeletons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StatsSkeleton', () => {
    it('renders 4 stat cards', () => {
      const { container } = render(<StatsSkeleton />);
      const cards = container.querySelectorAll('.rounded-xl');
      expect(cards.length).toBe(4);
    });

    it('renders skeleton elements inside each card', () => {
      const { container } = render(<StatsSkeleton />);
      // Each card should have skeleton elements
      const skeletons = container.querySelectorAll('[aria-hidden="true"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('RecentAssetsSkeleton', () => {
    it('renders 8 asset placeholders', () => {
      const { container } = render(<RecentAssetsSkeleton />);
      const assets = container.querySelectorAll('.aspect-square');
      expect(assets.length).toBe(8);
    });

    it('renders header with title and button skeletons', () => {
      const { container } = render(<RecentAssetsSkeleton />);
      const header = container.querySelector('.flex.items-center.justify-between');
      expect(header).toBeDefined();
    });
  });

  describe('ActiveJobsSkeleton', () => {
    it('renders 3 job placeholders', () => {
      const { container } = render(<ActiveJobsSkeleton />);
      const jobs = container.querySelectorAll('.p-4.rounded-lg');
      expect(jobs.length).toBe(3);
    });

    it('renders job items with icon, text, and status skeletons', () => {
      const { container } = render(<ActiveJobsSkeleton />);
      // Each job should have an icon placeholder (w-12 h-12)
      const icons = container.querySelectorAll('.w-12.h-12');
      expect(icons.length).toBe(3);
    });
  });

  describe('BrandKitsSkeleton', () => {
    it('renders 3 brand kit placeholders', () => {
      const { container } = render(<BrandKitsSkeleton />);
      const kits = container.querySelectorAll('.p-4.rounded-xl');
      expect(kits.length).toBe(3);
    });

    it('renders color swatches for each brand kit', () => {
      const { container } = render(<BrandKitsSkeleton />);
      // Each brand kit has 4 color swatches (rounded-full)
      const swatches = container.querySelectorAll('.rounded-full');
      expect(swatches.length).toBe(12); // 3 kits * 4 swatches
    });
  });

  describe('GenerationPageSkeleton', () => {
    it('renders header, progress, and assets sections', () => {
      const { container } = render(<GenerationPageSkeleton />);
      // Check for progress bar container
      const progressSection = container.querySelector('.p-6.rounded-xl');
      expect(progressSection).toBeDefined();
      // Check for asset grid
      const assets = container.querySelectorAll('.aspect-square');
      expect(assets.length).toBe(4);
    });

    it('renders progress bar skeleton', () => {
      const { container } = render(<GenerationPageSkeleton />);
      // Progress bar should have rounded-full class
      const progressBar = container.querySelector('.rounded-full');
      expect(progressBar).toBeDefined();
    });
  });

  describe('DashboardSkeleton', () => {
    it('renders all dashboard sections', () => {
      const { container } = render(<DashboardSkeleton />);
      // Should have stats grid
      const statsGrid = container.querySelector('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
      expect(statsGrid).toBeDefined();
    });

    it('combines StatsSkeleton, RecentAssetsSkeleton, and ActiveJobsSkeleton', () => {
      const { container } = render(<DashboardSkeleton />);
      // Stats: 4 cards
      const statCards = container.querySelectorAll('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4 > div');
      expect(statCards.length).toBe(4);
      // Assets: 8 placeholders
      const assets = container.querySelectorAll('.aspect-square');
      expect(assets.length).toBe(8);
      // Jobs: 3 placeholders
      const jobs = container.querySelectorAll('.p-4.rounded-lg');
      expect(jobs.length).toBe(3);
    });
  });
});
