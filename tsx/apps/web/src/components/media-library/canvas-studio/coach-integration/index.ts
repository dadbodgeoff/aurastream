/**
 * Coach Integration Module
 * 
 * Exports for Canvas Studio → Coach workflow.
 */

// Types
export type {
  PositionDescription,
  ElementDescription,
  CanvasDescription,
  CanvasCoachContext,
  CommunityAssetInfo,
  AssetTypeInfo,
  SnapshotUploadResult,
  SendToCoachState,
} from './types';

// Asset type info
export {
  ASSET_TYPE_INFO,
  getAssetTypeInfo,
  getAssetTypeDisplayName,
} from './assetTypeInfo';

// Canvas description
export {
  getPositionDescription,
  getSizeDescription,
  describeElement,
  extractTextContent,
  generateCompositionDescription,
  generateCanvasDescription,
  formatDescriptionForApi,
} from './describeCanvas';

// Hook
export {
  useSendToCoach,
  buildCoachRequest,
} from './useSendToCoach';

// Components
export { CoachDrawer } from './CoachDrawer';
