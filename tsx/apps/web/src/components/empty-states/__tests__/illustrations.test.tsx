/**
 * Empty State Illustrations Tests
 * 
 * Tests for the SVG illustration components.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NoAssets, NoBrandKits, NoResults } from '../illustrations';

// ============================================================================
// NoAssets Tests
// ============================================================================

describe('NoAssets', () => {
  it('should render an SVG element', () => {
    const { container } = render(<NoAssets />);
    
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('should have default dimensions of 120x120', () => {
    const { container } = render(<NoAssets />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('width')).toBe('120');
    expect(svg?.getAttribute('height')).toBe('120');
  });

  it('should accept custom dimensions', () => {
    const { container } = render(<NoAssets width={200} height={150} />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('width')).toBe('200');
    expect(svg?.getAttribute('height')).toBe('150');
  });

  it('should apply custom className', () => {
    const { container } = render(<NoAssets className="custom-class" />);
    const svg = container.querySelector('svg');
    
    expect(svg?.className.baseVal).toContain('custom-class');
  });

  it('should be hidden from screen readers', () => {
    const { container } = render(<NoAssets />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should have proper viewBox', () => {
    const { container } = render(<NoAssets />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('viewBox')).toBe('0 0 120 120');
  });
});

// ============================================================================
// NoBrandKits Tests
// ============================================================================

describe('NoBrandKits', () => {
  it('should render an SVG element', () => {
    const { container } = render(<NoBrandKits />);
    
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('should have default dimensions of 120x120', () => {
    const { container } = render(<NoBrandKits />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('width')).toBe('120');
    expect(svg?.getAttribute('height')).toBe('120');
  });

  it('should accept custom dimensions', () => {
    const { container } = render(<NoBrandKits width={180} height={180} />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('width')).toBe('180');
    expect(svg?.getAttribute('height')).toBe('180');
  });

  it('should apply custom className', () => {
    const { container } = render(<NoBrandKits className="brand-illustration" />);
    const svg = container.querySelector('svg');
    
    expect(svg?.className.baseVal).toContain('brand-illustration');
  });

  it('should be hidden from screen readers', () => {
    const { container } = render(<NoBrandKits />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should have proper viewBox', () => {
    const { container } = render(<NoBrandKits />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('viewBox')).toBe('0 0 120 120');
  });
});

// ============================================================================
// NoResults Tests
// ============================================================================

describe('NoResults', () => {
  it('should render an SVG element', () => {
    const { container } = render(<NoResults />);
    
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('should have default dimensions of 120x120', () => {
    const { container } = render(<NoResults />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('width')).toBe('120');
    expect(svg?.getAttribute('height')).toBe('120');
  });

  it('should accept custom dimensions', () => {
    const { container } = render(<NoResults width={100} height={100} />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('width')).toBe('100');
    expect(svg?.getAttribute('height')).toBe('100');
  });

  it('should apply custom className', () => {
    const { container } = render(<NoResults className="search-illustration" />);
    const svg = container.querySelector('svg');
    
    expect(svg?.className.baseVal).toContain('search-illustration');
  });

  it('should be hidden from screen readers', () => {
    const { container } = render(<NoResults />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should have proper viewBox', () => {
    const { container } = render(<NoResults />);
    const svg = container.querySelector('svg');
    
    expect(svg?.getAttribute('viewBox')).toBe('0 0 120 120');
  });
});
