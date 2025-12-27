/**
 * SessionContextBar Component Tests
 * 
 * Tests for the sticky session context bar component.
 * 
 * @module coach/context/__tests__/SessionContextBar.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionContextBar } from '../SessionContextBar';

describe('SessionContextBar', () => {
  const defaultProps = {
    sessionId: 'session-123',
    assetType: 'twitch_emote',
    turnsUsed: 3,
    turnsRemaining: 7,
    totalTurns: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default testId', () => {
      render(<SessionContextBar {...defaultProps} />);

      expect(screen.getByTestId('session-context-bar')).toBeDefined();
    });

    it('should render with custom testId', () => {
      render(<SessionContextBar {...defaultProps} testId="custom-bar" />);

      expect(screen.getByTestId('custom-bar')).toBeDefined();
    });

    it('should render asset type badge', () => {
      render(<SessionContextBar {...defaultProps} />);

      expect(screen.getByTestId('session-context-bar-badge')).toBeDefined();
      expect(screen.getByText('Twitch Emote')).toBeDefined();
    });

    it('should render turns indicator', () => {
      render(<SessionContextBar {...defaultProps} />);

      expect(screen.getByTestId('session-context-bar-turns')).toBeDefined();
    });

    it('should apply custom className', () => {
      render(<SessionContextBar {...defaultProps} className="custom-class" />);

      const bar = screen.getByTestId('session-context-bar');
      expect(bar.className).toContain('custom-class');
    });
  });

  describe('expanded state', () => {
    it('should show "Creating:" label in expanded state', () => {
      render(<SessionContextBar {...defaultProps} />);

      expect(screen.getByText('Creating:')).toBeDefined();
    });

    it('should show brand kit name when provided', () => {
      render(<SessionContextBar {...defaultProps} brandKitName="My Brand Kit" />);

      expect(screen.getByText('with')).toBeDefined();
      expect(screen.getByText('My Brand Kit')).toBeDefined();
    });

    it('should not show brand kit section when not provided', () => {
      render(<SessionContextBar {...defaultProps} />);

      expect(screen.queryByText('with')).toBeNull();
    });

    it('should show "Turns:" label in expanded state', () => {
      render(<SessionContextBar {...defaultProps} />);

      expect(screen.getByText('Turns:')).toBeDefined();
    });
  });

  describe('collapsed state', () => {
    it('should show compact view when collapsed', () => {
      render(<SessionContextBar {...defaultProps} isCollapsed />);

      expect(screen.queryByText('Creating:')).toBeNull();
      expect(screen.queryByText('Turns:')).toBeNull();
    });

    it('should show turns left text in collapsed state', () => {
      render(<SessionContextBar {...defaultProps} isCollapsed />);

      expect(screen.getByText('7 turns left')).toBeDefined();
    });

    it('should show singular "turn left" when 1 remaining', () => {
      render(
        <SessionContextBar
          {...defaultProps}
          turnsRemaining={1}
          turnsUsed={9}
          isCollapsed
        />
      );

      expect(screen.getByText('1 turn left')).toBeDefined();
    });

    it('should still show asset badge in collapsed state', () => {
      render(<SessionContextBar {...defaultProps} isCollapsed />);

      expect(screen.getByTestId('session-context-bar-badge')).toBeDefined();
    });
  });

  describe('action buttons', () => {
    it('should render End button', () => {
      render(<SessionContextBar {...defaultProps} onEndSession={() => {}} />);

      expect(screen.getByTestId('session-context-bar-end')).toBeDefined();
    });

    it('should render History button', () => {
      render(<SessionContextBar {...defaultProps} onViewHistory={() => {}} />);

      expect(screen.getByTestId('session-context-bar-history')).toBeDefined();
    });

    it('should call onEndSession when End button is clicked', () => {
      const onEndSession = vi.fn();
      render(<SessionContextBar {...defaultProps} onEndSession={onEndSession} />);

      fireEvent.click(screen.getByTestId('session-context-bar-end'));

      expect(onEndSession).toHaveBeenCalledTimes(1);
    });

    it('should call onViewHistory when History button is clicked', () => {
      const onViewHistory = vi.fn();
      render(<SessionContextBar {...defaultProps} onViewHistory={onViewHistory} />);

      fireEvent.click(screen.getByTestId('session-context-bar-history'));

      expect(onViewHistory).toHaveBeenCalledTimes(1);
    });

    it('should disable End button when onEndSession is not provided', () => {
      render(<SessionContextBar {...defaultProps} />);

      const endButton = screen.getByTestId('session-context-bar-end');
      expect(endButton).toHaveProperty('disabled', true);
    });

    it('should disable History button when onViewHistory is not provided', () => {
      render(<SessionContextBar {...defaultProps} />);

      const historyButton = screen.getByTestId('session-context-bar-history');
      expect(historyButton).toHaveProperty('disabled', true);
    });
  });

  describe('collapse toggle', () => {
    it('should render collapse button when onToggleCollapse is provided', () => {
      render(
        <SessionContextBar {...defaultProps} onToggleCollapse={() => {}} />
      );

      expect(screen.getByTestId('session-context-bar-collapse')).toBeDefined();
    });

    it('should not render collapse button when onToggleCollapse is not provided', () => {
      render(<SessionContextBar {...defaultProps} />);

      expect(screen.queryByTestId('session-context-bar-collapse')).toBeNull();
    });

    it('should call onToggleCollapse when collapse button is clicked', () => {
      const onToggleCollapse = vi.fn();
      render(
        <SessionContextBar {...defaultProps} onToggleCollapse={onToggleCollapse} />
      );

      fireEvent.click(screen.getByTestId('session-context-bar-collapse'));

      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('should render expand button in collapsed state', () => {
      render(
        <SessionContextBar
          {...defaultProps}
          isCollapsed
          onToggleCollapse={() => {}}
        />
      );

      expect(screen.getByTestId('session-context-bar-expand')).toBeDefined();
    });

    it('should call onToggleCollapse when expand button is clicked', () => {
      const onToggleCollapse = vi.fn();
      render(
        <SessionContextBar
          {...defaultProps}
          isCollapsed
          onToggleCollapse={onToggleCollapse}
        />
      );

      fireEvent.click(screen.getByTestId('session-context-bar-expand'));

      expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    });

    it('should have correct aria-expanded on collapse button', () => {
      render(
        <SessionContextBar {...defaultProps} onToggleCollapse={() => {}} />
      );

      const collapseButton = screen.getByTestId('session-context-bar-collapse');
      expect(collapseButton.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have correct aria-expanded on expand button', () => {
      render(
        <SessionContextBar
          {...defaultProps}
          isCollapsed
          onToggleCollapse={() => {}}
        />
      );

      const expandButton = screen.getByTestId('session-context-bar-expand');
      expect(expandButton.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('warning states', () => {
    it('should show warning color when turns are low', () => {
      render(
        <SessionContextBar
          {...defaultProps}
          turnsUsed={8}
          turnsRemaining={2}
          isCollapsed
        />
      );

      const bar = screen.getByTestId('session-context-bar');
      const warningText = bar.querySelector('.text-yellow-400');
      expect(warningText).toBeDefined();
    });

    it('should show critical color when 1 turn remaining', () => {
      render(
        <SessionContextBar
          {...defaultProps}
          turnsUsed={9}
          turnsRemaining={1}
          isCollapsed
        />
      );

      const bar = screen.getByTestId('session-context-bar');
      const criticalText = bar.querySelector('.text-red-400');
      expect(criticalText).toBeDefined();
    });

    it('should show normal color when turns are not low', () => {
      render(
        <SessionContextBar
          {...defaultProps}
          turnsUsed={5}
          turnsRemaining={5}
          isCollapsed
        />
      );

      const bar = screen.getByTestId('session-context-bar');
      const normalText = bar.querySelector('.text-text-secondary');
      expect(normalText).toBeDefined();
    });
  });

  describe('styling', () => {
    it('should have sticky positioning', () => {
      render(<SessionContextBar {...defaultProps} />);

      const bar = screen.getByTestId('session-context-bar');
      expect(bar.className).toContain('sticky');
      expect(bar.className).toContain('top-0');
    });

    it('should have glassmorphism styling', () => {
      render(<SessionContextBar {...defaultProps} />);

      const bar = screen.getByTestId('session-context-bar');
      expect(bar.className).toContain('backdrop-blur-sm');
      expect(bar.className).toContain('bg-background-surface/80');
    });

    it('should have border styling', () => {
      render(<SessionContextBar {...defaultProps} />);

      const bar = screen.getByTestId('session-context-bar');
      expect(bar.className).toContain('border-b');
      expect(bar.className).toContain('border-border-default');
    });

    it('should have z-index for stacking', () => {
      render(<SessionContextBar {...defaultProps} />);

      const bar = screen.getByTestId('session-context-bar');
      expect(bar.className).toContain('z-10');
    });
  });

  describe('accessibility', () => {
    it('should have accessible button labels', () => {
      render(
        <SessionContextBar
          {...defaultProps}
          onEndSession={() => {}}
          onViewHistory={() => {}}
        />
      );

      expect(screen.getByLabelText('End')).toBeDefined();
      expect(screen.getByLabelText('History')).toBeDefined();
    });

    it('should have accessible collapse button label', () => {
      render(
        <SessionContextBar {...defaultProps} onToggleCollapse={() => {}} />
      );

      expect(screen.getByLabelText('Collapse session context')).toBeDefined();
    });

    it('should have accessible expand button label', () => {
      render(
        <SessionContextBar
          {...defaultProps}
          isCollapsed
          onToggleCollapse={() => {}}
        />
      );

      expect(screen.getByLabelText('Expand session context')).toBeDefined();
    });
  });

  describe('default total turns', () => {
    it('should default to 10 total turns', () => {
      render(
        <SessionContextBar
          sessionId="session-123"
          assetType="twitch_emote"
          turnsUsed={3}
          turnsRemaining={7}
        />
      );

      // The TurnsIndicator should show 7/10
      expect(screen.getByText('7/10')).toBeDefined();
    });

    it('should use custom total turns when provided', () => {
      render(
        <SessionContextBar
          {...defaultProps}
          totalTurns={15}
          turnsUsed={5}
          turnsRemaining={10}
        />
      );

      expect(screen.getByText('10/15')).toBeDefined();
    });
  });
});
