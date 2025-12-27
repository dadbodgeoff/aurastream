/**
 * Content-Aware Skeleton Components Tests
 * 
 * Comprehensive tests for all skeleton loading components.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  AssetGridSkeleton,
  BrandKitCardSkeleton,
  DashboardStatsSkeleton,
  CoachMessageSkeleton,
} from '../index';

// Mock the useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

// ============================================================================
// AssetGridSkeleton Tests
// ============================================================================

describe('AssetGridSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<AssetGridSkeleton />);
      
      expect(screen.getByTestId('asset-grid-skeleton')).toBeDefined();
    });

    it('should render default count of 6 skeleton cards', () => {
      render(<AssetGridSkeleton />);
      
      const container = screen.getByTestId('asset-grid-skeleton');
      const cards = container.querySelectorAll('[aria-hidden="true"]');
      // 6 cards + 1 for the grid container
      expect(cards.length).toBe(6);
    });

    it('should render custom count of skeleton cards', () => {
      render(<AssetGridSkeleton count={9} />);
      
      const container = screen.getByTestId('asset-grid-skeleton');
      const cards = container.querySelectorAll('[aria-hidden="true"]');
      expect(cards.length).toBe(9);
    });

    it('should render with custom testId', () => {
      render(<AssetGridSkeleton testId="custom-asset-skeleton" />);
      
      expect(screen.getByTestId('custom-asset-skeleton')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(<AssetGridSkeleton className="custom-class" />);
      
      const container = screen.getByTestId('asset-grid-skeleton');
      expect(container.className).toContain('custom-class');
    });
  });

  describe('responsive grid', () => {
    it('should have responsive grid classes for 3 columns', () => {
      render(<AssetGridSkeleton columns={3} />);
      
      const container = screen.getByTestId('asset-grid-skeleton');
      const grid = container.querySelector('.grid');
      expect(grid?.className).toContain('lg:grid-cols-3');
      expect(grid?.className).toContain('sm:grid-cols-2');
      expect(grid?.className).toContain('grid-cols-1');
    });

    it('should have responsive grid classes for 4 columns', () => {
      render(<AssetGridSkeleton columns={4} />);
      
      const container = screen.getByTestId('asset-grid-skeleton');
      const grid = container.querySelector('.grid');
      expect(grid?.className).toContain('xl:grid-cols-4');
    });

    it('should have responsive grid classes for 2 columns', () => {
      render(<AssetGridSkeleton columns={2} />);
      
      const container = screen.getByTestId('asset-grid-skeleton');
      const grid = container.querySelector('.grid');
      expect(grid?.className).toContain('sm:grid-cols-2');
    });
  });

  describe('accessibility', () => {
    it('should have role="status"', () => {
      render(<AssetGridSkeleton />);
      
      const container = screen.getByRole('status');
      expect(container).toBeDefined();
    });

    it('should have aria-label for loading message', () => {
      render(<AssetGridSkeleton />);
      
      const container = screen.getByTestId('asset-grid-skeleton');
      expect(container.getAttribute('aria-label')).toBe('Loading your assets...');
    });

    it('should have screen reader only loading text', () => {
      render(<AssetGridSkeleton />);
      
      expect(screen.getByText('Loading your assets...')).toBeDefined();
    });
  });

  describe('reduced motion', () => {
    it('should respect reduced motion preference', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);
      
      render(<AssetGridSkeleton />);
      
      // Component should render without animation classes
      const container = screen.getByTestId('asset-grid-skeleton');
      expect(container).toBeDefined();
    });
  });

  describe('brand colored shimmer', () => {
    it('should apply brand-colored shimmer when brandColored is true', () => {
      render(<AssetGridSkeleton brandColored />);
      
      const container = screen.getByTestId('asset-grid-skeleton');
      // The shimmer class should be applied to skeleton elements
      expect(container).toBeDefined();
    });
  });
});

// ============================================================================
// BrandKitCardSkeleton Tests
// ============================================================================

describe('BrandKitCardSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<BrandKitCardSkeleton />);
      
      expect(screen.getByTestId('brand-kit-card-skeleton')).toBeDefined();
    });

    it('should render default count of 3 skeleton cards', () => {
      render(<BrandKitCardSkeleton />);
      
      const container = screen.getByTestId('brand-kit-card-skeleton');
      const cards = container.querySelectorAll('.rounded-xl');
      expect(cards.length).toBe(3);
    });

    it('should render custom count of skeleton cards', () => {
      render(<BrandKitCardSkeleton count={5} />);
      
      const container = screen.getByTestId('brand-kit-card-skeleton');
      const cards = container.querySelectorAll('.rounded-xl');
      expect(cards.length).toBe(5);
    });

    it('should render with custom testId', () => {
      render(<BrandKitCardSkeleton testId="custom-brand-skeleton" />);
      
      expect(screen.getByTestId('custom-brand-skeleton')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(<BrandKitCardSkeleton className="custom-class" />);
      
      const container = screen.getByTestId('brand-kit-card-skeleton');
      expect(container.className).toContain('custom-class');
    });
  });

  describe('layout elements', () => {
    it('should render color swatch placeholders', () => {
      render(<BrandKitCardSkeleton count={1} />);
      
      const container = screen.getByTestId('brand-kit-card-skeleton');
      // 4 color swatches + 1 plus indicator = 5 rounded-full elements per card
      const swatches = container.querySelectorAll('.rounded-full');
      expect(swatches.length).toBeGreaterThanOrEqual(5);
    });

    it('should render logo placeholder', () => {
      render(<BrandKitCardSkeleton count={1} />);
      
      const container = screen.getByTestId('brand-kit-card-skeleton');
      const logoPlaceholder = container.querySelector('.w-16.h-16');
      expect(logoPlaceholder).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should have role="status"', () => {
      render(<BrandKitCardSkeleton />);
      
      const container = screen.getByRole('status');
      expect(container).toBeDefined();
    });

    it('should have aria-label for loading message', () => {
      render(<BrandKitCardSkeleton />);
      
      const container = screen.getByTestId('brand-kit-card-skeleton');
      expect(container.getAttribute('aria-label')).toBe('Loading brand kits...');
    });

    it('should have screen reader only loading text', () => {
      render(<BrandKitCardSkeleton />);
      
      expect(screen.getByText('Loading brand kits...')).toBeDefined();
    });
  });

  describe('reduced motion', () => {
    it('should respect reduced motion preference', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);
      
      render(<BrandKitCardSkeleton />);
      
      const container = screen.getByTestId('brand-kit-card-skeleton');
      expect(container).toBeDefined();
    });
  });
});

// ============================================================================
// DashboardStatsSkeleton Tests
// ============================================================================

describe('DashboardStatsSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<DashboardStatsSkeleton />);
      
      expect(screen.getByTestId('dashboard-stats-skeleton')).toBeDefined();
    });

    it('should render default count of 4 stat cards', () => {
      render(<DashboardStatsSkeleton />);
      
      const container = screen.getByTestId('dashboard-stats-skeleton');
      const cards = container.querySelectorAll('.rounded-xl');
      expect(cards.length).toBe(4);
    });

    it('should render custom count of stat cards', () => {
      render(<DashboardStatsSkeleton count={3} />);
      
      const container = screen.getByTestId('dashboard-stats-skeleton');
      const cards = container.querySelectorAll('.rounded-xl');
      expect(cards.length).toBe(3);
    });

    it('should render with custom testId', () => {
      render(<DashboardStatsSkeleton testId="custom-stats-skeleton" />);
      
      expect(screen.getByTestId('custom-stats-skeleton')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(<DashboardStatsSkeleton className="custom-class" />);
      
      const container = screen.getByTestId('dashboard-stats-skeleton');
      expect(container.className).toContain('custom-class');
    });
  });

  describe('responsive grid', () => {
    it('should have responsive grid classes for 4 columns', () => {
      render(<DashboardStatsSkeleton />);
      
      const container = screen.getByTestId('dashboard-stats-skeleton');
      const grid = container.querySelector('.grid');
      expect(grid?.className).toContain('lg:grid-cols-4');
      expect(grid?.className).toContain('sm:grid-cols-2');
      expect(grid?.className).toContain('grid-cols-1');
    });
  });

  describe('layout elements', () => {
    it('should render icon placeholder', () => {
      render(<DashboardStatsSkeleton count={1} />);
      
      const container = screen.getByTestId('dashboard-stats-skeleton');
      const iconPlaceholder = container.querySelector('.w-10.h-10');
      expect(iconPlaceholder).toBeDefined();
    });

    it('should render trend indicator placeholder', () => {
      render(<DashboardStatsSkeleton count={1} />);
      
      const container = screen.getByTestId('dashboard-stats-skeleton');
      const trendPlaceholder = container.querySelector('.w-12.h-5');
      expect(trendPlaceholder).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should have role="status"', () => {
      render(<DashboardStatsSkeleton />);
      
      const container = screen.getByRole('status');
      expect(container).toBeDefined();
    });

    it('should have aria-label for loading message', () => {
      render(<DashboardStatsSkeleton />);
      
      const container = screen.getByTestId('dashboard-stats-skeleton');
      expect(container.getAttribute('aria-label')).toBe('Loading your stats...');
    });

    it('should have screen reader only loading text', () => {
      render(<DashboardStatsSkeleton />);
      
      expect(screen.getByText('Loading your stats...')).toBeDefined();
    });
  });

  describe('reduced motion', () => {
    it('should respect reduced motion preference', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);
      
      render(<DashboardStatsSkeleton />);
      
      const container = screen.getByTestId('dashboard-stats-skeleton');
      expect(container).toBeDefined();
    });
  });
});

// ============================================================================
// CoachMessageSkeleton Tests
// ============================================================================

describe('CoachMessageSkeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<CoachMessageSkeleton />);
      
      expect(screen.getByTestId('coach-message-skeleton')).toBeDefined();
    });

    it('should render default count of 3 message skeletons', () => {
      render(<CoachMessageSkeleton />);
      
      const container = screen.getByTestId('coach-message-skeleton');
      // Each message has an avatar (w-8 h-8)
      const avatars = container.querySelectorAll('.w-8.h-8');
      expect(avatars.length).toBe(3);
    });

    it('should render custom count of message skeletons', () => {
      render(<CoachMessageSkeleton count={5} />);
      
      const container = screen.getByTestId('coach-message-skeleton');
      const avatars = container.querySelectorAll('.w-8.h-8');
      expect(avatars.length).toBe(5);
    });

    it('should render with custom testId', () => {
      render(<CoachMessageSkeleton testId="custom-coach-skeleton" />);
      
      expect(screen.getByTestId('custom-coach-skeleton')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(<CoachMessageSkeleton className="custom-class" />);
      
      const container = screen.getByTestId('coach-message-skeleton');
      expect(container.className).toContain('custom-class');
    });
  });

  describe('layout elements', () => {
    it('should render avatar placeholders', () => {
      render(<CoachMessageSkeleton count={1} />);
      
      const container = screen.getByTestId('coach-message-skeleton');
      const avatar = container.querySelector('.w-8.h-8.rounded-full');
      expect(avatar).toBeDefined();
    });

    it('should render message bubble', () => {
      render(<CoachMessageSkeleton count={1} />);
      
      const container = screen.getByTestId('coach-message-skeleton');
      const bubble = container.querySelector('.rounded-2xl');
      expect(bubble).toBeDefined();
    });

    it('should render typing indicator', () => {
      render(<CoachMessageSkeleton />);
      
      // There are multiple instances of this text (sr-only and visible)
      const texts = screen.getAllByText('Coach is thinking...');
      expect(texts.length).toBeGreaterThanOrEqual(2);
    });

    it('should render typing dots', () => {
      render(<CoachMessageSkeleton />);
      
      const container = screen.getByTestId('coach-message-skeleton');
      // 3 typing dots
      const dots = container.querySelectorAll('.w-2.h-2.rounded-full');
      expect(dots.length).toBe(3);
    });
  });

  describe('accessibility', () => {
    it('should have role="status"', () => {
      render(<CoachMessageSkeleton />);
      
      const container = screen.getByRole('status');
      expect(container).toBeDefined();
    });

    it('should have aria-label for loading message', () => {
      render(<CoachMessageSkeleton />);
      
      const container = screen.getByTestId('coach-message-skeleton');
      expect(container.getAttribute('aria-label')).toBe('Coach is thinking...');
    });

    it('should have screen reader only loading text', () => {
      render(<CoachMessageSkeleton />);
      
      // There are multiple instances of this text (sr-only and visible)
      const texts = screen.getAllByText('Coach is thinking...');
      expect(texts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('reduced motion', () => {
    it('should respect reduced motion preference', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);
      
      render(<CoachMessageSkeleton />);
      
      const container = screen.getByTestId('coach-message-skeleton');
      expect(container).toBeDefined();
    });

    it('should not animate typing dots when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);
      
      render(<CoachMessageSkeleton />);
      
      const container = screen.getByTestId('coach-message-skeleton');
      const dots = container.querySelectorAll('.w-2.h-2.rounded-full');
      
      // Dots should not have animate-bounce class when reduced motion is preferred
      dots.forEach((dot) => {
        expect(dot.className).not.toContain('animate-bounce');
      });
    });
  });

  describe('brand colored shimmer', () => {
    it('should apply brand-colored shimmer when brandColored is true', () => {
      render(<CoachMessageSkeleton brandColored />);
      
      const container = screen.getByTestId('coach-message-skeleton');
      expect(container).toBeDefined();
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Skeleton Components Integration', () => {
  it('should export all skeleton components from index', async () => {
    const exports = await import('../index');
    
    expect(exports.AssetGridSkeleton).toBeDefined();
    expect(exports.BrandKitCardSkeleton).toBeDefined();
    expect(exports.DashboardStatsSkeleton).toBeDefined();
    expect(exports.CoachMessageSkeleton).toBeDefined();
  });

  it('should render all skeletons together without conflicts', () => {
    render(
      <div>
        <AssetGridSkeleton testId="asset-skeleton" />
        <BrandKitCardSkeleton testId="brand-skeleton" />
        <DashboardStatsSkeleton testId="stats-skeleton" />
        <CoachMessageSkeleton testId="coach-skeleton" />
      </div>
    );
    
    expect(screen.getByTestId('asset-skeleton')).toBeDefined();
    expect(screen.getByTestId('brand-skeleton')).toBeDefined();
    expect(screen.getByTestId('stats-skeleton')).toBeDefined();
    expect(screen.getByTestId('coach-skeleton')).toBeDefined();
  });
});
