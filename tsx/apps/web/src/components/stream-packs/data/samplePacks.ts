/**
 * Sample Stream Packs
 * 
 * Initial pack templates for the gallery.
 * These will eventually come from the backend/database.
 */

import type { StreamPack, ColorScheme } from '../types';

const NOIR_DETECTIVE_COLORS: ColorScheme = {
  id: 'noir-detective',
  name: 'Noir Detective',
  primary: '#F97316', // Orange
  secondary: '#3B82F6', // Blue
  accent: '#06B6D4', // Cyan
  preview: ['#F97316', '#3B82F6', '#06B6D4'],
};

const NEON_CYBER_COLORS: ColorScheme = {
  id: 'neon-cyber',
  name: 'Neon Cyber',
  primary: '#EC4899', // Pink
  secondary: '#8B5CF6', // Purple
  accent: '#06B6D4', // Cyan
  preview: ['#EC4899', '#8B5CF6', '#06B6D4'],
};

const FOREST_COZY_COLORS: ColorScheme = {
  id: 'forest-cozy',
  name: 'Forest Cozy',
  primary: '#22C55E', // Green
  secondary: '#84CC16', // Lime
  accent: '#F59E0B', // Amber
  preview: ['#22C55E', '#84CC16', '#F59E0B'],
};

