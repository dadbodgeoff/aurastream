/**
 * Type definitions for the Create flow.
 * @module create/types
 */

import type { LogoPosition, LogoSize } from '@aurastream/api-client';

export type Platform = 'general' | 'twitch' | 'youtube' | 'tiktok';
export type AssetCategory = 'thumbnails' | 'overlays' | 'social' | 'channel';
export type CreatePhase = 'select' | 'prompt' | 'coach';

export interface AssetType {
  id: string;
  label: string;
  description: string;
  dimensions: string;
  platform: Platform[];
  category: AssetCategory;
}

export interface BrandKitOption {
  id: string;
  name: string;
  is_active: boolean;
  primary_colors: string[];
  accent_colors: string[];
}

export interface LogoOptions {
  includeLogo: boolean;
  logoPosition: LogoPosition;
  logoSize: LogoSize;
}

export interface CreateContext {
  platform: Platform;
  assetType: string;
  brandKitId: string;
  prompt: string;
  logoOptions: LogoOptions;
}
