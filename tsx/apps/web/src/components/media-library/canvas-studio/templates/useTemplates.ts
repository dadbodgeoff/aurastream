/**
 * useTemplates Hook
 * 
 * Manages template selection, filtering, and application logic.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BUILT_IN_TEMPLATES,
  getTemplateById,
  filterTemplatesByCategory,
  filterTemplatesByCanvasType,
  searchTemplates,
  type CanvasTemplate,
  type TemplateCategory,
  type CanvasType,
} from './data';

interface UseTemplatesOptions {
  /** Filter templates to only those compatible with this canvas type */
  canvasType?: CanvasType;
  /** Initial category filter */
  initialCategory?: TemplateCategory;
}

interface UseTemplatesReturn {
  // Data
  templates: CanvasTemplate[];
  filteredTemplates: CanvasTemplate[];
  selectedTemplate: CanvasTemplate | null;
  
  // Filters
  searchQuery: string;
  categoryFilter: TemplateCategory | null;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: TemplateCategory | null) => void;
  selectTemplate: (templateId: string | null) => void;
  clearFilters: () => void;
  
  // Computed
  categories: TemplateCategory[];
  templateCount: number;
}

export function useTemplates(options: UseTemplatesOptions = {}): UseTemplatesReturn {
  const { canvasType, initialCategory } = options;
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | null>(
    initialCategory ?? null
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // Base templates (filtered by canvas type if provided)
  const templates = useMemo(() => {
    if (canvasType) {
      return filterTemplatesByCanvasType(BUILT_IN_TEMPLATES, canvasType);
    }
    return BUILT_IN_TEMPLATES;
  }, [canvasType]);
  
  // Available categories from filtered templates
  const categories = useMemo(() => {
    const categorySet = new Set(templates.map(t => t.category));
    return Array.from(categorySet) as TemplateCategory[];
  }, [templates]);
  
  // Apply filters
  const filteredTemplates = useMemo(() => {
    let result = templates;
    
    // Category filter
    if (categoryFilter) {
      result = filterTemplatesByCategory(result, categoryFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      result = searchTemplates(result, searchQuery);
    }
    
    return result;
  }, [templates, categoryFilter, searchQuery]);
  
  // Selected template
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return getTemplateById(selectedTemplateId) ?? null;
  }, [selectedTemplateId]);
  
  // Actions
  const selectTemplate = useCallback((templateId: string | null) => {
    setSelectedTemplateId(templateId);
  }, []);
  
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter(null);
  }, []);
  
  return {
    // Data
    templates,
    filteredTemplates,
    selectedTemplate,
    
    // Filters
    searchQuery,
    categoryFilter,
    
    // Actions
    setSearchQuery,
    setCategoryFilter,
    selectTemplate,
    clearFilters,
    
    // Computed
    categories,
    templateCount: filteredTemplates.length,
  };
}
