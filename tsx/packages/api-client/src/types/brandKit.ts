/**
 * Brand Kit TypeScript types for Streamer Studio.
 */

export interface BrandKitFonts {
  headline: string;
  body: string;
}

export type BrandKitTone = 'competitive' | 'casual' | 'educational' | 'comedic' | 'professional';

export type ExtendedTone = BrandKitTone | 'inspirational' | 'edgy' | 'wholesome';

// Extended color with metadata
export interface ExtendedColor {
  hex: string;
  name: string;
  usage: string;
}

// Gradient definitions
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

// Extended color palette
export interface ColorPalette {
  primary: ExtendedColor[];
  secondary: ExtendedColor[];
  accent: ExtendedColor[];
  neutral: ExtendedColor[];
  gradients: Gradient[];
}

// Typography configuration
export interface FontConfig {
  family: string;
  weight: number;
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

// Brand voice configuration
export interface BrandVoice {
  tone: string;
  personality_traits: string[];
  tagline: string;
  catchphrases: string[];
  content_themes: string[];
}

// Logo metadata
export interface LogoMetadata {
  primary?: { url: string; uploaded_at: string };
  secondary?: { url: string; uploaded_at: string };
  icon?: { url: string; uploaded_at: string };
  monochrome?: { url: string; uploaded_at: string };
  watermark?: { url: string; uploaded_at: string };
}

// Brand guidelines
export interface BrandGuidelines {
  logo_min_size_px?: number;
  logo_clear_space_ratio?: number;
  primary_color_ratio?: number;
  secondary_color_ratio?: number;
  accent_color_ratio?: number;
  prohibited_modifications?: string[];
  photo_style?: string;
  illustration_style?: string;
  icon_style?: string;
}

// Social profiles
export interface SocialProfile {
  platform: string;
  username: string;
  profile_url: string;
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

export interface BrandKit {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  primary_colors: string[];
  accent_colors: string[];
  fonts: BrandKitFonts;
  logo_url: string | null;
  tone: BrandKitTone;
  style_reference: string;
  extracted_from: string | null;
  // Enhanced fields
  colors_extended?: ColorPalette;
  typography?: Typography;
  voice?: BrandVoice;
  streamer_assets?: Record<string, unknown>;
  guidelines?: BrandGuidelines;
  social_profiles?: SocialProfiles;
  logos?: LogoMetadata;
  created_at: string;
  updated_at: string;
}

export interface BrandKitCreate {
  name: string;
  primary_colors: string[];
  accent_colors?: string[];
  fonts: BrandKitFonts;
  tone?: BrandKitTone;
  style_reference?: string;
  logo_url?: string | null;
}

export interface BrandKitUpdate {
  name?: string;
  primary_colors?: string[];
  accent_colors?: string[];
  fonts?: Partial<BrandKitFonts>;
  tone?: BrandKitTone;
  style_reference?: string;
  logo_url?: string | null;
}

export interface BrandKitListResponse {
  brandKits: BrandKit[];
  total: number;
  activeId: string | null;
}

export interface BrandKitExtraction {
  primary_colors: string[];
  accent_colors: string[];
  detected_fonts: string[];
  suggested_tone: BrandKitTone;
  confidence: number;
  source_files: string[];
}

export const SUPPORTED_FONTS = [
  'Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Poppins',
  'Lato', 'Oswald', 'Raleway', 'Nunito', 'Playfair Display',
  'Merriweather', 'Source Sans Pro', 'Ubuntu', 'Rubik', 'Work Sans',
  'Fira Sans', 'Barlow', 'Quicksand', 'Karla', 'Mulish'
] as const;

export const VALID_TONES: BrandKitTone[] = ['competitive', 'casual', 'educational', 'comedic', 'professional'];
