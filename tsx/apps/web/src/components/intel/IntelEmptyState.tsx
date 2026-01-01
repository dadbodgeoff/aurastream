'use client';

import { motion } from 'framer-motion';
import { Target, Gamepad2, TrendingUp, Sparkles, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIntelStore } from '@/stores/intelStore';

// =============================================================================
// Types
// =============================================================================

type EmptyStateVariant = 
  | 'no-categories'
  | 'no-panels'
  | 'no-data'
  | 'error';

interface IntelEmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

// =============================================================================
// Variant Configs
// =============================================================================

const VARIANT_CONFIGS: Record<EmptyStateVariant, {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  iconColor: string;
}> = {
  'no-categories': {
    icon: Gamepad2,
    title: 'Pick your games to get started',
    description: 'Creator Intel shows you what\'s trending, what\'s working, and what you should create next.',
    actionLabel: 'Add Your First Game',
    iconColor: 'text-interactive-400',
  },
  'no-panels': {
    icon: Target,
    title: 'Customize your dashboard',
    description: 'Add panels to see the insights that matter most to you.',
    actionLabel: 'Add Panels',
    iconColor: 'text-interactive-400',
  },
  'no-data': {
    icon: TrendingUp,
    title: 'No data available',
    description: 'We\'re gathering intelligence for your categories. Check back soon!',
    actionLabel: 'Refresh',
    iconColor: 'text-text-muted',
  },
  'error': {
    icon: Sparkles,
    title: 'Something went wrong',
    description: 'We couldn\'t load your dashboard. Please try again.',
    actionLabel: 'Try Again',
    iconColor: 'text-error-main',
  },
};

// =============================================================================
// Floating Icons Animation
// =============================================================================

function FloatingIcons() {
  const icons = [
    { Icon: Gamepad2, delay: 0, x: -60, y: -40 },
    { Icon: TrendingUp, delay: 0.2, x: 60, y: -30 },
    { Icon: Sparkles, delay: 0.4, x: -40, y: 40 },
    { Icon: Target, delay: 0.6, x: 50, y: 50 },
  ];
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {icons.map(({ Icon, delay, x, y }, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0, 0.3, 0],
            scale: [0.5, 1, 0.5],
            x: [0, x, 0],
            y: [0, y, 0],
          }}
          transition={{
            duration: 4,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <Icon className="w-8 h-8 text-interactive-500/20" />
        </motion.div>
      ))}
    </div>
  );
}

// =============================================================================
// Intel Empty State
// =============================================================================

export function IntelEmptyState({
  variant = 'no-categories',
  title,
  description,
  actionLabel,
  onAction,
}: IntelEmptyStateProps) {
  const setCategoryPickerOpen = useIntelStore(state => state.setCategoryPickerOpen);
  const setPanelLibraryOpen = useIntelStore(state => state.setPanelLibraryOpen);
  
  const config = VARIANT_CONFIGS[variant];
  const Icon = config.icon;
  
  // Default actions based on variant
  const handleAction = () => {
    if (onAction) {
      onAction();
      return;
    }
    
    switch (variant) {
      case 'no-categories':
        setCategoryPickerOpen(true);
        break;
      case 'no-panels':
        setPanelLibraryOpen(true);
        break;
      case 'no-data':
      case 'error':
        window.location.reload();
        break;
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {/* Floating background icons */}
      <FloatingIcons />
      
      {/* Main icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={cn(
          'relative w-20 h-20 rounded-2xl mb-6',
          'bg-gradient-to-br from-interactive-600/20 to-interactive-600/5',
          'border border-interactive-500/20',
          'flex items-center justify-center'
        )}
      >
        <Icon className={cn('w-10 h-10', config.iconColor)} />
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-interactive-500/10 blur-xl -z-10" />
      </motion.div>
      
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="text-xl font-semibold text-text-primary mb-2"
      >
        {title || config.title}
      </motion.h2>
      
      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="text-text-secondary max-w-md mb-6"
      >
        {description || config.description}
      </motion.p>
      
      {/* Action Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        onClick={handleAction}
        className={cn(
          'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg',
          'bg-interactive-600 hover:bg-interactive-500',
          'text-white font-medium',
          'transition-colors'
        )}
      >
        <Plus className="w-4 h-4" />
        {actionLabel || config.actionLabel}
      </motion.button>
    </motion.div>
  );
}

// =============================================================================
// Panel Empty State (smaller, for individual panels)
// =============================================================================

interface PanelEmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
}

export function PanelEmptyState({
  icon: Icon = Target,
  title,
  description,
}: PanelEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-center px-4">
      <Icon className="w-8 h-8 text-text-muted/50 mb-2" />
      <p className="text-sm text-text-muted">{title}</p>
      {description && (
        <p className="text-xs text-text-muted mt-1">{description}</p>
      )}
    </div>
  );
}
