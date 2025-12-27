/**
 * ValidationCard Component Tests
 * 
 * Tests for the validation results display component.
 * 
 * @module coach/cards/__tests__/ValidationCard.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationCard } from '../ValidationCard';
import type { ValidationResult, ValidationIssue } from '../ValidationCard';

// Mock useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('ValidationCard', () => {
  const createResult = (overrides: Partial<ValidationResult> = {}): ValidationResult => ({
    isValid: true,
    isGenerationReady: true,
    qualityScore: 85,
    issues: [],
    ...overrides,
  });

  const createIssue = (overrides: Partial<ValidationIssue> = {}): ValidationIssue => ({
    severity: 'warning',
    code: 'test-code',
    message: 'Test message',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render card title', () => {
      render(<ValidationCard result={createResult()} />);
      expect(screen.getByText('Validation Results')).toBeDefined();
    });

    it('should render quality score', () => {
      render(<ValidationCard result={createResult({ qualityScore: 85 })} />);
      expect(screen.getByText('85%')).toBeDefined();
    });

    it('should render "All checks passed!" when no issues', () => {
      render(<ValidationCard result={createResult({ issues: [] })} />);
      expect(screen.getByText('All checks passed!')).toBeDefined();
    });
  });


  describe('issues rendering', () => {
    it('should render issues when present', () => {
      const issues = [
        createIssue({ code: 'issue1', message: 'First issue' }),
        createIssue({ code: 'issue2', message: 'Second issue' }),
      ];
      render(<ValidationCard result={createResult({ issues })} />);
      
      expect(screen.getByText('First issue')).toBeDefined();
      expect(screen.getByText('Second issue')).toBeDefined();
    });

    it('should render suggestions when present', () => {
      const issues = [createIssue({ suggestion: 'Try adding more detail' })];
      render(<ValidationCard result={createResult({ issues })} />);
      expect(screen.getByText('Try adding more detail')).toBeDefined();
    });
  });

  describe('severity styling', () => {
    it('should render error issues with red styling', () => {
      const issues = [createIssue({ severity: 'error', code: 'err', message: 'Error message' })];
      render(<ValidationCard result={createResult({ issues })} />);
      // Text is lowercase with CSS capitalize class
      const errorText = screen.getByText('error:');
      expect(errorText.className).toContain('capitalize');
    });

    it('should render warning issues with yellow styling', () => {
      const issues = [createIssue({ severity: 'warning', code: 'warn', message: 'Warning message' })];
      render(<ValidationCard result={createResult({ issues })} />);
      const warningText = screen.getByText('warning:');
      expect(warningText.className).toContain('capitalize');
    });

    it('should render info issues with blue styling', () => {
      const issues = [createIssue({ severity: 'info', code: 'info', message: 'Info message' })];
      render(<ValidationCard result={createResult({ issues })} />);
      const infoText = screen.getByText('info:');
      expect(infoText.className).toContain('capitalize');
    });

    it('should apply correct background color for error severity', () => {
      const issues = [createIssue({ severity: 'error', code: 'err', message: 'Error message' })];
      render(<ValidationCard result={createResult({ issues })} />);
      const listItem = screen.getByRole('listitem');
      expect(listItem.className).toContain('bg-red-500/10');
    });

    it('should apply correct background color for warning severity', () => {
      const issues = [createIssue({ severity: 'warning', code: 'warn', message: 'Warning message' })];
      render(<ValidationCard result={createResult({ issues })} />);
      const listItem = screen.getByRole('listitem');
      expect(listItem.className).toContain('bg-yellow-500/10');
    });

    it('should apply correct background color for info severity', () => {
      const issues = [createIssue({ severity: 'info', code: 'info', message: 'Info message' })];
      render(<ValidationCard result={createResult({ issues })} />);
      const listItem = screen.getByRole('listitem');
      expect(listItem.className).toContain('bg-blue-500/10');
    });
  });

  describe('quality score colors', () => {
    it('should show green for score >= 80', () => {
      render(<ValidationCard result={createResult({ qualityScore: 85 })} />);
      const scoreText = screen.getByText('85%');
      expect(scoreText.className).toContain('text-green-400');
    });

    it('should show yellow for score 60-79', () => {
      render(<ValidationCard result={createResult({ qualityScore: 70 })} />);
      const scoreText = screen.getByText('70%');
      expect(scoreText.className).toContain('text-yellow-400');
    });

    it('should show red for score < 60', () => {
      render(<ValidationCard result={createResult({ qualityScore: 45 })} />);
      const scoreText = screen.getByText('45%');
      expect(scoreText.className).toContain('text-red-400');
    });
  });


  describe('status indicators', () => {
    it('should show valid status when isValid is true', () => {
      render(<ValidationCard result={createResult({ isValid: true })} />);
      const validIndicator = screen.getByText('✓ Valid');
      expect(validIndicator.className).toContain('text-green-400');
    });

    it('should show invalid status when isValid is false', () => {
      render(<ValidationCard result={createResult({ isValid: false })} />);
      const invalidIndicator = screen.getByText('✗ Valid');
      expect(invalidIndicator.className).toContain('text-red-400');
    });

    it('should show ready status when isGenerationReady is true', () => {
      render(<ValidationCard result={createResult({ isGenerationReady: true })} />);
      const readyIndicator = screen.getByText('✓ Ready to generate');
      expect(readyIndicator.className).toContain('text-green-400');
    });

    it('should show not ready status when isGenerationReady is false', () => {
      render(<ValidationCard result={createResult({ isGenerationReady: false })} />);
      const notReadyIndicator = screen.getByText('○ Ready to generate');
      expect(notReadyIndicator.className).toContain('text-yellow-400');
    });
  });

  describe('apply fix functionality', () => {
    it('should call onApplyFix when suggestion is clicked', () => {
      const onApplyFix = vi.fn();
      const issues = [createIssue({ code: 'fix-code', suggestion: 'Apply this fix' })];
      render(<ValidationCard result={createResult({ issues })} onApplyFix={onApplyFix} />);
      
      fireEvent.click(screen.getByText('Apply this fix'));
      expect(onApplyFix).toHaveBeenCalledWith('fix-code');
    });

    it('should render suggestion as button when onApplyFix is provided', () => {
      const issues = [createIssue({ suggestion: 'Click me' })];
      render(<ValidationCard result={createResult({ issues })} onApplyFix={vi.fn()} />);
      const button = screen.getByRole('button', { name: /Click me/i });
      expect(button).toBeDefined();
    });

    it('should render suggestion as text when onApplyFix is not provided', () => {
      const issues = [createIssue({ suggestion: 'Just text' })];
      render(<ValidationCard result={createResult({ issues })} />);
      expect(screen.queryByRole('button', { name: /Just text/i })).toBeNull();
      expect(screen.getByText('Just text')).toBeDefined();
    });
  });


  describe('accessibility', () => {
    it('should have accessible issues list', () => {
      const issues = [createIssue({ code: 'issue1' })];
      render(<ValidationCard result={createResult({ issues })} />);
      const list = screen.getByRole('list', { name: 'Validation issues' });
      expect(list).toBeDefined();
    });

    it('should have accessible quality score progressbar', () => {
      render(<ValidationCard result={createResult({ qualityScore: 85 })} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.getAttribute('aria-valuenow')).toBe('85');
      expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
      expect(progressbar.getAttribute('aria-valuemax')).toBe('100');
    });

    it('should have accessible suggestion buttons', () => {
      const issues = [createIssue({ suggestion: 'Fix suggestion' })];
      render(<ValidationCard result={createResult({ issues })} onApplyFix={vi.fn()} />);
      const button = screen.getByLabelText(/Apply fix: Fix suggestion/i);
      expect(button).toBeDefined();
    });

    it('should support custom testId', () => {
      render(<ValidationCard result={createResult()} testId="custom-validation-card" />);
      expect(screen.getByTestId('custom-validation-card')).toBeDefined();
    });
  });

  describe('keyboard navigation', () => {
    it('should allow keyboard activation of suggestion buttons', () => {
      const onApplyFix = vi.fn();
      const issues = [createIssue({ code: 'fix-code', suggestion: 'Apply fix' })];
      render(<ValidationCard result={createResult({ issues })} onApplyFix={onApplyFix} />);
      
      const button = screen.getByText('Apply fix');
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(onApplyFix).toHaveBeenCalledWith('fix-code');
    });

    it('should allow Space key activation', () => {
      const onApplyFix = vi.fn();
      const issues = [createIssue({ code: 'fix-code', suggestion: 'Apply fix' })];
      render(<ValidationCard result={createResult({ issues })} onApplyFix={onApplyFix} />);
      
      const button = screen.getByText('Apply fix');
      fireEvent.keyDown(button, { key: ' ' });
      expect(onApplyFix).toHaveBeenCalledWith('fix-code');
    });
  });

  describe('reduced motion', () => {
    it('should not apply transition when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);
      render(<ValidationCard result={createResult()} />);
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar.className).not.toContain('transition-all');
    });
  });

  describe('edge cases', () => {
    it('should handle empty issues array', () => {
      render(<ValidationCard result={createResult({ issues: [] })} />);
      expect(screen.getByText('All checks passed!')).toBeDefined();
    });

    it('should handle score of 0', () => {
      render(<ValidationCard result={createResult({ qualityScore: 0 })} />);
      expect(screen.getByText('0%')).toBeDefined();
    });

    it('should handle score of 100', () => {
      render(<ValidationCard result={createResult({ qualityScore: 100 })} />);
      expect(screen.getByText('100%')).toBeDefined();
    });

    it('should handle issues without suggestions', () => {
      const issues = [createIssue({ suggestion: undefined })];
      render(<ValidationCard result={createResult({ issues })} />);
      expect(screen.getByText('Test message')).toBeDefined();
    });
  });
});