export const SAMPLE_PACKS: StreamPack[] = [
  {
    id: 'noir-detective',
    name: 'Noir Detective',
    description: 'Mysterious detective vibes with a retro muscle car and neon city backdrop',
    themeDescription: 'A noir detective character in a fedora and trench coat, driving a vintage orange muscle car through a neon-lit cyberpunk city at night. Style is cartoon/illustration with bold outlines, vibrant orange and blue color scheme, moody atmosphere with city skyline and moon.',
    category: 'gaming',
    thumbnailUrl: '/packs/noir-detective/thumbnail.png',
    assets: [
      { type: 'starting_soon', label: 'Starting Soon', previewUrl: '/packs/noir-detective/starting-soon.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'be_right_back', label: 'Be Right Back', previewUrl: '/packs/noir-detective/brb.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'offline', label: 'Offline', previewUrl: '/packs/noir-detective/offline.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'webcam_overlay', label: 'Webcam Overlay', previewUrl: '/packs/noir-detective/webcam.png', dimensions: { width: 1920, height: 1080 } },
    ],
    originalColors: NOIR_DETECTIVE_COLORS,
    tags: ['detective', 'noir', 'retro', 'car', 'city', 'night', 'neon'],
    isPremium: false,
    usageCount: 1247,
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyberpunk',
    description: 'Futuristic cyberpunk aesthetic with glowing neon and holographic elements',
    themeDescription: 'A futuristic cyberpunk scene with glowing neon signs, holographic displays, and a high-tech urban environment. Pink, purple, and cyan color palette with strong contrast and glow effects. Anime-inspired illustration style.',
    category: 'gaming',
    thumbnailUrl: '/packs/neon-cyber/thumbnail.png',
    assets: [
      { type: 'starting_soon', label: 'Starting Soon', previewUrl: '/packs/neon-cyber/starting-soon.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'be_right_back', label: 'Be Right Back', previewUrl: '/packs/neon-cyber/brb.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'offline', label: 'Offline', previewUrl: '/packs/neon-cyber/offline.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'webcam_overlay', label: 'Webcam Overlay', previewUrl: '/packs/neon-cyber/webcam.png', dimensions: { width: 1920, height: 1080 } },
    ],
    originalColors: NEON_CYBER_COLORS,
    tags: ['cyberpunk', 'neon', 'futuristic', 'anime', 'tech', 'glow'],
    isPremium: false,
    usageCount: 892,
  },
  {
    id: 'cozy-forest',
    name: 'Cozy Forest',
    description: 'Relaxing woodland scene with cute animals and warm lighting',
    themeDescription: 'A cozy forest scene with warm lighting, cute woodland animals, mushrooms, and a treehouse. Soft, warm color palette with greens, browns, and golden accents. Whimsical illustration style perfect for chill streams.',
    category: 'irl',
    thumbnailUrl: '/packs/cozy-forest/thumbnail.png',
    assets: [
      { type: 'starting_soon', label: 'Starting Soon', previewUrl: '/packs/cozy-forest/starting-soon.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'be_right_back', label: 'Be Right Back', previewUrl: '/packs/cozy-forest/brb.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'offline', label: 'Offline', previewUrl: '/packs/cozy-forest/offline.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'webcam_overlay', label: 'Webcam Overlay', previewUrl: '/packs/cozy-forest/webcam.png', dimensions: { width: 1920, height: 1080 } },
    ],
    originalColors: FOREST_COZY_COLORS,
    tags: ['cozy', 'forest', 'nature', 'cute', 'relaxing', 'chill'],
    isPremium: false,
    usageCount: 2103,
  },
  {
    id: 'minimal-dark',
    name: 'Minimal Dark',
    description: 'Clean, professional dark theme with subtle gradients',
    themeDescription: 'A minimal, professional stream overlay with dark backgrounds, subtle gradients, and clean typography. Modern and sleek design that does not distract from content. Monochromatic with accent color highlights.',
    category: 'minimal',
    thumbnailUrl: '/packs/minimal-dark/thumbnail.png',
    assets: [
      { type: 'starting_soon', label: 'Starting Soon', previewUrl: '/packs/minimal-dark/starting-soon.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'be_right_back', label: 'Be Right Back', previewUrl: '/packs/minimal-dark/brb.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'offline', label: 'Offline', previewUrl: '/packs/minimal-dark/offline.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'webcam_overlay', label: 'Webcam Overlay', previewUrl: '/packs/minimal-dark/webcam.png', dimensions: { width: 1920, height: 1080 } },
    ],
    originalColors: { id: 'minimal', name: 'Minimal', primary: '#6366F1', secondary: '#1F2937', accent: '#8B5CF6', preview: ['#6366F1', '#1F2937'] },
    tags: ['minimal', 'dark', 'professional', 'clean', 'modern'],
    isPremium: false,
    usageCount: 3456,
  },
  {
    id: 'retro-arcade',
    name: 'Retro Arcade',
    description: '80s arcade aesthetic with pixel art and synthwave vibes',
    themeDescription: 'A retro 80s arcade scene with pixel art elements, CRT screen effects, and synthwave color palette. Neon grids, palm trees, and sunset gradients. Nostalgic gaming aesthetic.',
    category: 'gaming',
    thumbnailUrl: '/packs/retro-arcade/thumbnail.png',
    assets: [
      { type: 'starting_soon', label: 'Starting Soon', previewUrl: '/packs/retro-arcade/starting-soon.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'be_right_back', label: 'Be Right Back', previewUrl: '/packs/retro-arcade/brb.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'offline', label: 'Offline', previewUrl: '/packs/retro-arcade/offline.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'webcam_overlay', label: 'Webcam Overlay', previewUrl: '/packs/retro-arcade/webcam.png', dimensions: { width: 1920, height: 1080 } },
    ],
    originalColors: { id: 'synthwave', name: 'Synthwave', primary: '#FF6B9D', secondary: '#C850C0', accent: '#4158D0', preview: ['#FF6B9D', '#C850C0', '#4158D0'] },
    tags: ['retro', 'arcade', '80s', 'synthwave', 'pixel', 'neon'],
    isPremium: true,
    usageCount: 1567,
  },
  {
    id: 'anime-sakura',
    name: 'Anime Sakura',
    description: 'Beautiful anime-style cherry blossom theme',
    themeDescription: 'A serene anime-style scene with cherry blossom trees, falling petals, and soft pink lighting. Japanese aesthetic with traditional and modern elements. Soft, dreamy atmosphere.',
    category: 'creative',
    thumbnailUrl: '/packs/anime-sakura/thumbnail.png',
    assets: [
      { type: 'starting_soon', label: 'Starting Soon', previewUrl: '/packs/anime-sakura/starting-soon.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'be_right_back', label: 'Be Right Back', previewUrl: '/packs/anime-sakura/brb.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'offline', label: 'Offline', previewUrl: '/packs/anime-sakura/offline.png', dimensions: { width: 1920, height: 1080 } },
      { type: 'webcam_overlay', label: 'Webcam Overlay', previewUrl: '/packs/anime-sakura/webcam.png', dimensions: { width: 1920, height: 1080 } },
    ],
    originalColors: { id: 'sakura', name: 'Sakura', primary: '#FDA4AF', secondary: '#FBCFE8', accent: '#F472B6', preview: ['#FDA4AF', '#FBCFE8', '#F472B6'] },
    tags: ['anime', 'sakura', 'cherry blossom', 'japanese', 'pink', 'cute'],
    isPremium: true,
    usageCount: 2891,
  },
];
