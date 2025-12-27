// Brand Kit Enhancement Types
// TypeScript interfaces matching backend Pydantic schemas

// Extended Color System
export interface ExtendedColor {
  hex: string;
  name: string;
  usage?: string;
}

export interface GradientStop {
  color: string;
  position: number;
}

export interface Gradient {
  name: string;
  type: 'linear' | 'radial';
  angle: number;
  stops: GradientStop[];
}

export interface ColorPalette {
  primary: ExtendedColor[];
  secondary: ExtendedColor[];
  accent: ExtendedColor[];
  neutral: ExtendedColor[];
  gradients: Gradient[];
}

// Typography System
export interface FontConfig {
  family: string;
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style: 'normal' | 'italic';
}

export interface Typography {
  display?: FontConfig;
  headline?: FontConfig;
  subheadline?: FontConfig;
  body?: FontConfig;
  caption?: FontConfig;
  accent?: FontConfig;
}

// Brand Voice
export type ExtendedTone = 'competitive' | 'casual' | 'educational' | 'comedic' | 'professional' | 'inspirational' | 'edgy' | 'wholesome';

export interface BrandVoice {
  tone: ExtendedTone;
  personality_traits: string[];
  tagline?: string;
  catchphrases: string[];
  content_themes: string[];
}

// Streamer Assets
export type OverlayType = 'starting_soon' | 'brb' | 'ending' | 'gameplay';
export type AlertType = 'follow' | 'subscribe' | 'donation' | 'raid' | 'bits' | 'gift_sub';
export type EmoteTier = 1 | 2 | 3;
export type FacecamPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface OverlayAsset {
  id: string;
  url: string;
  overlay_type: OverlayType;
  duration_seconds?: number;
}

export interface AlertAsset {
  id: string;
  alert_type: AlertType;
  image_url: string;
  sound_url?: string;
  duration_ms: number;
}

export interface PanelAsset {
  id: string;
  name: string;
  image_url: string;
}

export interface EmoteAsset {
  id: string;
  name: string;
  url: string;
  tier: EmoteTier;
}

export interface BadgeAsset {
  id: string;
  months: number;
  url: string;
}

export interface FacecamFrame {
  id: string;
  url: string;
  position: FacecamPosition;
}

export interface Stinger {
  id: string;
  url: string;
  duration_ms: number;
}

export interface StreamerAssets {
  overlays: OverlayAsset[];
  alerts: AlertAsset[];
  panels: PanelAsset[];
  emotes: EmoteAsset[];
  badges: BadgeAsset[];
  facecam_frame?: FacecamFrame;
  stinger?: Stinger;
}

// Brand Guidelines
export interface BrandGuidelines {
  logo_min_size_px: number;
  logo_clear_space_ratio: number;
  primary_color_ratio: number;
  secondary_color_ratio: number;
  accent_color_ratio: number;
  prohibited_modifications: string[];
  photo_style?: string;
  illustration_style?: string;
  icon_style?: string;
}

// Social Profiles
export interface SocialProfile {
  platform: string;
  username?: string;
  profile_url?: string;
  banner_url?: string;
}

export interface SocialProfiles {
  twitch?: SocialProfile;
  youtube?: SocialProfile;
  twitter?: SocialProfile;
  discord?: SocialProfile;
  tiktok?: SocialProfile;
  instagram?: SocialProfile;
}

// Brand Customization for Generation
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
export type LogoSize = 'small' | 'medium' | 'large';
export type BrandIntensity = 'subtle' | 'balanced' | 'strong';
export type TypographyLevel = 'display' | 'headline' | 'subheadline' | 'body' | 'caption' | 'accent';
export type LogoType = 'primary' | 'secondary' | 'icon' | 'monochrome' | 'watermark';

export interface ColorSelection {
  primary_index: number;
  secondary_index?: number;
  accent_index?: number;
  use_gradient?: number;
}

export interface TypographySelection {
  level: TypographyLevel;
}

export interface VoiceSelection {
  use_tagline: boolean;
  use_catchphrase?: number;
}

export interface BrandCustomization {
  colors?: ColorSelection;
  typography?: TypographySelection;
  voice?: VoiceSelection;
  include_logo: boolean;
  logo_type: LogoType;
  logo_position: LogoPosition;
  logo_size: LogoSize;
  brand_intensity: BrandIntensity;
}

// API Response Types
export interface ColorPaletteResponse {
  brand_kit_id: string;
  colors: ColorPalette;
}

export interface TypographyResponse {
  brand_kit_id: string;
  typography: Typography;
}

export interface VoiceResponse {
  brand_kit_id: string;
  voice: BrandVoice;
}

export interface GuidelinesResponse {
  brand_kit_id: string;
  guidelines: BrandGuidelines;
}
