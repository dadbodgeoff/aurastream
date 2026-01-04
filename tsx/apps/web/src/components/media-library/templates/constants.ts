/**
 * Built-in Canvas Templates
 * 
 * Pre-made layouts for common compositions.
 */

import type { CanvasTemplate } from './types';

/**
 * Built-in templates for thumbnails
 */
export const THUMBNAIL_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'gaming-victory',
    name: 'Victory Moment',
    description: 'Perfect for win screens and clutch plays',
    category: 'gaming',
    thumbnail: '/templates/gaming-victory.png',
    targetAssetType: 'thumbnail',
    slots: [
      {
        id: 'face',
        label: 'Your Reaction',
        acceptedTypes: ['face'],
        position: { x: 70, y: 55 },
        size: { width: 35, height: 45 },
        zIndex: 2,
        required: true,
        placeholder: '/templates/placeholders/face.svg',
      },
      {
        id: 'logo',
        label: 'Channel Logo',
        acceptedTypes: ['logo'],
        position: { x: 5, y: 5 },
        size: { width: 12, height: 12 },
        zIndex: 3,
        required: false,
        placeholder: '/templates/placeholders/logo.svg',
      },
    ],
    decorations: [
      {
        id: 'arrow-1',
        type: 'arrow',
        startX: 25,
        startY: 50,
        endX: 60,
        endY: 52,
        color: '#EAB308',
        strokeWidth: 6,
        opacity: 100,
        zIndex: 1,
      },
    ],
    regions: [
      { id: 'r1', x: 5, y: 70, width: 50, height: 25, label: 'game action', color: '#3B82F6' },
    ],
    promptHints: ['victory', 'celebration', 'winning moment', 'epic'],
  },

  {
    id: 'reaction-shocked',
    name: 'Shocked Reaction',
    description: 'Big reaction face with dramatic framing',
    category: 'reaction',
    thumbnail: '/templates/reaction-shocked.png',
    targetAssetType: 'thumbnail',
    slots: [
      {
        id: 'face',
        label: 'Your Face',
        acceptedTypes: ['face'],
        position: { x: 25, y: 25 },
        size: { width: 50, height: 55 },
        zIndex: 2,
        required: true,
        placeholder: '/templates/placeholders/face-large.svg',
      },
    ],
    decorations: [
      {
        id: 'text-1',
        type: 'text',
        x: 78,
        y: 18,
        text: '!?',
        fontSize: 48,
        fontFamily: 'Impact, sans-serif',
        color: '#EF4444',
        strokeWidth: 0,
        opacity: 100,
        zIndex: 3,
      },
    ],
    regions: [],
    promptHints: ['shocked', 'surprised', 'dramatic reaction', 'omg'],
  },
  {
    id: 'minimal-clean',
    name: 'Clean & Simple',
    description: 'Minimalist layout with logo focus',
    category: 'minimal',
    thumbnail: '/templates/minimal-clean.png',
    targetAssetType: 'thumbnail',
    slots: [
      {
        id: 'logo',
        label: 'Logo',
        acceptedTypes: ['logo'],
        position: { x: 35, y: 35 },
        size: { width: 30, height: 30 },
        zIndex: 2,
        required: true,
        placeholder: '/templates/placeholders/logo-center.svg',
      },
    ],
    decorations: [],
    regions: [
      { id: 'r1', x: 10, y: 75, width: 80, height: 15, label: 'title text', color: '#FFFFFF' },
    ],
    promptHints: ['clean', 'minimal', 'professional', 'simple'],
  },
  {
    id: 'tutorial-split',
    name: 'Tutorial Split',
    description: 'Before/after or step-by-step layout',
    category: 'tutorial',
    thumbnail: '/templates/tutorial-split.png',
    targetAssetType: 'thumbnail',
    slots: [
      {
        id: 'face',
        label: 'Your Face',
        acceptedTypes: ['face'],
        position: { x: 75, y: 50 },
        size: { width: 25, height: 35 },
        zIndex: 2,
        required: false,
        placeholder: '/templates/placeholders/face-small.svg',
      },
    ],
    decorations: [
      {
        id: 'line-1',
        type: 'line',
        startX: 50,
        startY: 10,
        endX: 50,
        endY: 90,
        color: '#FFFFFF',
        strokeWidth: 3,
        opacity: 80,
        zIndex: 1,
      },
    ],
    regions: [
      { id: 'r1', x: 5, y: 20, width: 40, height: 60, label: 'before / step 1', color: '#EF4444' },
      { id: 'r2', x: 55, y: 20, width: 40, height: 60, label: 'after / step 2', color: '#22C55E' },
    ],
    promptHints: ['tutorial', 'how-to', 'before after', 'comparison'],
  },

  {
    id: 'dramatic-spotlight',
    name: 'Spotlight Drama',
    description: 'High-impact dramatic lighting effect',
    category: 'dramatic',
    thumbnail: '/templates/dramatic-spotlight.png',
    targetAssetType: 'thumbnail',
    slots: [
      {
        id: 'face',
        label: 'Your Face',
        acceptedTypes: ['face'],
        position: { x: 50, y: 45 },
        size: { width: 40, height: 50 },
        zIndex: 2,
        required: true,
        placeholder: '/templates/placeholders/face-center.svg',
      },
      {
        id: 'logo',
        label: 'Logo',
        acceptedTypes: ['logo'],
        position: { x: 85, y: 85 },
        size: { width: 10, height: 10 },
        zIndex: 3,
        required: false,
        placeholder: '/templates/placeholders/logo-small.svg',
      },
    ],
    decorations: [],
    regions: [
      { id: 'r1', x: 0, y: 0, width: 100, height: 100, label: 'dramatic lighting, spotlight effect', color: '#A855F7' },
    ],
    promptHints: ['dramatic', 'spotlight', 'cinematic', 'intense'],
  },
  {
    id: 'vlog-casual',
    name: 'Casual Vlog',
    description: 'Friendly, approachable vlog style',
    category: 'vlog',
    thumbnail: '/templates/vlog-casual.png',
    targetAssetType: 'thumbnail',
    slots: [
      {
        id: 'face',
        label: 'Your Face',
        acceptedTypes: ['face'],
        position: { x: 65, y: 50 },
        size: { width: 35, height: 45 },
        zIndex: 2,
        required: true,
        placeholder: '/templates/placeholders/face.svg',
      },
    ],
    decorations: [
      {
        id: 'text-1',
        type: 'text',
        x: 8,
        y: 25,
        text: '📍',
        fontSize: 32,
        fontFamily: 'system-ui, sans-serif',
        color: '#FFFFFF',
        strokeWidth: 0,
        opacity: 100,
        zIndex: 3,
      },
    ],
    regions: [
      { id: 'r1', x: 5, y: 30, width: 45, height: 40, label: 'topic / location', color: '#F97316' },
    ],
    promptHints: ['vlog', 'casual', 'friendly', 'lifestyle'],
  },
];

/**
 * All built-in templates
 */
export const BUILT_IN_TEMPLATES: CanvasTemplate[] = [
  ...THUMBNAIL_TEMPLATES,
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): CanvasTemplate[] {
  return BUILT_IN_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates for a specific asset type
 */
export function getTemplatesForAssetType(assetType: string): CanvasTemplate[] {
  return BUILT_IN_TEMPLATES.filter(t => t.targetAssetType === assetType);
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): CanvasTemplate | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.id === id);
}

/**
 * Template category metadata
 */
export const TEMPLATE_CATEGORIES = [
  { id: 'gaming', label: 'Gaming', emoji: '🎮', description: 'For gaming content' },
  { id: 'reaction', label: 'Reaction', emoji: '😱', description: 'Big reactions' },
  { id: 'tutorial', label: 'Tutorial', emoji: '📚', description: 'How-to content' },
  { id: 'vlog', label: 'Vlog', emoji: '📹', description: 'Personal content' },
  { id: 'minimal', label: 'Minimal', emoji: '✨', description: 'Clean & simple' },
  { id: 'dramatic', label: 'Dramatic', emoji: '🎬', description: 'High impact' },
] as const;
