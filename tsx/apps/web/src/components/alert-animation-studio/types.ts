/**
 * Alert Animation Studio Component Types
 */

import type {
  AnimationConfig,
  AnimationPreset,
  AnimationSuggestion,
  EntryAnimation,
  LoopAnimation,
  DepthEffect,
  ParticleEffect,
} from '@aurastream/api-client';

export interface AlertAnimationStudioProps {
  isOpen: boolean;
  onClose: () => void;
  sourceAsset: {
    id: string;
    url: string;
    name: string;
  };
}

export interface AnimationCanvasProps {
  sourceUrl: string;
  depthMapUrl: string | null;
  config: AnimationConfig;
  onReady?: () => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export interface PresetSelectorProps {
  config: AnimationConfig;
  onChange: (config: AnimationConfig) => void;
  suggestion?: AnimationSuggestion | null;
  onApplySuggestion?: (suggestion: AnimationSuggestion) => void;
}

export interface PresetCategoryProps {
  title: string;
  icon: string;
  presets: AnimationPreset[];
  selectedType: string | null;
  onSelect: (preset: AnimationPreset | null) => void;
}

export interface TimelineControlsProps {
  isPlaying: boolean;
  currentTime: number;
  durationMs: number;
  onPlayPause: () => void;
  onReset: () => void;
  onSeek: (timeMs: number) => void;
}

export interface ExportPanelProps {
  projectId: string;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  config: AnimationConfig;
  onExportStart?: () => void;
  onExportComplete?: (url: string) => void;
  onExportError?: (error: Error) => void;
}

export interface ParticleSystemProps {
  config: ParticleEffect;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  entry: null,
  loop: null,
  depthEffect: null,
  particles: null,
  durationMs: 3000,
  loopCount: 1,
};
