/**
 * Tests for Coach 2025 Design Components - Unit Tests
 * Tests component exports and basic structure
 * @module coach/__tests__/components.test
 */

// Test that all components are properly exported
describe('Coach Components Exports', () => {
  it('exports all core components', () => {
    const components = require('../components');
    
    expect(components.PromptBlock).toBeDefined();
    expect(components.ValidationBadge).toBeDefined();
    expect(components.MessageBubble).toBeDefined();
    expect(components.EmptyState).toBeDefined();
    expect(components.GroundingStatus).toBeDefined();
    expect(components.ErrorBanner).toBeDefined();
  });

  it('exports all 2025 design system components', () => {
    const components = require('../components');
    
    expect(components.AnimatedText).toBeDefined();
    expect(components.GlassCard).toBeDefined();
    expect(components.PulsingDot).toBeDefined();
    expect(components.ThinkingDots).toBeDefined();
    expect(components.Skeleton).toBeDefined();
    expect(components.MessageSkeleton).toBeDefined();
    expect(components.PromptSkeleton).toBeDefined();
    expect(components.QualityMeter).toBeDefined();
    expect(components.CircularQualityMeter).toBeDefined();
  });
});

describe('Component Types', () => {
  it('AnimatedText is a function component', () => {
    const { AnimatedText } = require('../components');
    expect(typeof AnimatedText).toBe('object'); // memo wraps it
  });

  it('GlassCard is a function component', () => {
    const { GlassCard } = require('../components');
    expect(typeof GlassCard).toBe('object');
  });

  it('PulsingDot is a function component', () => {
    const { PulsingDot } = require('../components');
    expect(typeof PulsingDot).toBe('object');
  });

  it('ThinkingDots is a function component', () => {
    const { ThinkingDots } = require('../components');
    expect(typeof ThinkingDots).toBe('object');
  });

  it('Skeleton is a function component', () => {
    const { Skeleton } = require('../components');
    expect(typeof Skeleton).toBe('object');
  });

  it('QualityMeter is a function component', () => {
    const { QualityMeter } = require('../components');
    expect(typeof QualityMeter).toBe('object');
  });

  it('PromptBlock is a function component', () => {
    const { PromptBlock } = require('../components');
    expect(typeof PromptBlock).toBe('object');
  });

  it('MessageBubble is a function component', () => {
    const { MessageBubble } = require('../components');
    expect(typeof MessageBubble).toBe('object');
  });

  it('EmptyState is a function component', () => {
    const { EmptyState } = require('../components');
    expect(typeof EmptyState).toBe('object');
  });

  it('GroundingStatus is a function component', () => {
    const { GroundingStatus } = require('../components');
    expect(typeof GroundingStatus).toBe('object');
  });
});

describe('Constants', () => {
  it('exports colors from constants', () => {
    const { colors } = require('../constants');
    
    expect(colors).toBeDefined();
    expect(colors.backgroundBase).toBeDefined();
    expect(colors.textPrimary).toBeDefined();
    expect(colors.primary).toBeDefined();
    expect(colors.accent).toBeDefined();
    expect(colors.success).toBeDefined();
    expect(colors.error).toBeDefined();
  });

  it('exports API_BASE_URL from constants', () => {
    const { API_BASE_URL } = require('../constants');
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
  });
});

describe('Types', () => {
  it('exports type definitions', () => {
    // TypeScript types are compile-time only, but we can check the module loads
    expect(() => require('../types')).not.toThrow();
  });
});

describe('Hooks', () => {
  it('exports useCoachChat hook', () => {
    const hooks = require('../hooks');
    expect(hooks.useCoachChat).toBeDefined();
    expect(typeof hooks.useCoachChat).toBe('function');
  });
});

describe('Main Components', () => {
  it('exports CoachChatView', () => {
    const CoachChatView = require('../CoachChatView');
    expect(CoachChatView.default || CoachChatView.CoachChatView).toBeDefined();
  });

  it('exports CoachContextSheet', () => {
    const CoachContextSheet = require('../CoachContextSheet');
    expect(CoachContextSheet.default || CoachContextSheet.CoachContextSheet).toBeDefined();
  });
});
