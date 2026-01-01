'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface CategoryPillProps {
  name: string;
  icon?: string;
  isActive?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

// =============================================================================
// Animation Variants
// =============================================================================

const pillVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 500, damping: 30 }
  },
  exit: { 
    scale: 0.9, 
    opacity: 0,
    transition: { duration: 0.15, ease: 'easeOut' as const }
  },
  hover: {
    y: -1,
    transition: { duration: 0.2 }
  }
};

// =============================================================================
// Category Pill Component
// =============================================================================

export function CategoryPill({
  name,
  icon,
  isActive = false,
  onRemove,
  onClick,
  className,
}: CategoryPillProps) {
  return (
    <motion.div
      variants={pillVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      layout
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-3 py-1.5 rounded-full',
        'text-sm font-medium',
        'transition-colors duration-200',
        isActive
          ? 'bg-interactive-600/20 border border-interactive-500/40 text-interactive-300'
          : 'bg-interactive-600/12 border border-interactive-500/25 text-interactive-400',
        onClick && 'cursor-pointer hover:bg-interactive-600/18',
        className
      )}
      onClick={onClick}
    >
      {/* Icon */}
      {icon && <span className="text-sm">{icon}</span>}
      
      {/* Name */}
      <span>{name}</span>
      
      {/* Remove Button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'ml-0.5 p-0.5 rounded-full',
            'text-interactive-400/70 hover:text-error-main',
            'hover:bg-error-main/10',
            'transition-colors'
          )}
          aria-label={`Remove ${name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}
