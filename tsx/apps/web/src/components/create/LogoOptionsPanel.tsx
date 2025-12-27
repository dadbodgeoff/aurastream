/**
 * Logo options panel for configuring logo placement on generated assets.
 * @module create/LogoOptionsPanel
 */

'use client';

import { cn } from '@/lib/utils';
import { LOGO_POSITIONS, LOGO_SIZES } from './constants';
import type { LogoPosition, LogoSize } from '@aurastream/api-client';

interface LogoOptionsPanelProps {
  hasLogo: boolean;
  includeLogo: boolean;
  logoPosition: LogoPosition;
  logoSize: LogoSize;
  onIncludeLogoChange: (include: boolean) => void;
  onPositionChange: (position: LogoPosition) => void;
  onSizeChange: (size: LogoSize) => void;
}

export function LogoOptionsPanel({
  hasLogo,
  includeLogo,
  logoPosition,
  logoSize,
  onIncludeLogoChange,
  onPositionChange,
  onSizeChange,
}: LogoOptionsPanelProps) {
  return (
    <div className="p-5 bg-background-surface/50 border border-border-subtle rounded-xl space-y-4">
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
        <div className="grid grid-cols-2 gap-4 pt-2">
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
      )}
    </div>
  );
}
