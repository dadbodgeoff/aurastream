/**
 * useTemplates - Fetch Quick Create template metadata from backend
 * 
 * Templates are loaded dynamically from the backend, which reads YAML files.
 * This ensures the frontend always has the latest fields and vibes without
 * hardcoding them.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

// ============================================================================
// Types
// ============================================================================

export interface FieldOption {
  label: string;
  value: string;
}

export interface ColorPreset {
  label: string;
  value: string;
  category?: string;
}

export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'color';
  required: boolean;
  placeholder?: string;
  hint?: string;
  description?: string;
  maxLength?: number;
  options?: FieldOption[];
  default?: string;
  showForVibes?: string[];
  // Color picker presets
  presets?: ColorPreset[];
  showPresets?: boolean;
}

export interface VibeOption {
  id: string;
  name: string;
  description?: string;
}

export interface TemplateMeta {
  id: string;
  name: string;
  version: string;
  category: string;
  assetType: string;
  dimensions: {
    width?: number;
    height?: number;
    aspectRatio?: string;
  };
  fields: TemplateField[];
  vibes: VibeOption[];
  qualityModifiers: string[];
}

interface TemplateListResponse {
  templates: TemplateMeta[];
}

// ============================================================================
// Transform Functions (snake_case -> camelCase)
// ============================================================================

function transformField(field: any): TemplateField {
  return {
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required ?? false,
    placeholder: field.placeholder,
    hint: field.hint,
    description: field.description,
    maxLength: field.max_length,
    options: field.options,
    default: field.default,
    showForVibes: field.show_for_vibes,
    // Color picker presets
    presets: field.presets,
    showPresets: field.show_presets,
  };
}

function transformTemplate(template: any): TemplateMeta {
  return {
    id: template.id,
    name: template.name,
    version: template.version,
    category: template.category,
    assetType: template.asset_type,
    dimensions: {
      width: template.dimensions?.width,
      height: template.dimensions?.height,
      aspectRatio: template.dimensions?.aspect_ratio,
    },
    fields: (template.fields || []).map(transformField),
    vibes: template.vibes || [],
    qualityModifiers: template.quality_modifiers || [],
  };
}

// ============================================================================
// API Functions
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchTemplates(): Promise<TemplateMeta[]> {
  const accessToken = apiClient.getAccessToken();
  
  const response = await fetch(`${API_BASE_URL}/api/v1/templates`, {
    headers: {
      'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch templates');
  }

  const data = await response.json();
  return (data.templates || []).map(transformTemplate);
}

async function fetchTemplate(templateId: string): Promise<TemplateMeta> {
  const accessToken = apiClient.getAccessToken();
  
  const response = await fetch(`${API_BASE_URL}/api/v1/templates/${templateId}`, {
    headers: {
      'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch template');
  }

  const data = await response.json();
  return transformTemplate(data);
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all available Quick Create templates.
 * 
 * Returns template metadata including fields and vibes.
 * Prompts are NOT exposed - they stay on the backend.
 */
export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
    staleTime: 5 * 60 * 1000, // 5 minutes - templates don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}

/**
 * Fetch a specific template by ID.
 * 
 * @param templateId - Template identifier (e.g., 'emote', 'thumbnail')
 */
export function useTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ['templates', templateId],
    queryFn: () => fetchTemplate(templateId!),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
