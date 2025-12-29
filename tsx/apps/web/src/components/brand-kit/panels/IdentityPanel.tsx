'use client';

import { useRef, useState, useEffect } from 'react';
import { SectionCard, SectionHeader, ToneSelector, SaveButton } from '../shared';
import { SparklesIcon, PaletteIcon, TypeIcon, MicIcon, PlusIcon, ImageIcon, TrashIcon } from '../icons';
import { SUPPORTED_FONTS, PRESET_PALETTES } from '../constants';
import type { IdentityPanelProps } from '../types';
import { useLogos, useUploadLogo, useDeleteLogo } from '@aurastream/api-client';

interface IdentityPanelPropsExtended extends IdentityPanelProps {
  pendingLogoFile?: File | null;
  onPendingLogoChange?: (file: File | null) => void;
}

export function IdentityPanel({ 
  identity, 
  onChange, 
  onSave, 
  isSaving,
  isNew,
  brandKitId,
  pendingLogoFile,
  onPendingLogoChange,
}: IdentityPanelPropsExtended) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // For existing brand kits, use the API
  const { data: logosData } = useLogos(brandKitId || undefined);
  const uploadMutation = useUploadLogo();
  const deleteMutation = useDeleteLogo();
  
  const existingLogo = logosData?.logos?.primary || null;

  // Update preview when pendingLogoFile changes (e.g., from parent)
  useEffect(() => {
    if (pendingLogoFile) {
      setPreviewUrl(URL.createObjectURL(pendingLogoFile));
    } else {
      setPreviewUrl(null);
    }
  }, [pendingLogoFile]);

  const handleFileSelect = (file: File) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PNG, JPEG, WebP, or SVG image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    if (isNew) {
      // For new brand kits, store the file to upload after save
      onPendingLogoChange?.(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else if (brandKitId) {
      // For existing brand kits, upload immediately
      uploadMutation.mutate({ brandKitId, logoType: 'primary', file });
    }
  };

  const handleRemoveLogo = () => {
    if (isNew) {
      onPendingLogoChange?.(null);
      setPreviewUrl(null);
    } else if (brandKitId) {
      deleteMutation.mutate({ brandKitId, logoType: 'primary' });
    }
  };

  const displayLogo = isNew ? previewUrl : existingLogo;
  const isUploading = uploadMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const addPrimaryColor = () => {
    if (identity.primaryColors.length < 5) {
      onChange({ ...identity, primaryColors: [...identity.primaryColors, '#21808D'] });
    }
  };

  const addAccentColor = () => {
    if (identity.accentColors.length < 3) {
      onChange({ ...identity, accentColors: [...identity.accentColors, '#F59E0B'] });
    }
  };

  const applyPreset = (preset: typeof PRESET_PALETTES[number]) => {
    onChange({
      ...identity,
      primaryColors: [...preset.primary],
      accentColors: [...preset.accent],
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Brand Name */}
      <SectionCard>
        <SectionHeader
          icon={<SparklesIcon />}
          title="Brand Name"
          description="Give your brand kit a memorable name"
          optional
          action={<SaveButton onClick={onSave} isSaving={isSaving} />}
        />
        
        <input
          type="text"
          value={identity.name}
          onChange={(e) => onChange({ ...identity, name: e.target.value })}
          className="w-full px-4 py-4 bg-background-base border border-border-subtle rounded-xl text-text-primary text-lg placeholder-text-muted focus:outline-none focus:border-interactive-600 focus:ring-2 focus:ring-interactive-600/20 transition-all"
          placeholder="My Gaming Brand (optional)"
        />
        <p className="text-xs text-text-muted mt-2">
          Leave empty to let AI generate a name based on your content
        </p>
      </SectionCard>

      {/* Color Palette */}
      <SectionCard>
        <SectionHeader
          icon={<PaletteIcon />}
          title="Color Palette"
          description="Choose colors that represent your brand"
          optional
        />
        
        {/* Preset Palettes */}
        <div className="mb-6">
          <p className="text-sm text-text-secondary mb-3">Quick start with a preset</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {PRESET_PALETTES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="p-2 rounded-lg border border-border-subtle hover:border-interactive-600 transition-all group"
              >
                <div className="flex gap-0.5 mb-1">
                  {[...preset.primary, ...preset.accent].map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-xs text-text-tertiary group-hover:text-text-primary truncate">
                  {preset.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border-subtle pt-6 space-y-6">
          {/* Primary Colors */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Primary Colors
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {identity.primaryColors.map((color, index) => (
                <div key={index} className="relative group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...identity.primaryColors];
                      newColors[index] = e.target.value;
                      onChange({ ...identity, primaryColors: newColors });
                    }}
                    className="w-14 h-14 rounded-xl border-2 border-border-default cursor-pointer appearance-none hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                  {identity.primaryColors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange({
                        ...identity,
                        primaryColors: identity.primaryColors.filter((_, i) => i !== index)
                      })}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-background-elevated border border-border-default rounded-full flex items-center justify-center text-text-muted hover:text-error-light hover:border-error-main opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {identity.primaryColors.length < 5 && (
                <button
                  type="button"
                  onClick={addPrimaryColor}
                  className="w-14 h-14 rounded-xl border-2 border-dashed border-border-default hover:border-interactive-600 flex items-center justify-center text-text-muted hover:text-interactive-600 transition-colors"
                >
                  <PlusIcon />
                </button>
              )}
            </div>
          </div>

          {/* Accent Colors */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Accent Colors
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {identity.accentColors.map((color, index) => (
                <div key={index} className="relative group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...identity.accentColors];
                      newColors[index] = e.target.value;
                      onChange({ ...identity, accentColors: newColors });
                    }}
                    className="w-14 h-14 rounded-xl border-2 border-border-default cursor-pointer appearance-none hover:scale-105 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                  <button
                    type="button"
                    onClick={() => onChange({
                      ...identity,
                      accentColors: identity.accentColors.filter((_, i) => i !== index)
                    })}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-background-elevated border border-border-default rounded-full flex items-center justify-center text-text-muted hover:text-error-light hover:border-error-main opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ×
                  </button>
                </div>
              ))}
              {identity.accentColors.length < 3 && (
                <button
                  type="button"
                  onClick={addAccentColor}
                  className="w-14 h-14 rounded-xl border-2 border-dashed border-border-default hover:border-accent-400 flex items-center justify-center text-text-muted hover:text-accent-400 transition-colors"
                >
                  <PlusIcon />
                </button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Typography */}
      <SectionCard>
        <SectionHeader
          icon={<TypeIcon />}
          title="Quick Typography"
          description="Basic font settings for your brand"
          optional
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Headline Font
            </label>
            <select
              value={identity.headlineFont}
              onChange={(e) => onChange({ ...identity, headlineFont: e.target.value })}
              className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-interactive-600 transition-colors"
            >
              {SUPPORTED_FONTS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Body Font
            </label>
            <select
              value={identity.bodyFont}
              onChange={(e) => onChange({ ...identity, bodyFont: e.target.value })}
              className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary focus:outline-none focus:border-interactive-600 transition-colors"
            >
              {SUPPORTED_FONTS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* Tone */}
      <SectionCard>
        <SectionHeader
          icon={<MicIcon />}
          title="Brand Tone"
          description="How your brand communicates"
          optional
        />
        <ToneSelector 
          value={identity.tone} 
          onChange={(t) => onChange({ ...identity, tone: t as any })} 
        />
      </SectionCard>

      {/* Style Reference */}
      <SectionCard>
        <SectionHeader
          icon={<SparklesIcon />}
          title="Style Reference"
          description="Describe your brand's visual style and inspirations"
          optional
        />
        <textarea
          value={identity.styleReference}
          onChange={(e) => onChange({ ...identity, styleReference: e.target.value })}
          rows={4}
          className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 focus:ring-2 focus:ring-interactive-600/20 transition-all resize-none"
          placeholder="Describe your brand style, inspirations, or reference other creators... (optional)"
        />
      </SectionCard>

      {/* Primary Logo Upload */}
      <SectionCard>
        <SectionHeader
          icon={<ImageIcon />}
          title="Primary Logo"
          description="Upload your main logo to use in generated assets"
          optional
        />
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = '';
          }}
        />

        {displayLogo ? (
          <div className="relative group">
            <div className="w-full aspect-[3/1] max-w-xs bg-background-base border border-border-subtle rounded-xl overflow-hidden">
              <img 
                src={displayLogo} 
                alt="Primary logo" 
                className="w-full h-full object-contain p-4"
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-3 py-1.5 bg-background-elevated hover:bg-background-surface text-text-primary text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Replace'}
              </button>
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-error-dark/20 hover:bg-error-dark/30 text-error-light text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <TrashIcon />
                {isDeleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
            {isNew && (
              <p className="text-xs text-text-muted mt-2">
                Logo will be uploaded when you save the brand kit
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full max-w-xs aspect-[3/1] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border-subtle hover:border-interactive-600 rounded-xl bg-background-base transition-colors cursor-pointer group"
          >
            {isUploading ? (
              <div className="w-8 h-8 border-2 border-interactive-600/30 border-t-interactive-600 rounded-full animate-spin" />
            ) : (
              <>
                <div className="w-10 h-10 bg-background-elevated rounded-lg flex items-center justify-center text-text-muted group-hover:text-interactive-600 transition-colors">
                  <ImageIcon />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-text-primary">Click to upload logo</p>
                  <p className="text-[10px] text-text-muted mt-0.5">PNG, JPEG, WebP, SVG • Max 10MB</p>
                </div>
              </>
            )}
          </button>
        )}

        <p className="text-xs text-text-tertiary mt-3">
          You can add more logo variations (icon, watermark, etc.) in the Logos panel after saving.
        </p>
      </SectionCard>
    </div>
  );
}
