export interface VibeAnalysis {
  primaryColors: string[];
  accentColors: string[];
  fonts: {
    headline: string;
    body: string;
  };
  tone: 'competitive' | 'casual' | 'educational' | 'comedic' | 'professional';
  styleReference: string;
  lightingMood: 'neon' | 'natural' | 'dramatic' | 'cozy' | 'high-contrast';
  styleKeywords: string[];
  textVibe: string | null;
  confidence: number;
  sourceImageHash: string;
  analyzedAt: string;
}

export interface AnalyzeResponse {
  analysis: VibeAnalysis;
  brandKitId: string | null;
  cached: boolean;
}

export interface UsageResponse {
  used: number;
  limit: number;
  remaining: number;
  canAnalyze: boolean;
  resetsAt: string;
}

export type VibeBrandingStep = 'upload' | 'analyzing' | 'success' | 'error';
