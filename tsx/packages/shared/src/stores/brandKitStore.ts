/**
 * Zustand store for brand kit state management.
 */

import { create } from 'zustand';
import type { BrandKit } from '@aurastream/api-client';

interface BrandKitState {
  activeBrandKit: BrandKit | null;
  setActiveBrandKit: (kit: BrandKit | null) => void;
  
  // UI state
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  
  selectedBrandKitId: string | null;
  setSelectedBrandKitId: (id: string | null) => void;
}

export const useBrandKitStore = create<BrandKitState>((set) => ({
  activeBrandKit: null,
  setActiveBrandKit: (kit) => set({ activeBrandKit: kit }),
  
  isEditing: false,
  setIsEditing: (editing) => set({ isEditing: editing }),
  
  selectedBrandKitId: null,
  setSelectedBrandKitId: (id) => set({ selectedBrandKitId: id }),
}));
