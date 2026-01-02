/**
 * Creator Media Library Constants
 */

import type { MediaAssetType } from '@aurastream/api-client';

export const ASSET_TYPE_ICONS: Record<MediaAssetType, string> = {
  logo: '🎨',
  face: '😊',
  character: '🧑‍🎤',
  game_skin: '🎮',
  object: '📦',
  background: '🖼️',
  reference: '📌',
  overlay: '✨',
  emote: '😎',
  badge: '🏅',
  panel: '📋',
  alert: '🔔',
  facecam_frame: '📹',
  stinger: '⚡',
};

export const ASSET_TYPE_COLORS: Record<MediaAssetType, string> = {
  logo: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  face: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  character: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  game_skin: 'bg-green-500/20 text-green-400 border-green-500/30',
  object: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  background: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  reference: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  overlay: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  emote: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  panel: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  alert: 'bg-red-500/20 text-red-400 border-red-500/30',
  facecam_frame: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  stinger: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
};

export const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'updated_at', label: 'Last Modified' },
  { value: 'usage_count', label: 'Most Used' },
  { value: 'display_name', label: 'Name' },
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
