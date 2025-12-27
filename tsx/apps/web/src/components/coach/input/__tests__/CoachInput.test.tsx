/**
 * CoachInput Component Tests
 * 
 * Tests for the enhanced input area component.
 * 
 * @module coach/input/__tests__/CoachInput.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoachInput } from '../CoachInput';
import type { Suggestion } from '../useSuggestionContext';

// Mock useReducedMotion hook
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('CoachInput', () => {
  const defaultSuggestions: Suggestion[] = [
    { id: 'hype', label: 'Hype energy', action: 'I want hype energy' },
    { id: 'cozy', label: 'Cozy vibes', action: 'I want cozy vibes' },
  ];

  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onSend: vi.fn(),
    onSuggestionSelect: vi.fn(),
    suggestions: defaultSuggestions,
    isStreaming: false,
    isGenerationReady: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the input component', () => {
      render(<CoachInput {...defaultProps} />);

      expect(screen.getByTestId('coach-input')).toBeDefined();
    });

    it('should render textarea', () => {
      render(<CoachInput {...defaultProps} />);

      expect(screen.getByTestId('coach-input-textarea')).toBeDefined();
    });

    it('should render send button', () => {
      render(<CoachInput {...defaultProps} />);

      expect(screen.getByTestId('coach-input-send-button')).toBeDefined();
    });

    it('should render suggestion chips', () => {
      render(<CoachInput {...defaultProps} />);

      expect(screen.getByText('Hype energy')).toBeDefined();
      expect(screen.getByText('Cozy vibes')).toBeDefined();
    });

    it('should not render suggestion chips when empty', () => {
      render(<CoachInput {...defaultProps} suggestions={[]} />);

      expect(screen.queryByTestId('coach-input-chips')).toBeNull();
    });

    it('should render helper text', () => {
      render(<CoachInput {...defaultProps} />);

      expect(
        screen.getByText('Press Enter to send, Shift+Enter for new line')
      ).toBeDefined();
    });

    it('should render with custom testId', () => {
      render(<CoachInput {...defaultProps} testId="custom-input" />);

      expect(screen.getByTestId('custom-input')).toBeDefined();
    });
  });

  describe('Generate Now button', () => {
    it('should not render Generate Now button when not ready', () => {
      render(<CoachInput {...defaultProps} isGenerationReady={false} />);

      expect(screen.queryByTestId('generate-now-button')).toBeNull();
    });

    it('should render Generate Now button when ready', () => {
      render(
        <CoachInput
          {...defaultProps}
          isGenerationReady={true}
          onGenerateNow={vi.fn()}
        />
      );

      expect(screen.getByTestId('generate-now-button')).toBeDefined();
      expect(screen.getByText(/Generate Now/)).toBeDefined();
    });

    it('should not render Generate Now button when streaming', () => {
      render(
        <CoachInput
          {...defaultProps}
          isGenerationReady={true}
          isStreaming={true}
          onGenerateNow={vi.fn()}
        />
      );

      expect(screen.queryByTestId('generate-now-button')).toBeNull();
    });

    it('should not render Generate Now button without onGenerateNow callback', () => {
      render(<CoachInput {...defaultProps} isGenerationReady={true} />);

      expect(screen.queryByTestId('generate-now-button')).toBeNull();
    });

    it('should call onGenerateNow when clicked', () => {
      const onGenerateNow = vi.fn();
      render(
        <CoachInput
          {...defaultProps}
          isGenerationReady={true}
          onGenerateNow={onGenerateNow}
        />
      );

      fireEvent.click(screen.getByTestId('generate-now-button'));

      expect(onGenerateNow).toHaveBeenCalled();
    });
  });

  describe('input functionality', () => {
    it('should call onChange when typing', () => {
      const onChange = vi.fn();
      render(<CoachInput {...defaultProps} onChange={onChange} />);

      const textarea = screen.getByTestId('coach-input-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      expect(onChange).toHaveBeenCalledWith('Hello');
    });

    it('should display current value', () => {
      render(<CoachInput {...defaultProps} value="Test value" />);

      const textarea = screen.getByTestId('coach-input-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Test value');
    });

    it('should show custom placeholder', () => {
      render(<CoachInput {...defaultProps} placeholder="Custom placeholder" />);

      const textarea = screen.getByTestId('coach-input-textarea');
      expect(textarea.getAttribute('placeholder')).toBe('Custom placeholder');
    });

    it('should show streaming placeholder when streaming', () => {
      render(<CoachInput {...defaultProps} isStreaming={true} />);

      const textarea = screen.getByTestId('coach-input-textarea');
      expect(textarea.getAttribute('placeholder')).toBe('Waiting for response...');
    });

    it('should be disabled when streaming', () => {
      render(<CoachInput {...defaultProps} isStreaming={true} />);

      const textarea = screen.getByTestId('coach-input-textarea');
      expect(textarea).toHaveProperty('disabled', true);
    });
  });

  describe('send functionality', () => {
    it('should call onSend when send button is clicked with value', () => {
      const onSend = vi.fn();
      render(<CoachInput {...defaultProps} value="Hello" onSend={onSend} />);

      fireEvent.click(screen.getByTestId('coach-input-send-button'));

      expect(onSend).toHaveBeenCalled();
    });

    it('should not call onSend when value is empty', () => {
      const onSend = vi.fn();
      render(<CoachInput {...defaultProps} value="" onSend={onSend} />);

      fireEvent.click(screen.getByTestId('coach-input-send-button'));

      expect(onSend).not.toHaveBeenCalled();
    });

    it('should not call onSend when value is only whitespace', () => {
      const onSend = vi.fn();
      render(<CoachInput {...defaultProps} value="   " onSend={onSend} />);

      fireEvent.click(screen.getByTestId('coach-input-send-button'));

      expect(onSend).not.toHaveBeenCalled();
    });

    it('should not call onSend when streaming', () => {
      const onSend = vi.fn();
      render(
        <CoachInput {...defaultProps} value="Hello" onSend={onSend} isStreaming={true} />
      );

      fireEvent.click(screen.getByTestId('coach-input-send-button'));

      expect(onSend).not.toHaveBeenCalled();
    });

    it('should disable send button when empty', () => {
      render(<CoachInput {...defaultProps} value="" />);

      const button = screen.getByTestId('coach-input-send-button');
      expect(button).toHaveProperty('disabled', true);
    });

    it('should disable send button when streaming', () => {
      render(<CoachInput {...defaultProps} value="Hello" isStreaming={true} />);

      const button = screen.getByTestId('coach-input-send-button');
      expect(button).toHaveProperty('disabled', true);
    });
  });

  describe('keyboard navigation', () => {
    it('should call onSend on Enter key with value', () => {
      const onSend = vi.fn();
      render(<CoachInput {...defaultProps} value="Hello" onSend={onSend} />);

      const textarea = screen.getByTestId('coach-input-textarea');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSend).toHaveBeenCalled();
    });

    it('should not call onSend on Shift+Enter', () => {
      const onSend = vi.fn();
      render(<CoachInput {...defaultProps} value="Hello" onSend={onSend} />);

      const textarea = screen.getByTestId('coach-input-textarea');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(onSend).not.toHaveBeenCalled();
    });

    it('should not call onSend on Enter when empty', () => {
      const onSend = vi.fn();
      render(<CoachInput {...defaultProps} value="" onSend={onSend} />);

      const textarea = screen.getByTestId('coach-input-textarea');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSend).not.toHaveBeenCalled();
    });

    it('should not call onSend on Enter when streaming', () => {
      const onSend = vi.fn();
      render(
        <CoachInput {...defaultProps} value="Hello" onSend={onSend} isStreaming={true} />
      );

      const textarea = screen.getByTestId('coach-input-textarea');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('suggestion selection', () => {
    it('should call onSuggestionSelect when chip is clicked', () => {
      const onSuggestionSelect = vi.fn();
      render(
        <CoachInput {...defaultProps} onSuggestionSelect={onSuggestionSelect} />
      );

      fireEvent.click(screen.getByText('Hype energy'));

      expect(onSuggestionSelect).toHaveBeenCalledWith('I want hype energy');
    });

    it('should disable chips when streaming', () => {
      render(<CoachInput {...defaultProps} isStreaming={true} />);

      const chip = screen.getByText('Hype energy');
      expect(chip).toHaveProperty('disabled', true);
    });
  });

  describe('character count', () => {
    it('should not show character count by default', () => {
      render(<CoachInput {...defaultProps} value="Hello" />);

      expect(screen.queryByText('5')).toBeNull();
    });

    it('should show character count when enabled', () => {
      render(
        <CoachInput {...defaultProps} value="Hello" showCharacterCount={true} />
      );

      expect(screen.getByText('5')).toBeDefined();
    });

    it('should show character count with max when provided', () => {
      render(
        <CoachInput
          {...defaultProps}
          value="Hello"
          showCharacterCount={true}
          maxLength={100}
        />
      );

      expect(screen.getByText('5/100')).toBeDefined();
    });

    it('should respect maxLength', () => {
      const onChange = vi.fn();
      render(
        <CoachInput {...defaultProps} onChange={onChange} maxLength={5} />
      );

      const textarea = screen.getByTestId('coach-input-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello World' } });

      // Should not call onChange because value exceeds maxLength
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on textarea', () => {
      render(<CoachInput {...defaultProps} />);

      const textarea = screen.getByTestId('coach-input-textarea');
      expect(textarea.getAttribute('aria-label')).toBe('Message input');
    });

    it('should have aria-label on send button', () => {
      render(<CoachInput {...defaultProps} />);

      const button = screen.getByTestId('coach-input-send-button');
      expect(button.getAttribute('aria-label')).toBe('Send message');
    });

    it('should have aria-label on send button when streaming', () => {
      render(<CoachInput {...defaultProps} isStreaming={true} />);

      const button = screen.getByTestId('coach-input-send-button');
      expect(button.getAttribute('aria-label')).toBe('Sending...');
    });

    it('should have aria-label on Generate Now button', () => {
      render(
        <CoachInput
          {...defaultProps}
          isGenerationReady={true}
          onGenerateNow={vi.fn()}
        />
      );

      const button = screen.getByTestId('generate-now-button');
      expect(button.getAttribute('aria-label')).toBe('Generate asset now');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<CoachInput {...defaultProps} className="custom-class" />);

      const container = screen.getByTestId('coach-input');
      expect(container.className).toContain('custom-class');
    });

    it('should have border-t styling', () => {
      render(<CoachInput {...defaultProps} />);

      const container = screen.getByTestId('coach-input');
      expect(container.className).toContain('border-t');
    });

    it('should have rounded-xl on textarea', () => {
      render(<CoachInput {...defaultProps} />);

      const textarea = screen.getByTestId('coach-input-textarea');
      expect(textarea.className).toContain('rounded-xl');
    });

    it('should have rounded-full on send button', () => {
      render(<CoachInput {...defaultProps} />);

      const button = screen.getByTestId('coach-input-send-button');
      expect(button.className).toContain('rounded-full');
    });
  });

  describe('reduced motion', () => {
    it('should not apply transition when reduced motion is preferred', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(true);

      render(<CoachInput {...defaultProps} />);

      const textarea = screen.getByTestId('coach-input-textarea');
      expect(textarea.className).not.toContain('transition-colors');
    });

    it('should apply transition classes when motion is allowed', async () => {
      const { useReducedMotion } = await import('@aurastream/shared');
      vi.mocked(useReducedMotion).mockReturnValue(false);

      render(<CoachInput {...defaultProps} />);

      const textarea = screen.getByTestId('coach-input-textarea');
      expect(textarea.className).toContain('transition-colors');
    });
  });

  describe('edge cases', () => {
    it('should handle empty suggestions array', () => {
      render(<CoachInput {...defaultProps} suggestions={[]} />);

      expect(screen.getByTestId('coach-input')).toBeDefined();
      expect(screen.queryByTestId('coach-input-chips')).toBeNull();
    });

    it('should handle very long input value', () => {
      const longValue = 'a'.repeat(1000);
      render(<CoachInput {...defaultProps} value={longValue} />);

      const textarea = screen.getByTestId('coach-input-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(longValue);
    });

    it('should handle special characters in value', () => {
      const specialValue = '<script>alert("xss")</script>';
      render(<CoachInput {...defaultProps} value={specialValue} />);

      const textarea = screen.getByTestId('coach-input-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe(specialValue);
    });
  });
});
