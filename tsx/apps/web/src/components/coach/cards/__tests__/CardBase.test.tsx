/**
 * CardBase Component Tests
 * 
 * Tests for the shared card styling component.
 * 
 * @module coach/cards/__tests__/CardBase.test
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardBase } from '../CardBase';

describe('CardBase', () => {
  describe('rendering', () => {
    it('should render with title', () => {
      render(<CardBase title="Test Title">Content</CardBase>);
      
      expect(screen.getByText('Test Title')).toBeDefined();
    });

    it('should render children content', () => {
      render(<CardBase title="Test">Child content here</CardBase>);
      
      expect(screen.getByText('Child content here')).toBeDefined();
    });

    it('should render icon when provided', () => {
      const TestIcon = () => <span data-testid="test-icon">Icon</span>;
      render(
        <CardBase title="Test" icon={<TestIcon />}>
          Content
        </CardBase>
      );
      
      expect(screen.getByTestId('test-icon')).toBeDefined();
    });

    it('should not render icon container when icon is not provided', () => {
      render(<CardBase title="Test">Content</CardBase>);
      
      // The icon span should not exist
      const card = screen.getByTestId('card-base');
      const iconSpan = card.querySelector('.text-accent-500');
      expect(iconSpan).toBeNull();
    });
  });

  describe('styling', () => {
    it('should apply glassmorphism classes', () => {
      render(<CardBase title="Test">Content</CardBase>);
      
      const card = screen.getByTestId('card-base');
      expect(card.className).toContain('bg-white/5');
      expect(card.className).toContain('backdrop-blur-sm');
    });

    it('should apply border classes', () => {
      render(<CardBase title="Test">Content</CardBase>);
      
      const card = screen.getByTestId('card-base');
      expect(card.className).toContain('border');
      expect(card.className).toContain('border-border-default');
    });

    it('should apply rounded corners', () => {
      render(<CardBase title="Test">Content</CardBase>);
      
      const card = screen.getByTestId('card-base');
      expect(card.className).toContain('rounded-xl');
    });

    it('should apply custom className', () => {
      render(
        <CardBase title="Test" className="custom-class">
          Content
        </CardBase>
      );
      
      const card = screen.getByTestId('card-base');
      expect(card.className).toContain('custom-class');
    });

    it('should have header with border', () => {
      render(<CardBase title="Test">Content</CardBase>);
      
      const card = screen.getByTestId('card-base');
      const header = card.querySelector('.border-b');
      expect(header).toBeDefined();
    });
  });

  describe('accessibility', () => {
    it('should render title as h3', () => {
      render(<CardBase title="Test Title">Content</CardBase>);
      
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe('Test Title');
    });

    it('should hide icon from screen readers', () => {
      const TestIcon = () => <span>Icon</span>;
      render(
        <CardBase title="Test" icon={<TestIcon />}>
          Content
        </CardBase>
      );
      
      const card = screen.getByTestId('card-base');
      const iconContainer = card.querySelector('[aria-hidden="true"]');
      expect(iconContainer).toBeDefined();
    });

    it('should support custom testId', () => {
      render(
        <CardBase title="Test" testId="custom-card">
          Content
        </CardBase>
      );
      
      expect(screen.getByTestId('custom-card')).toBeDefined();
    });
  });

  describe('structure', () => {
    it('should have header and content sections', () => {
      render(<CardBase title="Test">Content</CardBase>);
      
      const card = screen.getByTestId('card-base');
      
      // Header section
      const header = card.querySelector('.px-4.py-3');
      expect(header).toBeDefined();
      
      // Content section
      const content = card.querySelector('.p-4');
      expect(content).toBeDefined();
    });

    it('should render complex children', () => {
      render(
        <CardBase title="Test">
          <div data-testid="child-1">First</div>
          <div data-testid="child-2">Second</div>
        </CardBase>
      );
      
      expect(screen.getByTestId('child-1')).toBeDefined();
      expect(screen.getByTestId('child-2')).toBeDefined();
    });
  });
});
