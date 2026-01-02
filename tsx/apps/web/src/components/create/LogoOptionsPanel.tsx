/**
 * Logo options panel for configuring logo placement on generated assets.
 * @module create/LogoOptionsPanel
 */

'use client';

import { cn } from '@/lib/utils';
import { LOGO_POSITIONS, LOGO_SIZES, LOGO_TYPES, BRAND_INTENSITIES } from './constants';
import type { LogoPosition, LogoSize, LogoType, BrandIntensity } from '@aurastream/api-client';

interface LogoOptionsPanelProps {
  hasLogo: boolean;
  includeLogo: boolean;
  logoPosition: LogoPosition;
  logoSize: LogoSize;
  logoType: LogoType;
  brandIntensity: BrandIntensity;
  onIncludeLogoChange: (include: boolean) => void;
  onPositionChange: (position: LogoPosition) => void;
  onSizeChange: (size: LogoSize) => void;
  onLogoTypeChange: (type: LogoType) => void;
  onBrandIntensityChange: (intensity: BrandIntensity) => void;
}

export function LogoOptionsPanel({
  hasLogo,
  includeLogo,
  logoPosition,
  logoSize,
  logoType,
  brandIntensity,
  onIncludeLogoChange,
  onPositionChange,
  onSizeChange,
  onLogoTypeChange,
  onBrandIntensityChange,
}: LogoOptionsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Brand Intensity Selector */}
      <div className="p-4 bg-background-surface/50 border border-border-subtle rounded-xl">
        <h3 className="font-medium text-text-primary mb-3">Brand Intensity</h3>
        <p className="text-sm text-text-tertiary mb-4">
          How strongly should your brand elements appear in the generated asset?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {BRAND_INTENSITIES.map((intensity) => (
            <button
              key={intensity.id}
              onClick={() => onBrandIntensityChange(intensity.id)}
              className={cn(
                "p-3 rounded-lg border-2 text-center transition-all",
                brandIntensity === intensity.id
                  ? "border-interactive-600 bg-interactive-600/10"
                  : "border-border-subtle bg-background-base hover:border-border-default"
              )}
            >
              <div className="font-medium text-sm text-text-primary">{intensity.label}</div>
              <div className="text-xs text-text-tertiary mt-1">{intensity.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Logo Options */}
      <div className="p-4 bg-background-surface/50 border border-border-subtle rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-text-primary">Include Logo</h3>
            <p className="text-sm text-text-tertiary">
              {hasLogo ? 'Add your brand logo to the asset' : 'Upload a logo in your brand kit first'}
            </p>
          </div>
          <button
            onClick={() => onIncludeLogoChange(!includeLogo)}
            disabled={!hasLogo}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors",
              includeLogo && hasLogo ? "bg-interactive-600" : "bg-background-elevated",
              !hasLogo && "opacity-50 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                includeLogo && hasLogo ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {includeLogo && hasLogo && (
          <div className="space-y-4 pt-2 border-t border-border-subtle">
            {/* Logo Type */}
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-2">Logo Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LOGO_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => onLogoTypeChange(type.id)}
                    className={cn(
                      "p-2 rounded-lg border text-left transition-all",
                      logoType === type.id
                        ? "border-interactive-600 bg-interactive-600/10"
                        : "border-border-subtle bg-background-base hover:border-border-default"
                    )}
                  >
                    <div className="font-medium text-xs text-text-primary">{type.label}</div>
                    <div className="text-xs text-text-tertiary truncate">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Position and Size */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2">Position</label>
                <select
                  value={logoPosition}
                  onChange={(e) => onPositionChange(e.target.value as LogoPosition)}
                  className="w-full px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-interactive-600"
                >
                  {LOGO_POSITIONS.map((pos) => (
                    <option key={pos.id} value={pos.id}>{pos.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2">Size</label>
                <select
                  value={logoSize}
                  onChange={(e) => onSizeChange(e.target.value as LogoSize)}
                  className="w-full px-3 py-2 bg-background-base border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-interactive-600"
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
