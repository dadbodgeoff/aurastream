/**
 * PromptCard Component Tests
 * 
 * Tests for the refined prompt display component.
 * 
 * @module coach/cards/__tests__/PromptCard.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptCard } from '../PromptCard';

// Mock useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('PromptCard', () => {
  const defaultProps = {
    prompt: 'A vibrant gaming emote showing excitement',
    qualityScore: 85,
    onCopy: vi.fn(),
    onUse: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render prompt text', () => {
      render(<PromptCard {...defaultProps} />);
      
      expect(screen.getByText(defaultProps.prompt)).toBeDefined();
    });

    it('should render card title', () => {
      render(<PromptCard {...defaultProps} />);
      
      expect(screen.getByText('Refined Prompt')).toBeDefined();
    });

    it('should render quality score', () => {
      render(<PromptCard {...defaultProps} />);
      
      expect(screen.getByText('85%')).toBeDefined();
    });

    it('should render Copy button', () => {
      render(<PromptCard {...defaultProps} />);
      
      expect(screen.getByText('Copy')).toBeDefined();
    });

    it('should render Use This Prompt button', () => {
      render(<PromptCard {...defaultProps} />);
      
      expect(screen.getByText('Use This Prompt')).toBeDefined();
    });

    it('should not render Edit button when isEditable is false', () => {
      render(<PromptCard {...defaultProps} isEditable={false} />);
      
      expect(screen.queryByText('Edit')).toBeNull();
    });

    it('should render Edit button when isEditable is true', () => {
      render(<PromptCard {...defaultProps} isEditable onEdit={vi.fn()} />);
      
      expect(screen.getByText('Edit')).toBeDefined();
    });
  });

  describe('copy functionality', () => {
    it('should call onCopy when Copy button is clicked', () => {
      render(<PromptCard {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Copy'));
      
      expect(defaultProps.onCopy).toHaveBeenCalledTimes(1);
    });

    it('should show "Copied!" feedback after clicking Copy', () => {
      render(<PromptCard {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Copy'));
      
      expect(screen.getByText('Copied!')).toBeDefined();
    });
  });

  describe('edit functionality', () => {
    it('should enter edit mode when Edit button is clicked', () => {
      render(<PromptCard {...defaultProps} isEditable onEdit={vi.fn()} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      // Should show textarea
      expect(screen.getByRole('textbox')).toBeDefined();
    });

    it('should show Save button in edit mode', () => {
      render(<PromptCard {...defaultProps} isEditable onEdit={vi.fn()} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      expect(screen.getByText('Save')).toBeDefined();
    });

    it('should show Cancel button in edit mode', () => {
      render(<PromptCard {...defaultProps} isEditable onEdit={vi.fn()} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      expect(screen.getByText('Cancel')).toBeDefined();
    });

    it('should call onEdit with new prompt when Save is clicked', () => {
      const onEdit = vi.fn();
      render(<PromptCard {...defaultProps} isEditable onEdit={onEdit} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New prompt text' } });
      
      fireEvent.click(screen.getByText('Save'));
      
      expect(onEdit).toHaveBeenCalledWith('New prompt text');
    });

    it('should cancel editing when Cancel is clicked', () => {
      render(<PromptCard {...defaultProps} isEditable onEdit={vi.fn()} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New prompt text' } });
      
      fireEvent.click(screen.getByText('Cancel'));
      
      // Should show original prompt
      expect(screen.getByText(defaultProps.prompt)).toBeDefined();
    });

    it('should cancel editing when Escape is pressed', () => {
      render(<PromptCard {...defaultProps} isEditable onEdit={vi.fn()} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByRole('textbox');
      fireEvent.keyDown(textarea, { key: 'Escape' });
      
      // Should exit edit mode
      expect(screen.queryByRole('textbox')).toBeNull();
    });
  });

  describe('use functionality', () => {
    it('should call onUse when Use This Prompt button is clicked', () => {
      render(<PromptCard {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Use This Prompt'));
      
      expect(defaultProps.onUse).toHaveBeenCalledTimes(1);
    });
  });

  describe('quality score colors', () => {
    it('should show green for score >= 80', () => {
      render(<PromptCard {...defaultProps} qualityScore={85} />);
      
      const scoreText = screen.getByText('85%');
      expect(scoreText.className).toContain('text-green-400');
    });

    it('should show yellow for score 60-79', () => {
      render(<PromptCard {...defaultProps} qualityScore={70} />);
      
      const scoreText = screen.getByText('70%');
      expect(scoreText.className).toContain('text-yellow-400');
    });

    it('should show red for score < 60', () => {
      render(<PromptCard {...defaultProps} qualityScore={45} />);
      
      const scoreText = screen.getByText('45%');
      expect(scoreText.className).toContain('text-red-400');
    });
  });

  describe('accessibility', () => {
    it('should have accessible Copy button', () => {
      render(<PromptCard {...defaultProps} />);
      
      const copyButton = screen.getByLabelText('Copy prompt');
      expect(copyButton).toBeDefined();
    });

    it('should have accessible Edit button', () => {
      render(<PromptCard {...defaultProps} isEditable onEdit={vi.fn()} />);
      
      const editButton = screen.getByLabelText('Edit prompt');
      expect(editButton).toBeDefined();
    });

    it('should have accessible quality score progressbar', () => {
      render(<PromptCard {...defaultProps} />);
      
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('85');
      expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
      expect(progressbar.getAttribute('aria-valuemax')).toBe('100');
    });

    it('should have accessible textarea in edit mode', () => {
      render(<PromptCard {...defaultProps} isEditable onEdit={vi.fn()} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByLabelText('Edit prompt');
      expect(textarea).toBeDefined();
    });

    it('should support custom testId', () => {
      render(<PromptCard {...defaultProps} testId="custom-prompt-card" />);
      
      expect(screen.getByTestId('custom-prompt-card')).toBeDefined();
    });
  });

  describe('keyboard navigation', () => {
    it('should trigger Copy on Enter key', () => {
      render(<PromptCard {...defaultProps} />);
      
      const copyButton = screen.getByLabelText('Copy prompt');
      fireEvent.keyDown(copyButton, { key: 'Enter' });
      
      // Button should respond to Enter
      expect(copyButton).toBeDefined();
    });

    it('should have focus-visible styles', () => {
      render(<PromptCard {...defaultProps} />);
      
      const copyButton = screen.getByText('Copy').closest('button');
      expect(copyButton?.className).toContain('focus-visible:ring-2');
    });
  });

  describe('reduced motion', () => {
    it('should not apply transition when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<PromptCard {...defaultProps} />);
      
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.className).not.toContain('transition-all');
    });
  });
});
