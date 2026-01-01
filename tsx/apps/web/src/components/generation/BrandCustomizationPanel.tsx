'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Inline SVG Icons (replacing lucide-react)
// ============================================================================

const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

const Palette = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

const Type = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V4h16v3M9 20h6M12 4v16" />
  </svg>
);

const MessageSquare = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const Check = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

interface ColorPalette {
  primary: Array<{ hex: string; name: string }>;
  secondary: Array<{ hex: string; name: string }>;
  accent: Array<{ hex: string; name: string }>;
  gradients: Array<{ name: string; stops: Array<{ color: string; position: number }> }>;
}

interface Typography {
  display?: { family: string; weight: number };
  headline?: { family: string; weight: number };
  body?: { family: string; weight: number };
}

interface BrandVoice {
  tone: string;
  tagline?: string;
  catchphrases: string[];
}

interface BrandCustomization {
  colors?: {
    primary_index?: number;
    secondary_index?: number;
    accent_index?: number;
    use_gradient?: number;
  };
  typography?: { level: string };
  voice?: { use_tagline?: boolean; use_catchphrase?: number };
  include_logo: boolean;
  logo_type: string;
  logo_position: string;
  logo_size: string;
  brand_intensity: string;
}

interface BrandCustomizationPanelProps {
  brandKitName: string;
  colors: ColorPalette;
  typography: Typography;
  voice: BrandVoice;
  logoUrl?: string;
  value: BrandCustomization;
  onChange: (customization: BrandCustomization) => void;
}

// ============================================================================
// Color Swatch Component
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
        'group relative w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2 focus:ring-offset-background-base active:scale-95',
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-500/30 scale-110'
          : 'border-border-default hover:border-border-hover hover:scale-105'
      )}
      style={{ backgroundColor: hex }}
      aria-label={`Select ${name} color`}
      aria-pressed={isSelected}
      title={name}
    >
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Check
            className={cn(
              'w-5 h-5',
              isLightColor(hex) ? 'text-text-primary' : 'text-white'
            )}
          />
        </div>
      )}
      <span className="sr-only">{name}</span>
    </button>
  );
}

// Helper to determine if a color is light (for contrast)
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// ============================================================================
// Gradient Swatch Component
// ============================================================================

interface GradientSwatchProps {
  name: string;
  stops: Array<{ color: string; position: number }>;
  isSelected: boolean;
  onClick: () => void;
}

function GradientSwatch({ name, stops, isSelected, onClick }: GradientSwatchProps) {
  const gradientStyle = {
    background: `linear-gradient(135deg, ${stops
      .map((s) => `${s.color} ${s.position}%`)
      .join(', ')})`,
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative w-16 h-10 min-h-[44px] rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 focus:ring-offset-2 focus:ring-offset-background-base active:scale-95',
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-500/30 scale-110'
          : 'border-border-default hover:border-border-hover hover:scale-105'
      )}
      style={gradientStyle}
      aria-label={`Select ${name} gradient`}
      aria-pressed={isSelected}
      title={name}
    >
      {isSelected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md">
          <Check className="w-5 h-5 text-white" />
        </div>
      )}
      <span className="sr-only">{name}</span>
    </button>
  );
}

// ============================================================================
// Color Selection Section
// ============================================================================

interface ColorSelectionSectionProps {
  colors: ColorPalette;
  value: BrandCustomization['colors'];
  onChange: (colors: BrandCustomization['colors']) => void;
}

