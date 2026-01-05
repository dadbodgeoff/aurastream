/**
 * Quick Start Wizard
 * 
 * 3-step guided flow for new users:
 * 1. Choose what you're making (canvas type)
 * 2. Pick a template (or start blank)
 * 3. Add your assets
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TemplateSelector } from '../templates/TemplateSelector';
import type { CanvasTemplate, CanvasType } from '../templates/data';

// ============================================================================
// Icons
// ============================================================================

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

// ============================================================================
// Canvas Type Options
// ============================================================================

interface CanvasTypeOption {
  id: CanvasType;
  label: string;
  description: string;
  icon: string;
  dimensions: string;
}

const CANVAS_TYPE_OPTIONS: CanvasTypeOption[] = [
  {
    id: 'youtube_thumbnail',
    label: 'YouTube Thumbnail',
    description: 'Eye-catching video thumbnails',
    icon: '📺',
    dimensions: '1280×720',
  },
  {
    id: 'twitch_offline',
    label: 'Twitch Offline Screen',
    description: 'Show when you\'re away',
    icon: '🎮',
    dimensions: '1920×1080',
  },
  {
    id: 'twitch_panel',
    label: 'Twitch Panel',
    description: 'Info panels for your channel',
    icon: '📋',
    dimensions: '320×160',
  },
  {
    id: 'twitch_banner',
    label: 'Twitch Banner',
    description: 'Profile header banner',
    icon: '🖼️',
    dimensions: '1200×480',
  },
  {
    id: 'twitch_emote',
    label: 'Emote',
    description: 'Channel emotes & badges',
    icon: '😊',
    dimensions: '112×112',
  },
  {
    id: 'story_graphic',
    label: 'Story Graphic',
    description: 'Instagram/TikTok stories',
    icon: '📱',
    dimensions: '1080×1920',
  },
];

// ============================================================================
// Step Components
// ============================================================================

interface Step1Props {
  selectedType: CanvasType | null;
  onSelect: (type: CanvasType) => void;
}

function Step1CanvasType({ selectedType, onSelect }: Step1Props) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        What are you making?
      </h3>
      <p className="text-sm text-text-muted mb-6">
        Choose the type of graphic you want to create
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        {CANVAS_TYPE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition-all',
              selectedType === option.id
                ? 'border-interactive-500 bg-interactive-500/10'
                : 'border-border-subtle hover:border-interactive-400 bg-background-elevated'
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{option.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">{option.label}</p>
                <p className="text-xs text-text-muted mt-0.5">{option.description}</p>
                <p className="text-xs text-text-tertiary mt-1">{option.dimensions}</p>
              </div>
              {selectedType === option.id && (
                <div className="w-5 h-5 rounded-full bg-interactive-500 text-white flex items-center justify-center flex-shrink-0">
                  <CheckIcon />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface Step2Props {
  canvasType: CanvasType;
  selectedTemplate: CanvasTemplate | null;
  onSelect: (template: CanvasTemplate | null) => void;
}

function Step2Template({ canvasType, selectedTemplate, onSelect }: Step2Props) {
  return (
    <div className="h-full">
      <TemplateSelector
        canvasType={canvasType}
        selectedId={selectedTemplate?.id}
        onSelect={onSelect}
        onStartBlank={() => onSelect(null)}
      />
    </div>
  );
}

// ============================================================================
// Quick Start Wizard
// ============================================================================

interface QuickStartWizardProps {
  /** Called when wizard completes */
  onComplete: (result: {
    canvasType: CanvasType;
    template: CanvasTemplate | null;
  }) => void;
  /** Called when wizard is cancelled */
  onCancel: () => void;
  /** Initial canvas type (skip step 1 if provided) */
  initialCanvasType?: CanvasType;
}

export function QuickStartWizard({
  onComplete,
  onCancel,
  initialCanvasType,
}: QuickStartWizardProps) {
  const [step, setStep] = useState(initialCanvasType ? 2 : 1);
  const [canvasType, setCanvasType] = useState<CanvasType | null>(initialCanvasType ?? null);
  const [template, setTemplate] = useState<CanvasTemplate | null>(null);
  
  const handleNext = () => {
    if (step === 1 && canvasType) {
      setStep(2);
    } else if (step === 2) {
      onComplete({
        canvasType: canvasType!,
        template,
      });
    }
  };
  
  const handleBack = () => {
    if (step === 2 && !initialCanvasType) {
      setStep(1);
    } else {
      onCancel();
    }
  };
  
  const canProceed = step === 1 ? !!canvasType : true;
  
  return (
    <div className="flex flex-col h-full">
      {/* Progress indicator */}
      <div className="flex-shrink-0 px-6 pt-6">
        <div className="flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  s < step
                    ? 'bg-interactive-500 text-white'
                    : s === step
                    ? 'bg-interactive-500/20 text-interactive-500 border-2 border-interactive-500'
                    : 'bg-background-elevated text-text-muted'
                )}
              >
                {s < step ? <CheckIcon /> : s}
              </div>
              {s < 2 && (
                <div
                  className={cn(
                    'w-12 h-0.5 rounded',
                    s < step ? 'bg-interactive-500' : 'bg-border-subtle'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {step === 1 && (
          <Step1CanvasType
            selectedType={canvasType}
            onSelect={setCanvasType}
          />
        )}
        {step === 2 && canvasType && (
          <Step2Template
            canvasType={canvasType}
            selectedTemplate={template}
            onSelect={(t) => {
              setTemplate(t);
              // Auto-proceed when template is selected
              onComplete({ canvasType, template: t });
            }}
          />
        )}
      </div>
      
      {/* Navigation */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-t border-border-subtle">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
        >
          <ArrowLeftIcon />
          {step === 1 || initialCanvasType ? 'Cancel' : 'Back'}
        </button>
        
        {step === 1 && (
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              canProceed
                ? 'bg-interactive-500 text-white hover:bg-interactive-600'
                : 'bg-background-elevated text-text-muted cursor-not-allowed'
            )}
          >
            Next
            <ArrowRightIcon />
          </button>
        )}
      </div>
    </div>
  );
}
