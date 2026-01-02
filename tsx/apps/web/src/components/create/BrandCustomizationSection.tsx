/**
 * BrandCustomizationSection Component
 * 
 * Provides customization options for asset generation when a brand kit is selected.
 * Users can select which colors from their brand kit palette to emphasize,
 * control logo placement, and set brand intensity.
 * 
 * @module create/BrandCustomizationSection
 */

'use client';

import { useExtendedColors, useLogos, useBrandVoice } from '@aurastream/api-client';
import type { 
  LogoPosition, 
  LogoSize, 
  LogoType, 
  BrandIntensity,
} from '@aurastream/api-client';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface BrandCustomizationValue {
  // Color selection from brand kit palette
  colors?: {
    primary_index?: number;
    secondary_index?: number;
    accent_index?: number;
    use_gradient?: number;
  };
  // Voice options
  voice?: {
    use_tagline?: boolean;
    use_catchphrase?: number;
  };
  // Logo options
  include_logo: boolean;
  logo_type: LogoType;
  logo_position: LogoPosition;
  logo_size: LogoSize;
  // Brand intensity
  brand_intensity: BrandIntensity;
}

export interface BrandCustomizationSectionProps {
  brandKitId: string;
  brandKitName: string;
  value: BrandCustomizationValue;
  onChange: (value: BrandCustomizationValue) => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const BRAND_INTENSITIES: { id: BrandIntensity; label: string; description: string }[] = [
  { id: 'subtle', label: 'Subtle', description: 'Light brand presence' },
  { id: 'balanced', label: 'Balanced', description: 'Moderate presence' },
  { id: 'strong', label: 'Strong', description: 'Bold presence' },
];

const LOGO_TYPES: { id: LogoType; label: string }[] = [
  { id: 'primary', label: 'Primary' },
  { id: 'secondary', label: 'Secondary' },
  { id: 'icon', label: 'Icon' },
  { id: 'monochrome', label: 'Mono' },
  { id: 'watermark', label: 'Watermark' },
];

const LOGO_POSITIONS: { id: LogoPosition; label: string }[] = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'center', label: 'Center' },
];

const LOGO_SIZES: { id: LogoSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

// ============================================================================
// Icons
// ============================================================================

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// ============================================================================
// Helper Functions
// ============================================================================

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ColorSwatchProps {
  hex: string;
  name: string;
  isSelected: boolean;
  onClick: () => void;
}

function ColorSwatch({ hex, name, isSelected, onClick }: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-8 h-8 rounded-lg border-2 transition-all',
        isSelected
          ? 'border-interactive-600 ring-2 ring-interactive-600/30 scale-110'
          : 'border-border-subtle hover:border-border-default hover:scale-105'
      )}
      style={{ backgroundColor: hex }}
      title={name}
    >
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <CheckIcon className={cn('w-4 h-4', isLightColor(hex) ? 'text-gray-800' : 'text-white')} />
        </div>
      )}
    </button>
  );
}

interface GradientSwatchProps {
  name: string;
  stops: Array<{ color: string; position: number }>;
  isSelected: boolean;
  onClick: () => void;
}

