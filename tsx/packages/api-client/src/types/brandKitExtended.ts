/**
 * Extended Brand Kit Types
 * TypeScript interfaces for extended brand kit fields matching backend schemas
 */

// ============================================================================
// Constants
// ============================================================================

export const SUPPORTED_FONTS = [
  'Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Poppins',
  'Lato', 'Oswald', 'Raleway', 'Nunito', 'Playfair Display',
  'Merriweather', 'Source Sans Pro', 'Ubuntu', 'Rubik', 'Work Sans',
  'Fira Sans', 'Barlow', 'Quicksand', 'Karla', 'Mulish'
] as const;

export type SupportedFont = typeof SUPPORTED_FONTS[number];

export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
export type FontWeight = typeof FONT_WEIGHTS[number];

export const EXTENDED_TONES = [
  'competitive', 'casual', 'educational', 'comedic',
  'professional', 'inspirational', 'edgy', 'wholesome'
] as const;

export type ExtendedToneType = typeof EXTENDED_TONES[number];

// ============================================================================
// Extended Color System
// ============================================================================

export interface ExtendedColorInput {
  hex: string;      // #RRGGBB format
  name: string;     // max 50 chars
  usage: string;    // max 200 chars
}

export interface GradientStopInput {
  color: string;    // #RRGGBB format
  position: number; // 0-100
}

export interface GradientInput {
  name: string;                    // max 50 chars
  type: 'linear' | 'radial';
  angle: number;                   // 0-360
  stops: GradientStopInput[];      // 2-10 stops
}

export interface ColorPaletteInput {
  primary: ExtendedColorInput[];   // max 5
  secondary: ExtendedColorInput[]; // max 5
  accent: ExtendedColorInput[];    // max 3
  neutral: ExtendedColorInput[];   // max 5
  gradients: GradientInput[];      // max 3
}

export interface ColorPaletteResponseData {
  brandKitId: string;
  colors: ColorPaletteInput;
}

// ============================================================================
// Typography System
// ============================================================================

export interface FontConfigInput {
  family: string;                  // max 100 chars
  weight: FontWeight;              // 100-900 in increments of 100
  style: 'normal' | 'italic';
}

export interface TypographyInput {
  display?: FontConfigInput;
  headline?: FontConfigInput;
  subheadline?: FontConfigInput;
  body?: FontConfigInput;
  caption?: FontConfigInput;
  accent?: FontConfigInput;
}

export interface TypographyResponseData {
  brandKitId: string;
  typography: TypographyInput;
}

// ============================================================================
// Brand Voice
// ============================================================================

export interface BrandVoiceInput {
  tone: ExtendedToneType;
  personalityTraits: string[];     // max 5, each max 30 chars
  tagline?: string;                // max 100 chars
  catchphrases: string[];          // max 10, each max 50 chars
  contentThemes: string[];         // max 5, each max 30 chars
}

export interface VoiceResponseData {
  brandKitId: string;
  voice: BrandVoiceInput;
}

// ============================================================================
// Brand Guidelines
// ============================================================================

export interface BrandGuidelinesInput {
  logoMinSizePx: number;           // 16-512
  logoClearSpaceRatio: number;     // 0.1-1.0
  primaryColorRatio: number;       // 0-100
  secondaryColorRatio: number;     // 0-100
  accentColorRatio: number;        // 0-100
  prohibitedModifications: string[]; // max 10
  styleDo?: string;                // max 500 chars
  styleDont?: string;              // max 500 chars
}

export interface GuidelinesResponseData {
  brandKitId: string;
  guidelines: BrandGuidelinesInput;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_COLOR_PALETTE: ColorPaletteInput = {
  primary: [],
  secondary: [],
  accent: [],
  neutral: [],
  gradients: [],
};

export const DEFAULT_TYPOGRAPHY: TypographyInput = {};

export const DEFAULT_BRAND_VOICE: BrandVoiceInput = {
  tone: 'professional',
  personalityTraits: [],
  tagline: '',
  catchphrases: [],
  contentThemes: [],
};

export const DEFAULT_BRAND_GUIDELINES: BrandGuidelinesInput = {
  logoMinSizePx: 48,
  logoClearSpaceRatio: 0.25,
  primaryColorRatio: 60,
  secondaryColorRatio: 30,
  accentColorRatio: 10,
  prohibitedModifications: [],
  styleDo: '',
  styleDont: '',
};

// ============================================================================
// Validation Limits
// ============================================================================

export const LIMITS = {
  colors: {
    primary: 5,
    secondary: 5,
    accent: 3,
    neutral: 5,
    gradients: 3,
  },
  gradientStops: {
    min: 2,
    max: 10,
  },
  typography: {
    familyMaxLength: 100,
  },
  voice: {
    personalityTraitsMax: 5,
    personalityTraitMaxLength: 30,
    taglineMaxLength: 100,
    catchphrasesMax: 10,
    catchphraseMaxLength: 50,
    contentThemesMax: 5,
    contentThemeMaxLength: 30,
  },
  guidelines: {
    logoMinSizeMin: 16,
    logoMinSizeMax: 512,
    clearSpaceRatioMin: 0.1,
    clearSpaceRatioMax: 1.0,
    prohibitedModificationsMax: 10,
    styleDoMaxLength: 500,
    styleDontMaxLength: 500,
  },
} as const;
