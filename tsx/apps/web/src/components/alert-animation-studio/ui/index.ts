/**
 * Animation Studio V2 - UI Components
 *
 * Comprehensive UI component library for the Alert Animation Studio.
 * Includes timeline editing, audio visualization, and export controls.
 *
 * @module ui
 */

// ============================================================================
// Timeline Components
// ============================================================================

export {
  TimelinePanel,
  Track,
  Keyframe,
  Playhead,
  CurveEditor,
  PropertyList,
} from './timeline';

export type {
  TimelinePanelProps,
  TrackProps,
  KeyframeProps,
  PlayheadProps,
  CurveEditorProps,
  PropertyListProps,
} from './timeline';

// ============================================================================
// Audio Components
// ============================================================================

export {
  AudioUploader,
  WaveformDisplay,
  FrequencyBands,
  FrequencyBandsCompact,
  BeatMarkers,
  BeatCounter,
  ReactivityMapper,
} from './audio';

export type {
  AudioUploaderProps,
  AudioFileInfo,
  WaveformDisplayProps,
  FrequencyBandsProps,
  FrequencyBandsCompactProps,
  BeatMarkersProps,
  BeatCounterProps,
  ReactivityMapperProps,
} from './audio';

// ============================================================================
// Export Components
// ============================================================================

export {
  ExportPanel,
  OBSInstructions,
  VideoExportUI,
} from './export';

export type {
  ExportPanelProps,
  ExportOptions,
  OBSInstructionsProps,
  VideoExportUIProps,
  VideoExportConfig,
} from './export';
