/**
 * TypeScript types for The Aura Lab feature.
 * 
 * Converted from backend schemas (snake_case → camelCase).
 * @see backend/api/schemas/aura_lab.py
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type RarityType = 'common' | 'rare' | 'mythic';

// ============================================================================
// Rarity Scores
// ============================================================================

export interface RarityScores {
  /** How bold and eye-catching (1-10) */
  visualImpact: number;
  /** How unexpected or clever (1-10) */
  creativity: number;
  /** Shareability and humor (1-10) */
  memePotential: number;
  /** Line quality and composition (1-10) */
  technicalQuality: number;
  /** AI's one-sentence reaction */
  commentary: string;
}

// ============================================================================
// Test Subject Types
// ============================================================================

export interface SetSubjectResponse {
  /** Unique identifier for the test subject */
  subjectId: string;
  /** URL to the uploaded subject image */
  imageUrl: string;
  /** ISO timestamp when subject expires (24h) */
  expiresAt: string;
}

// ============================================================================
// Fusion Types
// ============================================================================

export interface FuseRequest {
  /** ID of the locked test subject */
  subjectId: string;
  /** Element ID to fuse with (e.g., 'fire', 'ice') */
  elementId: string;
}

export interface FuseResponse {
  /** Unique identifier for this fusion */
  fusionId: string;
  /** URL to the generated fusion image */
  imageUrl: string;
  /** Rarity tier based on scores */
  rarity: RarityType;
  /** AI-generated rarity scores */
  scores: RarityScores;
  /** True if this is the first time anyone used this element */
  isFirstDiscovery: boolean;
  /** Recipe ID if this was a discovery */
  recipeId: string | null;
}

// ============================================================================
// Inventory Types
// ============================================================================

export interface FusionItem {
  /** Fusion ID */
  id: string;
  /** URL to the fusion image */
  imageUrl: string;
  /** Element used in fusion */
  elementId: string;
  /** Rarity tier */
  rarity: RarityType;
  /** Rarity scores dictionary */
  scores: RarityScores;
  /** ISO timestamp when fusion was created */
  createdAt: string;
}

export interface InventoryResponse {
  /** List of saved fusions */
  fusions: FusionItem[];
  /** Total number of saved fusions */
  total: number;
  /** Number of mythic rarity fusions */
  mythicCount: number;
  /** Number of rare rarity fusions */
  rareCount: number;
  /** Number of common rarity fusions */
  commonCount: number;
}

export interface InventoryFilters {
  /** Number of items to return */
  limit?: number;
  /** Number of items to skip */
  offset?: number;
  /** Filter by rarity tier */
  rarity?: RarityType;
}

// ============================================================================
// Usage Types
// ============================================================================

export interface UsageResponse {
  /** Number of fusions used today */
  usedToday: number;
  /** Daily fusion limit for user's tier */
  limit: number;
  /** Remaining fusions for today */
  remaining: number;
  /** ISO timestamp when usage resets (midnight UTC) */
  resetsAt: string;
}

// ============================================================================
// Element Types
// ============================================================================

export interface Element {
  /** Unique element identifier */
  id: string;
  /** Display name */
  name: string;
  /** Emoji icon */
  icon: string;
  /** Description of the transformation effect */
  description: string;
  /** Whether this is a premium element */
  premium: boolean;
  /** Whether element is locked for current user */
  locked: boolean;
}

export interface ElementsResponse {
  /** List of available elements */
  elements: Element[];
  /** Whether premium elements are locked for user */
  premiumLocked: boolean;
}

// ============================================================================
// Success Response
// ============================================================================

export interface SuccessResponse {
  /** Operation success status */
  success: boolean;
}
