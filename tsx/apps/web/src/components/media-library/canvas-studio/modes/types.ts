/**
 * Studio Mode Types
 */

export type StudioMode = 'easy' | 'pro';

export const MODE_LABELS: Record<StudioMode, string> = {
  easy: 'Easy Mode',
  pro: 'Pro Mode',
};

export const MODE_DESCRIPTIONS: Record<StudioMode, string> = {
  easy: 'Simplified tools, guided experience',
  pro: 'Full control, advanced features',
};
