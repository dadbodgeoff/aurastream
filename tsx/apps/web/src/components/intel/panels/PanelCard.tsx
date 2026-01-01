'use client';

import { forwardRef, type ReactNode, useId } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PanelHeader } from './PanelHeader';
import { PanelFooter } from './PanelFooter';

// =============================================================================
// Types
// =============================================================================

export interface PanelCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  
  // States
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  
  // Footer
  lastUpdated?: Date | string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  
  // Header actions
  onSettings?: () => void;
  headerActions?: ReactNode;
  
  // Drag state
  isDragging?: boolean;
  isDraggable?: boolean;
  
  // Size variant
  size?: 'small' | 'wide' | 'large';
}

// =============================================================================
// Animation Variants
// =============================================================================

const panelVariants = {
  initial: { scale: 1, y: 0 },
  hover: { 
    scale: 1.01, 
    y: -2,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }
  },
  tap: { scale: 0.995 },
  drag: { 
    scale: 1.03, 
    rotate: 1,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    transition: { duration: 0.2 }
  }
};

// =============================================================================
// Loading Skeleton
// =============================================================================

function PanelSkeleton({ size }: { size?: 'small' | 'wide' | 'large' }) {
  const height = size === 'large' ? 'h-64' : 'h-32';
  
  return (
    <div className={cn('space-y-3', height)} role="status" aria-label="Loading panel content">
      <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
      <div className="h-4 w-2/3 bg-white/5 rounded animate-pulse" />
      {size === 'large' && (
        <>
          <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
        </>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// =============================================================================
// Error State
// =============================================================================

function PanelError({ 
  message, 
  onRetry 
}: { 
  message?: string; 
  onRetry?: () => void;
}) {
  return (
    <div 
      className="flex flex-col items-center justify-center h-32 text-center"
      role="alert"
      aria-live="polite"
    >
      <span className="text-2xl mb-2" aria-hidden="true">⚠️</span>
      <p className="text-sm text-text-muted mb-3">
        {message || "Couldn't load data"}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 text-xs font-medium bg-interactive-600/20 hover:bg-interactive-600/30 text-interactive-300 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-interactive-500"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Panel Card Component
// =============================================================================

export const PanelCard = forwardRef<HTMLDivElement, PanelCardProps>(
  function PanelCard(
    {
      title,
      icon,
      children,
      isLoading = false,
      isError = false,
      errorMessage,
      lastUpdated,
      onRefresh,
      isRefreshing = false,
      onSettings,
      headerActions,
      isDragging = false,
      isDraggable = true,
      size = 'small',
      className,
      ...props
    },
    ref
  ) {
    const panelId = useId();
    
    return (
      <motion.div
        ref={ref}
        variants={panelVariants}
        initial="initial"
        whileHover={isDraggable ? "hover" : undefined}
        whileTap={isDraggable ? "tap" : undefined}
        animate={isDragging ? "drag" : "initial"}
        role="region"
        aria-labelledby={`${panelId}-title`}
        aria-busy={isLoading}
        className={cn(
          // Base styles
          'panel-card relative flex flex-col rounded-xl overflow-hidden h-full',
          // Glassmorphism
          'bg-background-surface/85 backdrop-blur-md',
          // Border
          'border border-border-subtle/50',
          // Shadow
          'shadow-lg shadow-black/5',
          // Hover border
          'hover:border-interactive-500/25',
          // Transition
          'transition-[border-color,box-shadow] duration-200',
          // Dragging state
          isDragging && 'z-50 cursor-grabbing',
          isDraggable && !isDragging && 'cursor-grab',
          // Focus styles for keyboard navigation
          'focus-within:ring-2 focus-within:ring-interactive-500/50 focus-within:ring-offset-2 focus-within:ring-offset-background-base',
          className
        )}
        {...props}
      >
        {/* Header */}
        <PanelHeader
          title={title}
          icon={icon}
          onSettings={onSettings}
          actions={headerActions}
          isDraggable={isDraggable}
          panelId={`${panelId}-title`}
        />
        
        {/* Content */}
        <div className="panel-content flex-1 px-4 py-3 overflow-auto min-h-0">
          {isLoading ? (
            <PanelSkeleton size={size} />
          ) : isError ? (
            <PanelError message={errorMessage} onRetry={onRefresh} />
          ) : (
            children
          )}
        </div>
        
        {/* Footer */}
        <PanelFooter
          lastUpdated={lastUpdated}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          isError={isError}
        />
      </motion.div>
    );
  }
);
