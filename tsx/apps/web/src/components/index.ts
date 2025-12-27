// Streamer Studio Web Components
// Re-export all components for easy imports

export { ProtectedRoute, withProtectedRoute, useProtectedRoute } from './ProtectedRoute';

// Landing page components
export * from './landing';

// Generation components
export {
  BrandCustomizationPanel,
  type ColorPalette,
  type Typography,
  type BrandVoice,
  type BrandCustomization,
  type BrandCustomizationPanelProps,
} from './generation/BrandCustomizationPanel';

// Coach components
export { CoachContextForm, type CoachContextFormProps } from './coach/CoachContextForm';
export { CoachChat, type CoachChatProps } from './coach/CoachChat';
export { CoachMessage, type CoachMessageProps } from './coach/CoachMessage';