function ColorSelectionSection({ colors, value, onChange }: ColorSelectionSectionProps) {
  const handlePrimaryChange = (index: number) => {
    onChange({ ...value, primary_index: index });
  };

  const handleSecondaryChange = (index: number) => {
    onChange({ ...value, secondary_index: index });
  };

  const handleAccentChange = (index: number) => {
    onChange({ ...value, accent_index: index });
  };

  const handleGradientChange = (index: number | undefined) => {
    onChange({ ...value, use_gradient: index });
  };

  return (
    <div className="space-y-6">
      {/* Primary Colors */}
      {colors.primary.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Primary Color
          </label>
          <div className="flex flex-wrap gap-3" role="group" aria-label="Primary colors">
            {colors.primary.map((color, index) => (
              <ColorSwatch
                key={`primary-${index}`}
                hex={color.hex}
                name={color.name}
                isSelected={value?.primary_index === index}
                onClick={() => handlePrimaryChange(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Secondary Colors */}
      {colors.secondary.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Secondary Color
          </label>
          <div className="flex flex-wrap gap-3" role="group" aria-label="Secondary colors">
            {colors.secondary.map((color, index) => (
              <ColorSwatch
                key={`secondary-${index}`}
                hex={color.hex}
                name={color.name}
                isSelected={value?.secondary_index === index}
                onClick={() => handleSecondaryChange(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Accent Colors */}
      {colors.accent.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Accent Color
          </label>
          <div className="flex flex-wrap gap-3" role="group" aria-label="Accent colors">
            {colors.accent.map((color, index) => (
              <ColorSwatch
                key={`accent-${index}`}
                hex={color.hex}
                name={color.name}
                isSelected={value?.accent_index === index}
                onClick={() => handleAccentChange(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Gradients */}
      {colors.gradients.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Gradient (Optional)
          </label>
          <div className="flex flex-wrap gap-3" role="group" aria-label="Gradients">
            <button
              type="button"
              onClick={() => handleGradientChange(undefined)}
              className={cn(
                'w-16 h-10 min-h-[44px] rounded-lg border-2 transition-all text-xs font-medium focus:outline-none focus:ring-2 focus:ring-interactive-500 active:scale-95',
                value?.use_gradient === undefined
                  ? 'border-primary-500 bg-background-elevated text-text-primary'
                  : 'border-border-default bg-background-surface text-text-secondary hover:border-border-hover'
              )}
              aria-pressed={value?.use_gradient === undefined}
            >
              None
            </button>
            {colors.gradients.map((gradient, index) => (
              <GradientSwatch
                key={`gradient-${index}`}
                name={gradient.name}
                stops={gradient.stops}
                isSelected={value?.use_gradient === index}
                onClick={() => handleGradientChange(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Typography Selection Section
// ============================================================================

interface TypographySelectionSectionProps {
  typography: Typography;
  value: BrandCustomization['typography'];
  onChange: (typography: BrandCustomization['typography']) => void;
}

const TYPOGRAPHY_LEVELS = [
  { id: 'minimal', label: 'Minimal', description: 'Body font only' },
  { id: 'standard', label: 'Standard', description: 'Headlines + Body' },
  { id: 'full', label: 'Full', description: 'Display + Headlines + Body' },
] as const;

function TypographySelectionSection({
  typography,
  value,
  onChange,
}: TypographySelectionSectionProps) {
  const selectedLevel = value?.level || 'standard';

  return (
    <div className="space-y-6">
      {/* Typography Level Selector */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Typography Level
        </label>
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Typography level">
          {TYPOGRAPHY_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              role="radio"
              aria-checked={selectedLevel === level.id}
              onClick={() => onChange({ level: level.id })}
              className={cn(
                'p-3 min-h-[44px] rounded-lg border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 active:scale-[0.98]',
                selectedLevel === level.id
                  ? 'border-primary-500 bg-primary-500/5'
                  : 'border-border-default bg-background-surface hover:border-border-hover'
              )}
            >
              <div className="font-medium text-text-primary text-sm">{level.label}</div>
              <div className="text-xs text-text-tertiary mt-1">{level.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Font Preview */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Font Preview
        </label>
        <div className="p-4 bg-background-elevated rounded-lg border border-border-default space-y-3">
          {typography.display && (selectedLevel === 'full') && (
            <div>
              <span className="text-xs text-text-tertiary block mb-1">Display</span>
              <p
                className="text-2xl text-text-primary"
                style={{
                  fontFamily: typography.display.family,
                  fontWeight: typography.display.weight,
                }}
              >
                {typography.display.family}
              </p>
            </div>
          )}
          {typography.headline && (selectedLevel === 'standard' || selectedLevel === 'full') && (
            <div>
              <span className="text-xs text-text-tertiary block mb-1">Headline</span>
              <p
                className="text-xl text-text-primary"
                style={{
                  fontFamily: typography.headline.family,
                  fontWeight: typography.headline.weight,
                }}
              >
                {typography.headline.family}
              </p>
            </div>
          )}
          {typography.body && (
            <div>
              <span className="text-xs text-text-tertiary block mb-1">Body</span>
              <p
                className="text-base text-text-primary"
                style={{
                  fontFamily: typography.body.family,
                  fontWeight: typography.body.weight,
                }}
              >
                {typography.body.family}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Voice Selection Section
// ============================================================================

interface VoiceSelectionSectionProps {
  voice: BrandVoice;
  value: BrandCustomization['voice'];
  onChange: (voice: BrandCustomization['voice']) => void;
}

function VoiceSelectionSection({ voice, value, onChange }: VoiceSelectionSectionProps) {
  const handleTaglineToggle = () => {
    onChange({
      ...value,
      use_tagline: !value?.use_tagline,
    });
  };

  const handleCatchphraseSelect = (index: number | undefined) => {
    onChange({
      ...value,
      use_catchphrase: index,
    });
  };

  return (
    <div className="space-y-6">
      {/* Tone Display */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Brand Tone
        </label>
        <div className="px-4 py-3 bg-background-elevated rounded-lg border border-border-default">
          <span className="text-text-primary font-medium capitalize">{voice.tone}</span>
        </div>
      </div>

      {/* Tagline Toggle */}
      {voice.tagline && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Tagline
          </label>
          <button
            type="button"
            onClick={handleTaglineToggle}
            className={cn(
              'w-full p-4 min-h-[44px] rounded-lg border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 active:scale-[0.99]',
              value?.use_tagline
                ? 'border-primary-500 bg-primary-500/5'
                : 'border-border-default bg-background-surface hover:border-border-hover'
            )}
            aria-pressed={value?.use_tagline}
          >
            <div className="flex items-center justify-between">
              <span className="text-text-primary italic">&ldquo;{voice.tagline}&rdquo;</span>
              <div
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  value?.use_tagline
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-border-default'
                )}
              >
                {value?.use_tagline && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Catchphrases */}
      {voice.catchphrases.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Catchphrase (Optional)
          </label>
          <div className="space-y-2" role="group" aria-label="Catchphrases">
            <button
              type="button"
              onClick={() => handleCatchphraseSelect(undefined)}
              className={cn(
                'w-full p-3 min-h-[44px] rounded-lg border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 active:scale-[0.99]',
                value?.use_catchphrase === undefined
                  ? 'border-primary-500 bg-primary-500/5'
                  : 'border-border-default bg-background-surface hover:border-border-hover'
              )}
              aria-pressed={value?.use_catchphrase === undefined}
            >
              <span className="text-text-secondary text-sm">None</span>
            </button>
            {voice.catchphrases.map((phrase, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleCatchphraseSelect(index)}
                className={cn(
                  'w-full p-3 min-h-[44px] rounded-lg border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 active:scale-[0.99]',
                  value?.use_catchphrase === index
                    ? 'border-primary-500 bg-primary-500/5'
                    : 'border-border-default bg-background-surface hover:border-border-hover'
                )}
                aria-pressed={value?.use_catchphrase === index}
              >
                <span className="text-text-primary">&ldquo;{phrase}&rdquo;</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Logo Selection Section
// ============================================================================

interface LogoSelectionSectionProps {
  logoUrl?: string;
  value: Pick<BrandCustomization, 'include_logo' | 'logo_type' | 'logo_position' | 'logo_size'>;
  onChange: (logo: Pick<BrandCustomization, 'include_logo' | 'logo_type' | 'logo_position' | 'logo_size'>) => void;
}

const LOGO_TYPES = [
  { id: 'full', label: 'Full Logo' },
  { id: 'icon', label: 'Icon Only' },
  { id: 'wordmark', label: 'Wordmark' },
] as const;

const LOGO_POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'center', label: 'Center' },
] as const;

const LOGO_SIZES = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
] as const;

function LogoSelectionSection({ logoUrl, value, onChange }: LogoSelectionSectionProps) {
  const handleIncludeToggle = () => {
    onChange({ ...value, include_logo: !value.include_logo });
  };

  const handleTypeChange = (type: string) => {
    onChange({ ...value, logo_type: type });
  };

  const handlePositionChange = (position: string) => {
    onChange({ ...value, logo_position: position });
  };

  const handleSizeChange = (size: string) => {
    onChange({ ...value, logo_size: size });
  };

  return (
    <div className="space-y-6">
      {/* Logo Preview & Toggle */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          Include Logo
        </label>
        <button
          type="button"
          onClick={handleIncludeToggle}
          className={cn(
            'w-full p-4 min-h-[44px] rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 active:scale-[0.99]',
            value.include_logo
              ? 'border-primary-500 bg-primary-500/5'
              : 'border-border-default bg-background-surface hover:border-border-hover'
          )}
          aria-pressed={value.include_logo}
        >
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="w-16 h-16 rounded-lg bg-background-elevated border border-border-default flex items-center justify-center overflow-hidden">
                <img
                  src={logoUrl}
                  alt="Brand logo"
                  loading="lazy"
                  decoding="async"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-background-elevated border border-border-default flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-text-tertiary" />
              </div>
            )}
            <div className="flex-1 text-left">
              <div className="font-medium text-text-primary">
                {value.include_logo ? 'Logo Included' : 'Logo Not Included'}
              </div>
              <div className="text-sm text-text-secondary">
                {logoUrl ? 'Click to toggle logo visibility' : 'No logo uploaded'}
              </div>
            </div>
            <div
              className={cn(
                'w-6 h-6 rounded border-2 flex items-center justify-center transition-colors',
                value.include_logo
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-border-default'
              )}
            >
              {value.include_logo && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
        </button>
      </div>

      {/* Logo Options (only shown when logo is included) */}
      {value.include_logo && (
        <>
          {/* Logo Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Logo Type
            </label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Logo type">
              {LOGO_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  role="radio"
                  aria-checked={value.logo_type === type.id}
                  onClick={() => handleTypeChange(type.id)}
                  className={cn(
                    'px-3 py-2 min-h-[44px] rounded-lg border-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 active:scale-95',
                    value.logo_type === type.id
                      ? 'border-primary-500 bg-primary-500/5 text-text-primary'
                      : 'border-border-default bg-background-surface text-text-secondary hover:border-border-hover'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logo Position */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Position
            </label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Logo position">
              {LOGO_POSITIONS.map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  role="radio"
                  aria-checked={value.logo_position === pos.id}
                  onClick={() => handlePositionChange(pos.id)}
                  className={cn(
                    'px-3 py-2 min-h-[44px] rounded-lg border-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 active:scale-95',
                    value.logo_position === pos.id
                      ? 'border-primary-500 bg-primary-500/5 text-text-primary'
                      : 'border-border-default bg-background-surface text-text-secondary hover:border-border-hover'
                  )}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logo Size */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Size
            </label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Logo size">
              {LOGO_SIZES.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  role="radio"
                  aria-checked={value.logo_size === size.id}
                  onClick={() => handleSizeChange(size.id)}
                  className={cn(
                    'px-3 py-2 min-h-[44px] rounded-lg border-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 active:scale-95',
                    value.logo_size === size.id
                      ? 'border-primary-500 bg-primary-500/5 text-text-primary'
                      : 'border-border-default bg-background-surface text-text-secondary hover:border-border-hover'
                  )}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Intensity Selector
// ============================================================================

interface IntensitySelectorProps {
  value: string;
  onChange: (intensity: string) => void;
}

const INTENSITY_OPTIONS = [
  { id: 'subtle', label: 'Subtle', description: 'Light brand presence' },
  { id: 'balanced', label: 'Balanced', description: 'Moderate brand presence' },
  { id: 'strong', label: 'Strong', description: 'Bold brand presence' },
] as const;

function IntensitySelector({ value, onChange }: IntensitySelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-3">
        Brand Intensity
      </label>
      <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Brand intensity">
        {INTENSITY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              'p-3 min-h-[44px] rounded-lg border-2 text-center transition-all focus:outline-none focus:ring-2 focus:ring-interactive-500 active:scale-[0.98]',
              value === option.id
                ? 'border-primary-500 bg-primary-500/5'
                : 'border-border-default bg-background-surface hover:border-border-hover'
            )}
          >
            <div className="font-medium text-text-primary text-sm">{option.label}</div>
            <div className="text-xs text-text-tertiary mt-1">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Accordion Section
// ============================================================================

interface AccordionSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: AccordionSectionProps) {
  return (
    <div className="border-b border-border-default last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 min-h-[44px] text-left hover:bg-background-elevated/50 active:bg-background-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-interactive-500"
        aria-expanded={isOpen}
        aria-controls={`section-${id}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-text-secondary">{icon}</span>
          <span className="font-medium text-text-primary">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-text-tertiary" />
        ) : (
          <ChevronDown className="w-5 h-5 text-text-tertiary" />
        )}
      </button>
      {isOpen && (
        <div
          id={`section-${id}`}
          className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200"
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BrandCustomizationPanel({
  brandKitName,
  colors,
  typography,
  voice,
  logoUrl,
  value,
  onChange,
}: BrandCustomizationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<'colors' | 'typography' | 'voice' | 'logo' | null>(null);

  const handleSectionToggle = (section: 'colors' | 'typography' | 'voice' | 'logo') => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleColorsChange = (newColors: BrandCustomization['colors']) => {
    onChange({ ...value, colors: newColors });
  };

  const handleTypographyChange = (newTypography: BrandCustomization['typography']) => {
    onChange({ ...value, typography: newTypography });
  };

  const handleVoiceChange = (newVoice: BrandCustomization['voice']) => {
    onChange({ ...value, voice: newVoice });
  };

  const handleLogoChange = (newLogo: Pick<BrandCustomization, 'include_logo' | 'logo_type' | 'logo_position' | 'logo_size'>) => {
    onChange({ ...value, ...newLogo });
  };

  const handleIntensityChange = (intensity: string) => {
    onChange({ ...value, brand_intensity: intensity });
  };

  // Generate summary text for collapsed state
  const getSummaryText = () => {
    const parts: string[] = [];
    
    if (value.colors?.primary_index !== undefined) {
      const primaryColor = colors.primary[value.colors.primary_index];
      if (primaryColor) parts.push(primaryColor.name);
    }
    
    if (value.include_logo) {
      parts.push('Logo');
    }
    
    if (value.brand_intensity && value.brand_intensity !== 'balanced') {
      parts.push(`${value.brand_intensity} intensity`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Default settings';
  };

  return (
    <div className="bg-background-surface border border-border-default rounded-xl overflow-hidden">
      {/* Collapsed Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 min-h-[44px] text-left hover:bg-background-elevated/50 active:bg-background-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-interactive-500"
        aria-expanded={isExpanded}
        aria-controls="brand-customization-content"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary-500" />
            <span className="font-semibold text-text-primary">Brand Customization</span>
          </div>
          <p className="text-sm text-text-secondary mt-1 truncate">
            Using: <span className="font-medium">{brandKitName}</span> defaults
            {!isExpanded && (
              <span className="text-text-tertiary"> • {getSummaryText()}</span>
            )}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-tertiary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-tertiary" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          id="brand-customization-content"
          className="border-t border-border-default animate-in slide-in-from-top-2 duration-200"
        >
          {/* Brand Intensity (always visible when expanded) */}
          <div className="p-4 border-b border-border-default">
            <IntensitySelector
              value={value.brand_intensity}
              onChange={handleIntensityChange}
            />
          </div>

          {/* Accordion Sections */}
          <AccordionSection
            id="colors"
            title="Colors"
            icon={<Palette className="w-5 h-5" />}
            isOpen={activeSection === 'colors'}
            onToggle={() => handleSectionToggle('colors')}
          >
            <ColorSelectionSection
              colors={colors}
              value={value.colors}
              onChange={handleColorsChange}
            />
          </AccordionSection>

          <AccordionSection
            id="typography"
            title="Typography"
            icon={<Type className="w-5 h-5" />}
            isOpen={activeSection === 'typography'}
            onToggle={() => handleSectionToggle('typography')}
          >
            <TypographySelectionSection
              typography={typography}
              value={value.typography}
              onChange={handleTypographyChange}
            />
          </AccordionSection>

          <AccordionSection
            id="voice"
            title="Voice"
            icon={<MessageSquare className="w-5 h-5" />}
            isOpen={activeSection === 'voice'}
            onToggle={() => handleSectionToggle('voice')}
          >
            <VoiceSelectionSection
              voice={voice}
              value={value.voice}
              onChange={handleVoiceChange}
            />
          </AccordionSection>

          <AccordionSection
            id="logo"
            title="Logo"
            icon={<ImageIcon className="w-5 h-5" />}
            isOpen={activeSection === 'logo'}
            onToggle={() => handleSectionToggle('logo')}
          >
            <LogoSelectionSection
              logoUrl={logoUrl}
              value={{
                include_logo: value.include_logo,
                logo_type: value.logo_type,
                logo_position: value.logo_position,
                logo_size: value.logo_size,
              }}
              onChange={handleLogoChange}
            />
          </AccordionSection>
        </div>
      )}
    </div>
  );
}

export default BrandCustomizationPanel;

// Export types for external use
export type {
  ColorPalette,
  Typography,
  BrandVoice,
  BrandCustomization,
  BrandCustomizationPanelProps,
};
