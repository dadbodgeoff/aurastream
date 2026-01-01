/**
 * ModeSelector Component
 * 
 * Prominent card-based navigation for switching between creation modes.
 * Each mode has a clear description to help users understand the difference.
 * 
 * @module create-studio/ModeSelector
 */

'use client';

import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CreationMode, ModeSelectorProps, ModeConfig } from './types';

// =============================================================================
// Icons
// =============================================================================

const ZapIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const PencilIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const SparklesIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

// =============================================================================
// Constants
// =============================================================================

const MODES: ModeConfig[] = [
  {
    id: 'templates',
    label: 'Quick Create',
    description: 'Pick a template, add your vibe, done in seconds',
    icon: '⚡',
  },
  {
    id: 'custom',
    label: 'Build Your Own',
    description: 'Full control over every detail of your asset',
    icon: '🎨',
  },
  {
    id: 'coach',
    label: 'AI Coach',
    description: 'Get AI guidance to craft the perfect prompt',
    icon: '🤖',
    badge: 'Pro',
    isPremium: true,
  },
];

// Mode icons mapping
const MODE_ICONS: Record<CreationMode, React.FC<{ className?: string }>> = {
  templates: ZapIcon,
  custom: PencilIcon,
  coach: SparklesIcon,
};

// Mode colors for visual distinction - refined palette
const MODE_COLORS: Record<CreationMode, { 
  bg: string; 
  bgHover: string;
  border: string; 
  borderActive: string;
  icon: string; 
  iconBg: string;
  glow: string;
  gradient: string;
}> = {
  templates: {
    bg: 'bg-emerald-500/5',
    bgHover: 'hover:bg-emerald-500/10',
    border: 'border-emerald-500/20',
    borderActive: 'border-emerald-400/50',
    icon: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    glow: 'shadow-emerald-500/10',
    gradient: 'from-emerald-500/20 to-transparent',
  },
  custom: {
    bg: 'bg-sky-500/5',
    bgHover: 'hover:bg-sky-500/10',
    border: 'border-sky-500/20',
    borderActive: 'border-sky-400/50',
    icon: 'text-sky-400',
    iconBg: 'bg-sky-500/15',
    glow: 'shadow-sky-500/10',
    gradient: 'from-sky-500/20 to-transparent',
  },
  coach: {
    bg: 'bg-violet-500/5',
    bgHover: 'hover:bg-violet-500/10',
    border: 'border-violet-500/20',
    borderActive: 'border-violet-400/50',
    icon: 'text-violet-400',
    iconBg: 'bg-violet-500/15',
    glow: 'shadow-violet-500/10',
    gradient: 'from-violet-500/20 to-transparent',
  },
};

// =============================================================================
// ModeSelector Component
// =============================================================================

/**
 * ModeSelector - Prominent card-based navigation for Create Studio modes.
 * 
 * Features:
 * - Large, clickable cards with clear descriptions
 * - Visual distinction between modes with colors
 * - Premium tier badges
 * - Keyboard navigation
 * - Accessible with ARIA attributes
 * - Smooth animations with Framer Motion
 * 
 * @example
 * ```tsx
 * <ModeSelector
 *   activeMode="templates"
 *   onModeSelect={(mode) => setMode(mode)}
 *   isPremium={user?.tier === 'studio'}
 * />
 * ```
 */
