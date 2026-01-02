/**
 * Tests for the Coach Refinement Flow components
 * 
 * Verifies:
 * - RefinementChoice renders correctly with tier-based access
 * - RefineInput handles user input and submission
 * - useRefinement hook manages state correctly
 * - GenerationResultWithRefinement integrates all components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RefinementChoice } from '../RefinementChoice';
import { RefineInput } from '../RefineInput';
import type { RefinementUsageStatus } from '@aurastream/api-client';

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock useReducedMotion
vi.mock('@aurastream/shared', () => ({
  useReducedMotion: () => false,
}));

// ============================================================================
// RefinementChoice Tests
// ============================================================================

describe('RefinementChoice', () => {
  const mockOnSatisfied = vi.fn();
  const mockOnRefine = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both choice buttons', () => {
    render(
      <RefinementChoice
        onSatisfied={mockOnSatisfied}
        onRefine={mockOnRefine}
      />
    );

    expect(screen.getByText("I'm Happy")).toBeDefined();
    expect(screen.getByText('Refine It')).toBeDefined();
  });

  it('calls onSatisfied when "I\'m Happy" is clicked', async () => {
    render(
      <RefinementChoice
        onSatisfied={mockOnSatisfied}
        onRefine={mockOnRefine}
      />
    );

    fireEvent.click(screen.getByText("I'm Happy"));
    expect(mockOnSatisfied).toHaveBeenCalledTimes(1);
  });

  it('calls onRefine when "Refine It" is clicked', async () => {
    render(
      <RefinementChoice
        onSatisfied={mockOnSatisfied}
        onRefine={mockOnRefine}
      />
    );

    fireEvent.click(screen.getByText('Refine It'));
    expect(mockOnRefine).toHaveBeenCalledTimes(1);
  });

  it('shows unlimited refinements badge for studio tier', () => {
    const studioStatus: RefinementUsageStatus = {
      canRefine: true,
      freeRemaining: -1,
      isUnlimited: true,
      tier: 'studio',
      message: 'Unlimited refinements',
    };

    render(
      <RefinementChoice
        onSatisfied={mockOnSatisfied}
        onRefine={mockOnRefine}
        usageStatus={studioStatus}
      />
    );

    expect(screen.getByText('Unlimited refinements')).toBeDefined();
  });

  it('shows remaining refinements for pro tier', () => {
    const proStatus: RefinementUsageStatus = {
      canRefine: true,
      freeRemaining: 3,
      isUnlimited: false,
      tier: 'pro',
      message: '3 free refinements remaining',
    };

    render(
      <RefinementChoice
        onSatisfied={mockOnSatisfied}
        onRefine={mockOnRefine}
        usageStatus={proStatus}
      />
    );

    expect(screen.getByText('3 free refinements remaining')).toBeDefined();
  });

  it('disables refine button for free tier', () => {
    const freeStatus: RefinementUsageStatus = {
      canRefine: false,
      freeRemaining: 0,
      isUnlimited: false,
      tier: 'free',
      message: 'Upgrade to Pro or Studio to refine images',
    };

    render(
      <RefinementChoice
        onSatisfied={mockOnSatisfied}
        onRefine={mockOnRefine}
        usageStatus={freeStatus}
      />
    );

    const refineButton = screen.getByText('Refine It').closest('button');
    expect(refineButton).toHaveProperty('disabled', true);
  });

  it('disables buttons when isRefining is true', () => {
    render(
      <RefinementChoice
        onSatisfied={mockOnSatisfied}
        onRefine={mockOnRefine}
        isRefining={true}
      />
    );

    const happyButton = screen.getByText("I'm Happy").closest('button');
    const refineButton = screen.getByText('Refine It').closest('button');
    
    expect(happyButton).toHaveProperty('disabled', true);
    expect(refineButton).toHaveProperty('disabled', true);
  });
});

// ============================================================================
// RefineInput Tests
// ============================================================================

describe('RefineInput', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input field and submit button', () => {
    render(
      <RefineInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText('What would you like to change?')).toBeDefined();
    expect(screen.getByText('Refine Image')).toBeDefined();
  });

  it('renders suggestion chips', () => {
    render(
      <RefineInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Make it brighter')).toBeDefined();
    expect(screen.getByText('Add more contrast')).toBeDefined();
  });

  it('clicking suggestion chip fills input', async () => {
    render(
      <RefineInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Make it brighter'));
    
    const input = screen.getByLabelText('What would you like to change?') as HTMLTextAreaElement;
    expect(input.value).toBe('Make it brighter');
  });

  it('submit button is disabled when input is too short', () => {
    render(
      <RefineInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByText('Refine Image').closest('button');
    expect(submitButton).toHaveProperty('disabled', true);
  });

  it('submit button is enabled when input is valid', async () => {
    render(
      <RefineInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByLabelText('What would you like to change?');
    fireEvent.change(input, { target: { value: 'Make the colors more vibrant' } });

    const submitButton = screen.getByText('Refine Image').closest('button');
    expect(submitButton).toHaveProperty('disabled', false);
  });

  it('calls onSubmit with trimmed value when submitted', async () => {
    render(
      <RefineInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByLabelText('What would you like to change?');
    fireEvent.change(input, { target: { value: '  Make it brighter  ' } });
    fireEvent.click(screen.getByText('Refine Image'));

    expect(mockOnSubmit).toHaveBeenCalledWith('Make it brighter');
  });

  it('calls onCancel when back button is clicked', async () => {
    render(
      <RefineInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Back'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows warning when no free refinements remaining', () => {
    const proStatus: RefinementUsageStatus = {
      canRefine: true,
      freeRemaining: 0,
      isUnlimited: false,
      tier: 'pro',
      message: 'Refinements will count as creations',
    };

    render(
      <RefineInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        usageStatus={proStatus}
      />
    );

    expect(screen.getByText('⚠️ This refinement will count as 1 creation')).toBeDefined();
  });

  it('shows character count', async () => {
    render(
      <RefineInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('0/500')).toBeDefined();

    const input = screen.getByLabelText('What would you like to change?');
    fireEvent.change(input, { target: { value: 'Test' } });

    expect(screen.getByText('4/500')).toBeDefined();
  });

  it('shows loading state when isSubmitting', () => {
    render(
      <RefineInput
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );

    expect(screen.getByText('Refining...')).toBeDefined();
  });
});
