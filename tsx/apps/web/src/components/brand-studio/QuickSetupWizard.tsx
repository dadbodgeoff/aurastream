/**
 * QuickSetupWizard - Simplified brand kit creation
 * 
 * Two-step wizard:
 * 1. Quick Setup: Name, colors, tone (all optional)
 * 2. Success: Option to customize more or start using
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, Sparkles, ArrowLeft, Palette } from 'lucide-react';
import confetti from 'canvas-confetti';

import { useCreateBrandKit, type BrandKitTone } from '@aurastream/api-client';
import { useSimpleAnalytics } from '@aurastream/shared';
import { showSuccessToast, showErrorToast } from '@/utils/errorMessages';
import { cn } from '@/lib/utils';

// Preset palettes for quick selection
const PRESET_PALETTES = [
  {
    id: 'neon',
    name: 'Neon Gaming',
    primary: ['#FF00FF', '#00FFFF'],
    accent: ['#FFFF00'],
    preview: 'linear-gradient(135deg, #FF00FF 0%, #00FFFF 100%)',
  },
  {
    id: 'professional',
    name: 'Professional',
    primary: ['#1E3A5F', '#2E5077'],
    accent: ['#F5A623'],
    preview: 'linear-gradient(135deg, #1E3A5F 0%, #2E5077 100%)',
  },
  {
    id: 'sunset',
    name: 'Warm Sunset',
    primary: ['#FF6B6B', '#FFA07A'],
    accent: ['#FFD93D'],
    preview: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)',
  },
  {
    id: 'ocean',
    name: 'Cool Ocean',
    primary: ['#0077B6', '#00B4D8'],
    accent: ['#90E0EF'],
    preview: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)',
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    primary: ['#1A1A2E', '#16213E'],
    accent: ['#E94560'],
    preview: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
  },
  {
    id: 'pastel',
    name: 'Pastel Dream',
    primary: ['#FFB5E8', '#B5DEFF'],
    accent: ['#B5FFB8'],
    preview: 'linear-gradient(135deg, #FFB5E8 0%, #B5DEFF 100%)',
  },
];

const TONES: { value: BrandKitTone; label: string; emoji: string }[] = [
  { value: 'competitive', label: 'Competitive', emoji: '🔥' },
  { value: 'casual', label: 'Casual', emoji: '😎' },
  { value: 'educational', label: 'Educational', emoji: '📚' },
  { value: 'comedic', label: 'Comedic', emoji: '😂' },
  { value: 'professional', label: 'Professional', emoji: '💼' },
];

interface QuickSetupWizardProps {
  onComplete: (brandKitId: string) => void;
  onCancel: () => void;
}

type WizardStep = 'setup' | 'creating' | 'success';

export function QuickSetupWizard({ onComplete, onCancel }: QuickSetupWizardProps) {
  const router = useRouter();
  const createMutation = useCreateBrandKit();
  const { trackEvent } = useSimpleAnalytics();
  
  const [step, setStep] = useState<WizardStep>('setup');
  const [createdKitId, setCreatedKitId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState<string[]>(['#21808D']);
  const [accentColors, setAccentColors] = useState<string[]>([]);
  const [tone, setTone] = useState<BrandKitTone>('professional');
  const [useCustomColors, setUseCustomColors] = useState(false);

  const getColors = () => {
    if (useCustomColors) {
      return { primary: customColors, accent: accentColors };
    }
    const preset = PRESET_PALETTES.find(p => p.id === selectedPreset);
    return preset 
      ? { primary: preset.primary, accent: preset.accent }
      : { primary: ['#21808D'], accent: [] };
  };

  const handleCreate = useCallback(async () => {
    setStep('creating');
    
    const colors = getColors();
    
    try {
      const result = await createMutation.mutateAsync({
        name: name.trim() || 'My Brand Kit',
        primary_colors: colors.primary,
        accent_colors: colors.accent,
        fonts: { headline: 'Montserrat', body: 'Inter' },
        tone,
      });
      
      setCreatedKitId(result.id);
      setStep('success');
      
      // Track brand kit creation
      trackEvent('brand_kit_created', { brandKitId: result.id, tone });
      
      // Celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      
    } catch (err) {
      setStep('setup');
      showErrorToast(err as Error, {
        onRetry: handleCreate,
      });
    }
  }, [name, selectedPreset, customColors, accentColors, tone, useCustomColors, createMutation]);

  const handleCustomize = () => {
    if (createdKitId) {
      router.push(`/dashboard/brand-kits?id=${createdKitId}`);
    }
  };

  const handleUseKit = () => {
    if (createdKitId) {
      onComplete(createdKitId);
      showSuccessToast('Brand kit created!', {
        description: 'Your brand kit is ready to use',
        actionLabel: 'Create Asset',
        onAction: () => router.push('/dashboard/create'),
      });
    }
  };

  return (
    <div className="min-h-[500px] flex flex-col">
      <AnimatePresence mode="wait">
        {step === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1"
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={onCancel}
                className="p-2 hover:bg-background-elevated rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-text-secondary" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Quick Setup</h2>
                <p className="text-text-secondary text-sm">
                  Create your brand kit in seconds. All fields are optional.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Brand Name */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Brand Name <span className="text-text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Gaming Brand"
                  className="w-full px-4 py-3 bg-background-base border border-border-subtle rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 focus:ring-2 focus:ring-interactive-600/20 transition-all"
                  maxLength={50}
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Choose Your Colors
                </label>
                
                {/* Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setUseCustomColors(false)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      !useCustomColors
                        ? "bg-interactive-600 text-white"
                        : "bg-background-elevated text-text-secondary hover:text-text-primary"
                    )}
                  >
                    Presets
                  </button>
                  <button
                    onClick={() => setUseCustomColors(true)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      useCustomColors
                        ? "bg-interactive-600 text-white"
                        : "bg-background-elevated text-text-secondary hover:text-text-primary"
                    )}
                  >
                    Custom
                  </button>
                </div>

                {!useCustomColors ? (
                  /* Preset Palettes */
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {PRESET_PALETTES.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPreset(preset.id)}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all text-left",
                          selectedPreset === preset.id
                            ? "border-interactive-600 bg-interactive-600/5"
                            : "border-border-subtle hover:border-border-default"
                        )}
                      >
                        <div
                          className="w-full h-8 rounded-lg mb-2"
                          style={{ background: preset.preview }}
                        />
                        <p className="text-sm font-medium text-text-primary truncate">
                          {preset.name}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {[...preset.primary, ...preset.accent].map((c, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Custom Colors */
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-text-muted mb-2">Primary Colors</p>
                      <div className="flex flex-wrap gap-2">
                        {customColors.map((color, i) => (
                          <div key={i} className="relative group">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => {
                                const newColors = [...customColors];
                                newColors[i] = e.target.value;
                                setCustomColors(newColors);
                              }}
                              className="w-12 h-12 rounded-lg border-2 border-border-default cursor-pointer"
                            />
                            {customColors.length > 1 && (
                              <button
                                onClick={() => setCustomColors(customColors.filter((_, idx) => idx !== i))}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-background-elevated border border-border-default rounded-full text-xs text-text-muted hover:text-error-light opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        {customColors.length < 5 && (
                          <button
                            onClick={() => setCustomColors([...customColors, '#21808D'])}
                            className="w-12 h-12 rounded-lg border-2 border-dashed border-border-default hover:border-interactive-600 flex items-center justify-center text-text-muted hover:text-interactive-600 transition-colors"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted mb-2">Accent Colors (optional)</p>
                      <div className="flex flex-wrap gap-2">
                        {accentColors.map((color, i) => (
                          <div key={i} className="relative group">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) => {
                                const newColors = [...accentColors];
                                newColors[i] = e.target.value;
                                setAccentColors(newColors);
                              }}
                              className="w-12 h-12 rounded-lg border-2 border-border-default cursor-pointer"
                            />
                            <button
                              onClick={() => setAccentColors(accentColors.filter((_, idx) => idx !== i))}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-background-elevated border border-border-default rounded-full text-xs text-text-muted hover:text-error-light opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {accentColors.length < 3 && (
                          <button
                            onClick={() => setAccentColors([...accentColors, '#F59E0B'])}
                            className="w-12 h-12 rounded-lg border-2 border-dashed border-border-default hover:border-accent-400 flex items-center justify-center text-text-muted hover:text-accent-400 transition-colors"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-3">
                  Brand Tone
                </label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                        tone === t.value
                          ? "bg-interactive-600 text-white"
                          : "bg-background-elevated text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <span>{t.emoji}</span>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Create Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleCreate}
                className="inline-flex items-center gap-2 px-6 py-3 bg-interactive-600 hover:bg-interactive-500 text-white font-semibold rounded-xl transition-colors"
              >
                Create Brand Kit
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 'creating' && (
          <motion.div
            key="creating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-interactive-600/20 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-interactive-600/30 border-t-interactive-600 rounded-full animate-spin" />
              </div>
              <p className="text-text-primary font-medium">Creating your brand kit...</p>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-dark/20 flex items-center justify-center">
                <Check className="w-10 h-10 text-success-light" />
              </div>
              <h3 className="text-2xl font-bold text-text-primary mb-2">
                Brand Kit Created! 🎉
              </h3>
              <p className="text-text-secondary mb-8">
                Your brand kit is ready. You can start using it now or customize it further.
              </p>

              {/* Preview */}
              <div className="p-4 bg-background-surface rounded-xl border border-border-subtle mb-8">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: getColors().primary[0] }}
                  >
                    {(name || 'M').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-text-primary">
                      {name || 'My Brand Kit'}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {[...getColors().primary, ...getColors().accent].map((c, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleCustomize}
                  className="px-5 py-2.5 bg-background-elevated hover:bg-background-surface text-text-primary font-medium rounded-xl transition-colors"
                >
                  Customize More
                </button>
                <button
                  onClick={handleUseKit}
                  className="px-5 py-2.5 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-xl transition-colors"
                >
                  Start Using
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
