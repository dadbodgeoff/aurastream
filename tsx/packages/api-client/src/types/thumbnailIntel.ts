/**
 * Thumbnail Intelligence TypeScript Types
 * 
 * Types for thumbnail analysis data from Gemini Vision.
 */

// ============================================================================
// Thumbnail Analysis
// ============================================================================

export interface ThumbnailAnalysis {
  videoId: string;
  title: string;
  /** Thumbnail image URL */
  thumbnailUrl: string;
  /** Alias for thumbnailUrl for component compatibility */
  url: string;
  /** View count */
  viewCount: number;
  /** Alias for viewCount for component compatibility */
  views: number;
  
  // Layout Analysis
  layoutType: string;
  textPlacement: string;
  focalPoint: string;
  
  // Color Analysis
  dominantColors: string[];
  colorMood: string;
  backgroundStyle: string;
  
  // Design Elements
  hasFace: boolean;
  hasText: boolean;
  textContent?: string;
  hasBorder: boolean;
  hasGlowEffects: boolean;
  hasArrowsCircles: boolean;
  
  // Face Details (for recreation)
  faceExpression?: string | null;
  facePosition?: string | null;
  faceSize?: string | null;
  faceLookingDirection?: string | null;
  
  // Recommendations
  layoutRecipe: string;
  colorRecipe: string;
  whyItWorks: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ============================================================================
// Category Insight
// ============================================================================

export interface CategoryInsight {
  categoryKey: string;
  /** Alias for categoryKey for component compatibility */
  key: string;
  categoryName: string;
  /** Alias for categoryName for component compatibility */
  name: string;
  analysisDate: string;
  
  // Individual thumbnails
  thumbnails: ThumbnailAnalysis[];
  
  // Aggregated patterns
  commonLayout: string;
  commonColors: string[];
  commonElements: string[];
  
  // Recommendations
  idealLayout: string;
  idealColorPalette: string[];
  mustHaveElements: string[];
  avoidElements: string[];
  
  // Summary
  categoryStyleSummary: string;
  proTips: string[];
}

// ============================================================================
// Overview Response
// ============================================================================

export interface ThumbnailIntelOverview {
  analysisDate: string;
  categories: CategoryInsight[];
  totalThumbnailsAnalyzed: number;
}

// ============================================================================
// Category List Item
// ============================================================================

export interface CategoryListItem {
  categoryKey: string;
  categoryName: string;
  colorTheme: string;
  thumbnailCount: number;
  latestAnalysis?: string;
}
