/**
 * Canvas Studio Templates Module
 * 
 * Re-exports for the template system.
 */

// Data and types
export * from './data';

// Components
export { TemplateSelector } from './TemplateSelector';
export { TemplatePreview } from './TemplatePreview';

// Engine functions
export {
  applyTemplate,
  slotToPlacement,
  placementToImageElement,
  findBestSlotForAsset,
  autoAssignAssets,
  validateTemplate,
  getTemplateStatus,
} from './TemplateEngine';
export type { SlotAssignment, AppliedTemplate } from './TemplateEngine';

// Hooks
export { useTemplates } from './useTemplates';
