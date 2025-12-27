/**
 * Mock for @aurastream/api-client
 */

export const useBrandKits = jest.fn();
export const useDeleteBrandKit = jest.fn();
export const useActivateBrandKit = jest.fn();
export const useBrandKit = jest.fn();
export const useActiveBrandKit = jest.fn();
export const useCreateBrandKit = jest.fn();
export const useUpdateBrandKit = jest.fn();

export const brandKitKeys = {
  all: ['brandKits'],
  lists: () => [...brandKitKeys.all, 'list'],
  list: () => [...brandKitKeys.lists()],
  details: () => [...brandKitKeys.all, 'detail'],
  detail: (id: string) => [...brandKitKeys.details(), id],
  active: () => [...brandKitKeys.all, 'active'],
};

export interface BrandKitFonts {
  headline: string;
  body: string;
}

export type BrandKitTone = 'competitive' | 'casual' | 'educational' | 'comedic' | 'professional';

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
  colors_extended?: Record<string, unknown>;
  typography?: Record<string, unknown>;
  voice?: Record<string, unknown>;
  streamer_assets?: Record<string, unknown>;
  guidelines?: Record<string, unknown>;
  social_profiles?: Record<string, unknown>;
  logos?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BrandKitListResponse {
  brand_kits: BrandKit[];
  total: number;
  active_id: string | null;
}
