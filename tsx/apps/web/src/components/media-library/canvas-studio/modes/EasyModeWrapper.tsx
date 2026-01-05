/**
 * Easy Mode Wrapper
 * 
 * Wraps the canvas studio content and hides/simplifies
 * advanced features when in Easy mode.
 */

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { StudioMode } from './types';

// ============================================================================
// Context
// ============================================================================

interface EasyModeContextValue {
  mode: StudioMode;
  isEasyMode: boolean;
  isProMode: boolean;
}

const EasyModeContext = createContext<EasyModeContextValue>({
  mode: 'pro',
  isEasyMode: false,
  isProMode: true,
});

export function useEasyMode() {
  return useContext(EasyModeContext);
}

// ============================================================================
// Features hidden in Easy Mode
// ============================================================================

export const EASY_MODE_HIDDEN_FEATURES = [
  'layers_panel',
  'precise_position_inputs',
  'z_index_controls',
  'opacity_slider',
  'rotation_input',
  'advanced_sketch_tools',
  'blend_modes',
  'filters',
] as const;

export const EASY_MODE_ONLY_FEATURES = [
  'drop_zones',
  'big_action_buttons',
  'preset_positions',
  'simplified_toolbar',
  'emoji_reactions',
] as const;

export type EasyModeHiddenFeature = typeof EASY_MODE_HIDDEN_FEATURES[number];
export type EasyModeOnlyFeature = typeof EASY_MODE_ONLY_FEATURES[number];

// ============================================================================
// Wrapper Component
// ============================================================================

interface EasyModeWrapperProps {
  mode: StudioMode;
  children: ReactNode;
}

export function EasyModeWrapper({ mode, children }: EasyModeWrapperProps) {
  const value: EasyModeContextValue = {
    mode,
    isEasyMode: mode === 'easy',
    isProMode: mode === 'pro',
  };
  
  return (
    <EasyModeContext.Provider value={value}>
      {children}
    </EasyModeContext.Provider>
  );
}

// ============================================================================
// Conditional Render Helpers
// ============================================================================

interface ShowInModeProps {
  mode: StudioMode | StudioMode[];
  children: ReactNode;
}

/**
 * Only render children if current mode matches
 */
export function ShowInMode({ mode, children }: ShowInModeProps) {
  const { mode: currentMode } = useEasyMode();
  const modes = Array.isArray(mode) ? mode : [mode];
  
  if (!modes.includes(currentMode)) {
    return null;
  }
  
  return <>{children}</>;
}

/**
 * Only render in Easy mode
 */
export function EasyModeOnly({ children }: { children: ReactNode }) {
  return <ShowInMode mode="easy">{children}</ShowInMode>;
}

/**
 * Only render in Pro mode
 */
export function ProModeOnly({ children }: { children: ReactNode }) {
  return <ShowInMode mode="pro">{children}</ShowInMode>;
}

/**
 * Check if a feature should be shown based on mode
 */
export function shouldShowFeature(
  feature: EasyModeHiddenFeature | EasyModeOnlyFeature,
  mode: StudioMode
): boolean {
  if (mode === 'easy') {
    // In easy mode, hide advanced features
    if ((EASY_MODE_HIDDEN_FEATURES as readonly string[]).includes(feature)) {
      return false;
    }
    return true;
  }
  
  // In pro mode, hide easy-mode-only features
  if ((EASY_MODE_ONLY_FEATURES as readonly string[]).includes(feature)) {
    return false;
  }
  return true;
}
