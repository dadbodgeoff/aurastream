'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface ConfidenceRingProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// =============================================================================
// Size Config
// =============================================================================

const SIZE_CONFIG = {
  sm: { width: 64, radius: 24, stroke: 6, fontSize: 'text-lg' },
  md: { width: 96, radius: 36, stroke: 8, fontSize: 'text-2xl' },
  lg: { width: 120, radius: 48, stroke: 10, fontSize: 'text-3xl' },
};

// =============================================================================
// Confidence Ring Component
// =============================================================================

export function ConfidenceRing({
  value,
  size = 'md',
  showLabel = true,
  className,
}: ConfidenceRingProps) {
  const config = SIZE_CONFIG[size];
  const circumference = 2 * Math.PI * config.radius;
  const progress = (Math.min(Math.max(value, 0), 100) / 100) * circumference;
  
  // Color based on confidence level
  const getColor = () => {
    if (value >= 70) return '#21808D'; // High - teal
    if (value >= 40) return '#A84F2F'; // Medium - coral
    return '#777C7C'; // Low - gray
  };
  
  const color = getColor();
  
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={config.width}
        height={config.width}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* Background ring */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={config.radius}
          fill="none"
          stroke="rgba(167, 169, 169, 0.1)"
          strokeWidth={config.stroke}
        />
        
        {/* Progress ring */}
        <motion.circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={config.radius}
          fill="none"
          stroke={color}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ 
            duration: 1, 
            ease: [0.34, 1.56, 0.64, 1],
            delay: 0.2
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className={cn('font-bold text-text-primary', config.fontSize)}
          style={{ color }}
        >
          {Math.round(value)}%
        </motion.span>
        {showLabel && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.7 }}
            className="text-xs text-text-muted"
          >
            confidence
          </motion.span>
        )}
      </div>
    </div>
  );
}
