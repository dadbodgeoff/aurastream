/**
 * Active Effects UI Components
 *
 * Components for displaying and managing active animation effects.
 * Provides at-a-glance visibility and quick editing capabilities.
 */

export { ActiveEffectsBar } from './ActiveEffectsBar';
export { PropertyInspector } from './PropertyInspector';

export type {
  ActiveEffectsBarProps,
  PropertyInspectorProps,
  EffectCategory,
  EffectInfo,
  EffectColor,
  EffectPropertySchema,
  PropertyDefinition,
  EffectStackItem,
  EffectStackProps,
} from './types';

export {
  extractActiveEffects,
  getCategoryInfo,
  getEffectMeta,
  getEffectPropertySchema,
  EFFECT_COLOR_CLASSES,
} from './utils';