export function ModeSelector({
  activeMode,
  onModeSelect,
  isPremium = false,
  className,
}: ModeSelectorProps) {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    currentIndex: number
  ) => {
    const modes = MODES;
    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : modes.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = currentIndex < modes.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = modes.length - 1;
        break;
      default:
        return;
    }

    tabsRef.current[nextIndex]?.focus();
    onModeSelect(modes[nextIndex].id);
  }, [onModeSelect]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-border-subtle to-transparent" />
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider px-2">
          Choose Your Creation Method
        </h2>
        <div className="h-px flex-1 bg-gradient-to-l from-border-subtle to-transparent" />
      </div>

      {/* Mode cards */}
      <div 
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        role="tablist"
        aria-label="Creation mode"
      >
        {MODES.map((mode, index) => {
          const isActive = activeMode === mode.id;
          const isLocked = mode.isPremium && !isPremium;
          const colors = MODE_COLORS[mode.id];
          const IconComponent = MODE_ICONS[mode.id];

          return (
            <motion.button
              key={mode.id}
              ref={el => { tabsRef.current[index] = el; }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${mode.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onModeSelect(mode.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              whileHover={{ scale: isLocked ? 1 : 1.01 }}
              whileTap={{ scale: isLocked ? 1 : 0.99 }}
              className={cn(
                'relative flex flex-col items-start gap-3',
                'p-5 rounded-2xl text-left',
                'transition-all duration-300 ease-out',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500/50',
                'border overflow-hidden',
                'group',
                isActive
                  ? cn(
                      colors.bg,
                      colors.borderActive,
                      'shadow-xl',
                      colors.glow
                    )
                  : cn(
                      'bg-background-surface/30 backdrop-blur-sm',
                      'border-white/5',
                      colors.bgHover,
                      'hover:border-white/10',
                      'hover:shadow-lg hover:shadow-black/20'
                    ),
                isLocked && !isActive && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Gradient overlay for active state */}
              {isActive && (
                <div className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-50',
                  colors.gradient
                )} />
              )}

              {/* Content */}
              <div className="relative z-10 w-full">
                {/* Icon and label row */}
                <div className="flex items-center gap-3 w-full mb-2">
                  {/* Icon container */}
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center',
                    'transition-all duration-300',
                    'ring-1',
                    isActive
                      ? cn(colors.iconBg, colors.icon, 'ring-white/10')
                      : cn(
                          'bg-white/5 text-text-muted ring-white/5',
                          'group-hover:bg-white/10 group-hover:text-text-secondary'
                        )
                  )}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Label and badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'font-semibold text-[15px] tracking-tight',
                        'transition-colors duration-200',
                        isActive ? 'text-white' : 'text-text-secondary group-hover:text-text-primary'
                      )}>
                        {mode.label}
                      </span>
                      
                      {/* Premium badge */}
                      {mode.badge && (
                        <span
                          className={cn(
                            'px-2 py-0.5 text-[10px] font-bold rounded-md',
                            'uppercase tracking-wider',
                            'transition-colors duration-200',
                            isPremium
                              ? 'bg-violet-500/25 text-violet-300 ring-1 ring-violet-500/30'
                              : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20'
                          )}
                        >
                          {mode.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active checkmark */}
                  {isActive && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center',
                        colors.iconBg
                      )}
                    >
                      <CheckIcon className={cn('w-3.5 h-3.5', colors.icon)} />
                    </motion.div>
                  )}
                </div>

                {/* Description */}
                <p className={cn(
                  'text-[13px] leading-relaxed pl-14',
                  'transition-colors duration-200',
                  isActive ? 'text-white/70' : 'text-text-muted group-hover:text-text-tertiary'
                )}>
                  {mode.description}
                </p>
              </div>

              {/* Locked overlay for premium */}
              {isLocked && (
                <div className="absolute inset-0 rounded-2xl bg-background-base/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-200 z-20">
                  <span className="px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 text-xs font-semibold rounded-full ring-1 ring-amber-500/30 shadow-lg">
                    Upgrade to Pro
                  </span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Helper text - more subtle */}
      <motion.p 
        key={activeMode}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-text-muted/70 text-center"
      >
        {activeMode === 'templates' && '✨ Best for quick results — most users start here'}
        {activeMode === 'custom' && '🎯 For power users who want complete control'}
        {activeMode === 'coach' && '🧠 AI helps you write better prompts for better results'}
      </motion.p>
    </div>
  );
}

export default ModeSelector;
