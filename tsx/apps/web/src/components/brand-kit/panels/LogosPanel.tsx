'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SectionCard, SectionHeader } from '../shared';
import { ImageIcon, SparklesIcon, TrashIcon } from '../icons';
import { LOGO_TYPES } from '../constants';
import { useLogos, useUploadLogo, useDeleteLogo, useSetDefaultLogo, type LogoType } from '@aurastream/api-client';
import type { LogosPanelProps } from '../types';

export function LogosPanel({ brandKitId, isNew }: LogosPanelProps) {
  const { data: logosData, isLoading } = useLogos(brandKitId || undefined);
  const uploadMutation = useUploadLogo();
  const deleteMutation = useDeleteLogo();
  const setDefaultMutation = useSetDefaultLogo();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [selectedLogo, setSelectedLogo] = useState<LogoType | null>(null);

  const logos = logosData?.logos || {
    primary: null,
    secondary: null,
    icon: null,
    monochrome: null,
    watermark: null,
  };
  
  const defaultLogoType = logosData?.defaultLogoType || 'primary';

  const handleFileSelect = async (logoType: LogoType, file: File) => {
    if (!brandKitId) return;
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PNG, JPEG, WebP, or SVG image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    try {
      await uploadMutation.mutateAsync({ brandKitId, logoType, file });
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleDelete = async (logoType: LogoType) => {
    if (!brandKitId || !confirm(`Delete ${logoType} logo?`)) return;
    try {
      await deleteMutation.mutateAsync({ brandKitId, logoType });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSetDefault = async (logoType: LogoType) => {
    if (!brandKitId) return;
    try {
      await setDefaultMutation.mutateAsync({ brandKitId, logoType });
    } catch (error) {
      console.error('Set default failed:', error);
    }
  };

  // Get uploaded logos for the gallery
  const uploadedLogos = Object.entries(logos).filter(([_, url]) => url != null) as [LogoType, string][];

  if (isNew || !brandKitId) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <SectionCard>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-background-elevated rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ImageIcon />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Save Your Brand Kit First
            </h3>
            <p className="text-text-secondary max-w-md mx-auto">
              Create your brand kit with basic identity settings, then come back to upload logos.
            </p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Logo Gallery - Shows uploaded logos */}
      {uploadedLogos.length > 0 && (
        <SectionCard>
          <SectionHeader
            icon={<ImageIcon />}
            title="Your Logos"
            description="Click a logo to view details, or set it as default for asset generation"
          />
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadedLogos.map(([type, url]) => {
              const logoInfo = LOGO_TYPES.find(l => l.type === type);
              const isDefault = defaultLogoType === type;
              const isSelected = selectedLogo === type;
              
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedLogo(isSelected ? null : type)}
                  className={cn(
                    "relative group rounded-xl border-2 overflow-hidden transition-all duration-200 aspect-square",
                    isSelected
                      ? "border-interactive-600 ring-2 ring-interactive-600/30"
                      : isDefault
                        ? "border-success-main"
                        : "border-border-subtle hover:border-border-default"
                  )}
                >
                <img src={url} alt={logoInfo?.label || type} loading="lazy" decoding="async" className="w-full h-full object-contain p-3 bg-background-elevated" />
                  
                  {/* Default badge */}
                  {isDefault && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-success-dark text-success-light text-xs font-medium rounded">
                      Default
                    </div>
                  )}
                  
                  {/* Type label */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-background-base to-transparent">
                    <p className="text-xs font-medium text-text-primary truncate">{logoInfo?.label || type}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected logo actions */}
          {selectedLogo && logos[selectedLogo] && (
            <div className="mt-4 p-4 bg-background-base rounded-xl border border-border-subtle animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img 
                    src={logos[selectedLogo]!} 
                    alt={selectedLogo} 
                    loading="lazy"
                    decoding="async"
                    className="w-16 h-16 object-contain bg-background-elevated rounded-lg p-2"
                  />
                  <div>
                    <p className="font-medium text-text-primary">
                      {LOGO_TYPES.find(l => l.type === selectedLogo)?.label || selectedLogo}
                    </p>
                    <p className="text-sm text-text-tertiary">
                      {LOGO_TYPES.find(l => l.type === selectedLogo)?.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {defaultLogoType !== selectedLogo && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(selectedLogo)}
                      disabled={setDefaultMutation.isPending}
                      className="px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {setDefaultMutation.isPending ? 'Setting...' : 'Set as Default'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[selectedLogo]?.click()}
                    disabled={uploadMutation.isPending}
                    className="px-4 py-2 bg-background-elevated hover:bg-background-surface text-text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(selectedLogo);
                      setSelectedLogo(null);
                    }}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 bg-error-dark/20 hover:bg-error-dark/30 text-error-light text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* Upload Section */}
      <SectionCard>
        <SectionHeader
          icon={<ImageIcon />}
          title="Upload Logos"
          description="Add different logo variations for various use cases"
          optional
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LOGO_TYPES.map(({ type, label, description, recommended }) => {
            const logoUrl = logos[type];
            const isUploading = uploadMutation.isPending && uploadMutation.variables?.logoType === type;
            const isDeleting = deleteMutation.isPending && deleteMutation.variables?.logoType === type;
            const isDefault = defaultLogoType === type;

            return (
              <div
                key={type}
                className={cn(
                  "relative group rounded-xl border-2 overflow-hidden transition-all duration-200",
                  logoUrl 
                    ? "border-border-default bg-background-elevated/30" 
                    : "border-dashed border-border-subtle hover:border-interactive-600 bg-background-base"
                )}
              >
                <input
                  ref={(el) => { fileInputRefs.current[type] = el; }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(type, file);
                    e.target.value = '';
                  }}
                />

                {logoUrl ? (
                  <div className="aspect-square relative">
                    <img src={logoUrl} alt={label} loading="lazy" decoding="async" className="w-full h-full object-contain p-4" />
                    
                    <div className="absolute inset-0 bg-background-base/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[type]?.click()}
                        disabled={isUploading}
                        className="px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUploading ? 'Uploading...' : 'Replace'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(type)}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-error-dark hover:bg-error-main text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? '...' : <TrashIcon />}
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background-base to-transparent">
                      <p className="text-sm font-medium text-text-primary">{label}</p>
                    </div>

                    {isDefault && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-success-dark text-success-light text-xs font-medium rounded-full">
                        Default
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[type]?.click()}
                    disabled={isUploading}
                    className="w-full aspect-square flex flex-col items-center justify-center gap-3 p-4 cursor-pointer"
                  >
                    {isUploading ? (
                      <div className="w-10 h-10 border-3 border-interactive-600/30 border-t-interactive-600 rounded-full animate-spin" />
                    ) : (
                      <div className="w-12 h-12 bg-background-elevated rounded-xl flex items-center justify-center text-text-muted group-hover:text-interactive-600 transition-colors">
                        <ImageIcon />
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-sm font-medium text-text-primary">{label}</p>
                      <p className="text-xs text-text-muted mt-1">{description}</p>
                      <p className="text-xs text-text-tertiary mt-2">{recommended}</p>
                      <p className="text-xs text-interactive-600 mt-2 font-medium">Click to upload</p>
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-interactive-600/5 border border-interactive-600/20 rounded-xl">
          <div className="flex gap-3">
            <SparklesIcon />
            <div>
              <p className="text-sm font-medium text-text-primary">Logo in Generated Assets</p>
              <p className="text-sm text-text-secondary mt-1">
                Your <span className="text-interactive-600 font-medium">default logo</span> will be automatically composited onto generated images. 
                You can change which logo is used during generation. All logo uploads are optional.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
