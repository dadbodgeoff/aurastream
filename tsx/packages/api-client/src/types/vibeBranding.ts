/**
 * TypeScript types for Vibe Branding feature.
 * 
 * Converted from backend schemas (snake_case → camelCase).
 * @see backend/api/schemas/vibe_branding.py
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type LightingMood = 
  | 'neon'
  | 'natural'
  | 'dramatic'
  | 'cozy'
  | 'high-contrast';

export type BrandTone =
  | 'competitive'
  | 'casual'
  | 'educational'
  | 'comedic'
  | 'professional';

// ============================================================================
// Fonts
// ============================================================================

export interface Fonts {
  /** Headline font suggestion */
  headline: string;
  /** Body text font suggestion */
  body: string;
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface VibeAnalysis {
  /** Primary brand colors (hex codes) */
  primaryColors: string[];
  /** Accent colors (hex codes) */
  accentColors: string[];
  /** Font suggestions */
  fonts: Fonts;
  /** Brand tone/personality */
  tone: BrandTone;
  /** Style reference description */
  styleReference: string;
  /** Lighting mood detected */
  lightingMood: LightingMood;
  /** Style keywords */
  styleKeywords: string[];
  /** Text vibe description (null if no text visible) */
  textVibe: string | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Hash of source image for caching */
  sourceImageHash: string;
  /** ISO timestamp of analysis */
  analyzedAt: string;
}

export interface AnalyzeResponse {
  /** The extracted analysis */
  analysis: VibeAnalysis;
  /** Brand kit ID if auto-created */
  brandKitId: string | null;
  /** Whether result was from cache */
  cached: boolean;
}

// ============================================================================
// Request Types
// ============================================================================

export interface AnalyzeUrlRequest {
  /** URL of image to analyze */
  imageUrl: string;
  /** Auto-create brand kit from analysis */
  autoCreateKit?: boolean;
  /** Name for the brand kit */
  kitName?: string;
}

export interface AnalyzeUploadOptions {
  /** Auto-create brand kit from analysis */
  autoCreateKit?: boolean;
  /** Name for the brand kit */
  kitName?: string;
}

// ============================================================================
// Usage Types
// ============================================================================

export interface UsageResponse {
  /** Number of analyses used this month */
  used: number;
  /** Monthly limit for user's tier */
  limit: number;
  /** Remaining analyses this month */
  remaining: number;
  /** Whether user can perform analysis */
  canAnalyze: boolean;
  /** ISO timestamp when usage resets */
  resetsAt: string;
}
