'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SectionCard } from '../shared';
import { ChevronLeftIcon, SparklesIcon } from '../icons';
import type { QuickTemplate, VibeOption } from '../types';
import type { ClassifiedError } from '@aurastream/api-client';

interface ReviewPanelProps {
  template: QuickTemplate;
  formValues: Record<string, string>;
  selectedVibe: VibeOption | null;
  brandKitName: string | null;
  includeLogo: boolean;
  logoPosition: string;
  logoSize: string;
  onBack: () => void;
  onGenerate: () => void;
  onRetry?: () => void;
  isGenerating: boolean;
  error: Error | null;
  classifiedError?: ClassifiedError | null;
}

/**
 * Progress stage messages for generation
 */
const PROGRESS_STAGES = [
  { stage: 'analyzing', message: 'Analyzing your prompt...', icon: '🔍' },
  { stage: 'generating', message: 'Generating your asset...', icon: '✨' },
  { stage: 'applying', message: 'Applying brand elements...', icon: '🎨' },
  { stage: 'finalizing', message: 'Finalizing...', icon: '🚀' },
];

export function ReviewPanel(props: ReviewPanelProps) {
  const { 
    template, formValues, selectedVibe, brandKitName, includeLogo, logoPosition, logoSize,
    onBack, onGenerate, onRetry, isGenerating, error, classifiedError 
  } = props;

  // Progress stage animation during generation
  const [progressStage, setProgressStage] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Cycle through progress stages while generating
  useEffect(() => {
    if (!isGenerating) {
      setProgressStage(0);
      return;
    }

    const interval = setInterval(() => {
      setProgressStage(prev => (prev + 1) % PROGRESS_STAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isGenerating]);

  // Handle rate limit countdown
  useEffect(() => {
    if (classifiedError?.code === 'GENERATION_RATE_LIMIT' && classifiedError.retryAfter) {
      setCountdown(classifiedError.retryAfter);
    } else {
      setCountdown(null);
    }
  }, [classifiedError]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const currentStage = PROGRESS_STAGES[progressStage];
  const canRetry = classifiedError?.retryable && (countdown === null || countdown === 0);

  // Get error display info
  const getErrorDisplay = () => {
    if (!classifiedError) {
      return {
        title: 'Generation failed',
        message: 'Please try again.',
        showRetry: true,
        showUpgrade: false,
      };
    }

    switch (classifiedError.code) {
      case 'GENERATION_RATE_LIMIT':
        return {
          title: 'Too many requests',
          message: countdown && countdown > 0 
            ? `Please wait ${countdown} seconds before trying again.`
            : 'You can try again now.',
          showRetry: countdown === null || countdown === 0,
          showUpgrade: false,
        };
      case 'GENERATION_LIMIT_EXCEEDED':
        return {
          title: 'Monthly limit reached',
          message: 'Upgrade your plan for more generations.',
          showRetry: false,
          showUpgrade: true,
        };
      case 'GENERATION_CONTENT_POLICY':
        return {
          title: 'Content policy violation',
          message: 'Please adjust your prompt and try again.',
          showRetry: false,
          showUpgrade: false,
        };
      case 'GENERATION_TIMEOUT':
        return {
          title: 'Generation timed out',
          message: 'The server took too long. Please try again.',
          showRetry: true,
          showUpgrade: false,
        };
      default:
        return {
          title: 'Generation failed',
          message: classifiedError.message || 'Please try again.',
          showRetry: classifiedError.retryable,
          showUpgrade: false,
        };
    }
  };

  const errorDisplay = error ? getErrorDisplay() : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ChevronLeftIcon />
        <span className="text-sm font-medium">Back</span>
      </button>

      <SectionCard className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-interactive-600 to-interactive-400" />
        
        <div className="pt-2">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-5xl">{template.emoji}</span>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">{template.name}</h2>
              <p className="text-text-secondary">{template.dimensions}</p>
            </div>
          </div>

          {/* Selected Vibe */}
          {selectedVibe && (
            <div className="bg-background-base rounded-xl p-4 mb-4">
              <h4 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-3">Style</h4>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br",
                  selectedVibe.gradient
                )}>
                  {selectedVibe.icon}
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{selectedVibe.name}</p>
                  <p className="text-sm text-text-secondary">{selectedVibe.tagline}</p>
                </div>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="bg-background-base rounded-xl p-4 mb-4">
            <h4 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-3">Details</h4>
            <div className="space-y-2">
              {template.fields.map(f => {
                const val = formValues[f.id];
                if (!val) return null;
                const display = f.type === 'select' ? f.options?.find(o => o.value === val)?.label || val : val;
                return (
                  <div key={f.id} className="flex justify-between">
                    <span className="text-text-secondary">{f.label}</span>
                    <span className="font-medium text-text-primary">{display}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Branding */}
          <div className="bg-background-base rounded-xl p-4 mb-4">
            <h4 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-3">Branding</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-secondary">Brand Kit</span>
                <span className="font-medium text-text-primary">{brandKitName || 'AI Defaults'}</span>
              </div>
              {brandKitName && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Logo</span>
                  <span className="font-medium text-text-primary">{includeLogo ? `${logoPosition}, ${logoSize}` : 'None'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview hint */}
          <div className="bg-interactive-600/5 border border-interactive-600/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <SparklesIcon />
              <div>
                <h4 className="font-medium text-text-primary">What you'll get</h4>
                <p className="text-sm text-text-secondary mt-1">
                  {selectedVibe ? selectedVibe.tagline : template.previewStyle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Generate Button with Progress Stages */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-tertiary">
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="text-lg">{currentStage.icon}</span>
              <span className="animate-pulse">{currentStage.message}</span>
            </span>
          ) : (
            'Takes 10-30 seconds'
          )}
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={cn(
            "flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg transition-all",
            isGenerating ? "bg-interactive-600/50 text-white/70" : "bg-interactive-600 text-white hover:bg-interactive-500 shadow-xl"
          )}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon />
              Create Asset
            </>
          )}
        </button>
      </div>

      {/* Enhanced Error Display */}
      {error && errorDisplay && (
        <div className={cn(
          "p-4 rounded-xl border",
          classifiedError?.code === 'GENERATION_LIMIT_EXCEEDED'
            ? "bg-yellow-500/10 border-yellow-500/20"
            : "bg-red-500/10 border-red-500/20"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              classifiedError?.code === 'GENERATION_LIMIT_EXCEEDED'
                ? "bg-yellow-500/20 text-yellow-500"
                : "bg-red-500/20 text-red-500"
            )}>
              {classifiedError?.code === 'GENERATION_LIMIT_EXCEEDED' ? '⚠' : '✕'}
            </div>
            <div className="flex-1">
              <h4 className={cn(
                "font-semibold",
                classifiedError?.code === 'GENERATION_LIMIT_EXCEEDED'
                  ? "text-yellow-500"
                  : "text-red-500"
              )}>
                {errorDisplay.title}
              </h4>
              <p className="text-sm text-text-secondary mt-1">
                {errorDisplay.message}
              </p>
              
              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                {errorDisplay.showRetry && canRetry && onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-4 py-2 text-sm font-medium bg-interactive-600 text-white rounded-lg hover:bg-interactive-500 transition-colors"
                  >
                    Try Again
                  </button>
                )}
                {errorDisplay.showUpgrade && (
                  <a
                    href="/pricing"
                    className="px-4 py-2 text-sm font-medium bg-accent-600 text-white rounded-lg hover:bg-accent-500 transition-colors"
                  >
                    Upgrade Plan
                  </a>
                )}
                {countdown !== null && countdown > 0 && (
                  <span className="px-4 py-2 text-sm text-text-tertiary">
                    Retry in {countdown}s
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