function GradientSwatch({ name, stops, isSelected, onClick }: GradientSwatchProps) {
  const gradientStyle = {
    background: `linear-gradient(135deg, ${stops.map(s => `${s.color} ${s.position}%`).join(', ')})`,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-12 h-8 rounded-lg border-2 transition-all',
        isSelected
          ? 'border-interactive-600 ring-2 ring-interactive-600/30 scale-110'
          : 'border-border-subtle hover:border-border-default hover:scale-105'
      )}
      style={gradientStyle}
      title={name}
    >
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
          <CheckIcon className="w-4 h-4 text-white" />
        </div>
      )}
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BrandCustomizationSection({
  brandKitId,
  brandKitName,
  value,
  onChange,
  className,
}: BrandCustomizationSectionProps) {
  // Fetch brand kit data
  const { data: colorsData, isLoading: isLoadingColors } = useExtendedColors(brandKitId);
  const { data: voiceData, isLoading: isLoadingVoice } = useBrandVoice(brandKitId);
  const { data: logosData } = useLogos(brandKitId);

  const colors = colorsData?.colors;
  const voice = voiceData?.voice;
  const hasLogo = logosData?.logos?.primary != null;

  const isLoading = isLoadingColors || isLoadingVoice;

  // Check if we have extended data
  const hasColors = colors && (
    (colors.primary && colors.primary.length > 1) || 
    (colors.secondary && colors.secondary.length > 0) || 
    (colors.accent && colors.accent.length > 0)
  );
  const hasGradients = colors?.gradients && colors.gradients.length > 0;
  const hasVoice = voice && (voice.tagline || (voice.catchphrases && voice.catchphrases.length > 0));

  // Handlers
  const handleColorChange = (type: 'primary' | 'secondary' | 'accent', index: number) => {
    const newColors = { ...value.colors };
    if (type === 'primary') newColors.primary_index = index;
    if (type === 'secondary') newColors.secondary_index = index;
    if (type === 'accent') newColors.accent_index = index;
    onChange({ ...value, colors: newColors });
  };

  const handleGradientChange = (index: number | undefined) => {
    onChange({ ...value, colors: { ...value.colors, use_gradient: index } });
  };

  const handleVoiceChange = (field: 'use_tagline' | 'use_catchphrase', val: boolean | number | undefined) => {
    const newVoice = { ...value.voice };
    if (field === 'use_tagline') newVoice.use_tagline = val as boolean;
    if (field === 'use_catchphrase') newVoice.use_catchphrase = val as number | undefined;
    onChange({ ...value, voice: newVoice });
  };

  if (isLoading) {
    return (
      <div className={cn('p-4 bg-background-surface/50 border border-border-subtle rounded-xl', className)}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-interactive-600/30 border-t-interactive-600 rounded-full animate-spin" />
          <span className="text-sm text-text-secondary">Loading brand options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Brand Intensity */}
      <div className="p-4 bg-background-surface/50 border border-border-subtle rounded-xl">
        <h3 className="font-medium text-text-primary mb-2">Brand Intensity</h3>
        <p className="text-xs text-text-tertiary mb-3">
          How prominently should your brand appear?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {BRAND_INTENSITIES.map((intensity) => (
            <button
              key={intensity.id}
              onClick={() => onChange({ ...value, brand_intensity: intensity.id })}
              className={cn(
                'p-2 rounded-lg border-2 text-center transition-all',
                value.brand_intensity === intensity.id
                  ? 'border-interactive-600 bg-interactive-600/10'
                  : 'border-border-subtle bg-background-base hover:border-border-default'
              )}
            >
              <div className="font-medium text-xs text-text-primary">{intensity.label}</div>
              <div className="text-xs text-text-tertiary">{intensity.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Color Selection - Only show if brand kit has multiple colors */}
      {hasColors && (
        <div className="p-4 bg-background-surface/50 border border-border-subtle rounded-xl space-y-4">
          <div>
            <h3 className="font-medium text-text-primary mb-1">Color Emphasis</h3>
            <p className="text-xs text-text-tertiary">
              Select which colors from your brand kit to emphasize
            </p>
          </div>
          
          {/* Primary Colors */}
          {colors.primary && colors.primary.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-2">Primary</label>
              <div className="flex flex-wrap gap-2">
                {colors.primary.map((color, idx) => (
                  <ColorSwatch
                    key={`primary-${idx}`}
                    hex={color.hex}
                    name={color.name}
                    isSelected={value.colors?.primary_index === idx}
                    onClick={() => handleColorChange('primary', idx)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Secondary Colors */}
          {colors.secondary && colors.secondary.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-2">Secondary</label>
              <div className="flex flex-wrap gap-2">
                {colors.secondary.map((color, idx) => (
                  <ColorSwatch
                    key={`secondary-${idx}`}
                    hex={color.hex}
                    name={color.name}
                    isSelected={value.colors?.secondary_index === idx}
                    onClick={() => handleColorChange('secondary', idx)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Accent Colors */}
          {colors.accent && colors.accent.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-2">Accent</label>
              <div className="flex flex-wrap gap-2">
                {colors.accent.map((color, idx) => (
                  <ColorSwatch
                    key={`accent-${idx}`}
                    hex={color.hex}
                    name={color.name}
                    isSelected={value.colors?.accent_index === idx}
                    onClick={() => handleColorChange('accent', idx)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Gradients */}
          {hasGradients && (
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-2">Gradient (Optional)</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleGradientChange(undefined)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all',
                    value.colors?.use_gradient === undefined
                      ? 'border-interactive-600 bg-interactive-600/10 text-text-primary'
                      : 'border-border-subtle text-text-secondary hover:border-border-default'
                  )}
                >
                  None
                </button>
                {colors.gradients!.map((gradient, idx) => (
                  <GradientSwatch
                    key={`gradient-${idx}`}
                    name={gradient.name}
                    stops={gradient.stops}
                    isSelected={value.colors?.use_gradient === idx}
                    onClick={() => handleGradientChange(idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voice/Tagline Selection */}
      {hasVoice && (
        <div className="p-4 bg-background-surface/50 border border-border-subtle rounded-xl space-y-3">
          <h3 className="font-medium text-text-primary">Voice & Tagline</h3>
          
          {/* Tagline Toggle */}
          {voice.tagline && (
            <button
              onClick={() => handleVoiceChange('use_tagline', !value.voice?.use_tagline)}
              className={cn(
                'w-full p-3 rounded-lg border-2 text-left transition-all',
                value.voice?.use_tagline
                  ? 'border-interactive-600 bg-interactive-600/10'
                  : 'border-border-subtle hover:border-border-default'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary italic">"{voice.tagline}"</span>
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center',
                  value.voice?.use_tagline ? 'border-interactive-600 bg-interactive-600' : 'border-border-default'
                )}>
                  {value.voice?.use_tagline && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
              </div>
            </button>
          )}

          {/* Catchphrases */}
          {voice.catchphrases && voice.catchphrases.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-2">Catchphrase (Optional)</label>
              <div className="space-y-1">
                <button
                  onClick={() => handleVoiceChange('use_catchphrase', undefined)}
                  className={cn(
                    'w-full p-2 rounded-lg border text-left text-sm transition-all',
                    value.voice?.use_catchphrase === undefined
                      ? 'border-interactive-600 bg-interactive-600/10 text-text-primary'
                      : 'border-border-subtle text-text-secondary hover:border-border-default'
                  )}
                >
                  None
                </button>
                {voice.catchphrases.map((phrase, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleVoiceChange('use_catchphrase', idx)}
                    className={cn(
                      'w-full p-2 rounded-lg border text-left text-sm transition-all',
                      value.voice?.use_catchphrase === idx
                        ? 'border-interactive-600 bg-interactive-600/10 text-text-primary'
                        : 'border-border-subtle text-text-secondary hover:border-border-default'
                    )}
                  >
                    "{phrase}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logo Options */}
      <div className="p-4 bg-background-surface/50 border border-border-subtle rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-text-primary">Logo</h3>
          <button
            onClick={() => onChange({ ...value, include_logo: !value.include_logo })}
            disabled={!hasLogo}
            className={cn(
              'relative w-10 h-5 rounded-full transition-colors',
              value.include_logo && hasLogo ? 'bg-interactive-600' : 'bg-background-elevated',
              !hasLogo && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className={cn(
              'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
              value.include_logo && hasLogo ? 'translate-x-5' : 'translate-x-0.5'
            )} />
          </button>
        </div>
        
        {!hasLogo && (
          <p className="text-xs text-text-tertiary">Upload a logo in your brand kit first</p>
        )}

        {value.include_logo && hasLogo && (
          <div className="space-y-3 pt-2 border-t border-border-subtle">
            {/* Logo Type */}
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-2">Type</label>
              <div className="flex flex-wrap gap-1">
                {LOGO_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => onChange({ ...value, logo_type: type.id })}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium transition-all',
                      value.logo_type === type.id
                        ? 'bg-interactive-600 text-white'
                        : 'bg-background-elevated text-text-secondary hover:bg-background-surface'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Position & Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Position</label>
                <select
                  value={value.logo_position}
                  onChange={(e) => onChange({ ...value, logo_position: e.target.value as LogoPosition })}
                  className="w-full px-2 py-1.5 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary"
                >
                  {LOGO_POSITIONS.map((pos) => (
                    <option key={pos.id} value={pos.id}>{pos.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-1">Size</label>
                <select
                  value={value.logo_size}
                  onChange={(e) => onChange({ ...value, logo_size: e.target.value as LogoSize })}
                  className="w-full px-2 py-1.5 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary"
                >
                  {LOGO_SIZES.map((size) => (
                    <option key={size.id} value={size.id}>{size.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BrandCustomizationSection;
