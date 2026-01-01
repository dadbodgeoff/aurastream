'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Check, Sparkles, Star, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

import type { FuseResponse, Element } from './types';
import { RARITY_COLORS, RARITY_LABELS, RARITY_BADGE_STYLES, SCORE_LABELS } from './constants';

interface FusionResultCardProps {
  fusion: FuseResponse;
  element: Element;
  onKeep: () => void;
  onTrash: () => void;
  onDownload: () => void;
  isKeeping?: boolean;
  isTrashing?: boolean;
}

/**
 * FusionResultCard - Displays the result of a fusion operation.
 * 
 * Features:
 * - Card with generated fusion image
 * - Rarity border styling (common=gray, rare=blue glow, mythic=gold animated glow)
 * - Rarity badge in corner
 * - "CRITICAL SUCCESS!" animation for mythic results
 * - "NEW RECIPE DISCOVERED" badge if isFirstDiscovery
 * - AI commentary display
 * - Score breakdown (visual impact, creativity, meme potential, technical quality)
 * - Action buttons: [Keep] [Trash] [Download]
 * - Confetti animation for mythic
 */
export function FusionResultCard({
  fusion,
  element,
  onKeep,
  onTrash,
  onDownload,
  isKeeping = false,
  isTrashing = false,
}: FusionResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTriggeredConfetti = useRef(false);

  const { rarity, scores, isFirstDiscovery, imageUrl } = fusion;
  const rarityColors = RARITY_COLORS[rarity];
  const rarityLabel = RARITY_LABELS[rarity];
  const rarityBadgeStyle = RARITY_BADGE_STYLES[rarity];

  // Trigger confetti for mythic results
  useEffect(() => {
    if (rarity === 'mythic' && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      
      // Fire confetti from both sides
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        // Left side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fef3c7'],
        });

        // Right side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fef3c7'],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [rarity]);

  // Score bar component
  const ScoreBar = ({ label, value }: { label: string; value: number }) => {
    const percentage = (value / 10) * 100;
    const getBarColor = () => {
      if (value >= 8) return 'bg-accent-500';
      if (value >= 6) return 'bg-interactive-500';
      return 'bg-text-tertiary';
    };

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">{label}</span>
          <span className="text-text-secondary font-medium">{value}/10</span>
        </div>
        <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className={`h-full rounded-full ${getBarColor()}`}
          />
        </div>
      </div>
    );
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Critical Success Banner for Mythic */}
      <AnimatePresence>
        {rarity === 'mythic' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4 text-center"
          >
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                textShadow: [
                  '0 0 20px rgba(251, 191, 36, 0.5)',
                  '0 0 40px rgba(251, 191, 36, 0.8)',
                  '0 0 20px rgba(251, 191, 36, 0.5)',
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-amber-500/20 border border-amber-500/50"
            >
              <Trophy className="w-5 h-5 text-amber-400" />
              <span className="text-lg font-bold text-amber-400">
                CRITICAL SUCCESS!
              </span>
              <Trophy className="w-5 h-5 text-amber-400" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card */}
      <div
        className={`
          relative rounded-2xl overflow-hidden
          ${rarityColors.bg} ${rarityColors.border}
          border-2 transition-all duration-300
          ${rarity === 'mythic' ? 'shadow-2xl ' + rarityColors.glow : ''}
          ${rarity === 'rare' ? 'shadow-xl ' + rarityColors.glow : ''}
        `}
      >
        {/* Animated border for mythic */}
        {rarity === 'mythic' && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 30px rgba(251, 191, 36, 0.3)',
                '0 0 60px rgba(251, 191, 36, 0.5)',
                '0 0 30px rgba(251, 191, 36, 0.3)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        {/* Rarity Badge */}
        <div className="absolute top-4 right-4 z-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className={`
              px-3 py-1.5 rounded-full text-sm font-bold
              ${rarityBadgeStyle}
              ${rarity === 'mythic' ? 'animate-pulse' : ''}
            `}
          >
            {rarityLabel}
          </motion.div>
        </div>

        {/* First Discovery Badge */}
        {isFirstDiscovery && (
          <div className="absolute top-4 left-4 z-10">
            <motion.div
              initial={{ scale: 0, x: -20 }}
              animate={{ scale: 1, x: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/90 text-white text-xs font-bold shadow-lg"
            >
              <Star className="w-3.5 h-3.5" />
              NEW RECIPE DISCOVERED
            </motion.div>
          </div>
        )}

        {/* Image Section */}
        <div className="relative aspect-square max-h-80 bg-background-surface flex items-center justify-center overflow-hidden">
          <motion.img
            src={imageUrl}
            alt={`Fusion result with ${element.name}`}
            className="max-w-full max-h-full object-contain"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Element indicator */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background-surface/80 backdrop-blur-sm border border-border-default">
            <span className="text-xl">{element.icon}</span>
            <span className="text-sm font-medium text-text-secondary">{element.name}</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 bg-background-surface/80 backdrop-blur-sm">
          {/* AI Commentary */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-interactive-400" />
              <span className="text-xs font-semibold text-interactive-400 uppercase tracking-wide">
                AI Commentary
              </span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed italic">
              "{scores.commentary}"
            </p>
          </div>

          {/* Score Breakdown */}
          <div className="space-y-3 mb-6">
            <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
              Score Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <ScoreBar label={SCORE_LABELS.visualImpact} value={scores.visualImpact} />
              <ScoreBar label={SCORE_LABELS.creativity} value={scores.creativity} />
              <ScoreBar label={SCORE_LABELS.memePotential} value={scores.memePotential} />
              <ScoreBar label={SCORE_LABELS.technicalQuality} value={scores.technicalQuality} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <motion.button
              onClick={onKeep}
              disabled={isKeeping || isTrashing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                flex-1 py-3 px-4 rounded-xl font-semibold text-sm
                flex items-center justify-center gap-2
                transition-all duration-200
                ${isKeeping
                  ? 'bg-green-600 text-white cursor-wait'
                  : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/25'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isKeeping ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Keep
                </>
              )}
            </motion.button>

            <motion.button
              onClick={onTrash}
              disabled={isKeeping || isTrashing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                py-3 px-4 rounded-xl font-semibold text-sm
                flex items-center justify-center gap-2
                transition-all duration-200
                ${isTrashing
                  ? 'bg-red-600 text-white cursor-wait'
                  : 'bg-background-elevated hover:bg-red-600/20 text-text-secondary hover:text-red-400 border border-border-default hover:border-red-500/50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isTrashing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </motion.button>

            <motion.button
              onClick={onDownload}
              disabled={isKeeping || isTrashing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="
                py-3 px-4 rounded-xl font-semibold text-sm
                flex items-center justify-center gap-2
                bg-background-elevated hover:bg-border-default text-text-secondary hover:text-text-primary
                border border-border-default hover:border-border-strong
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <Download className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default FusionResultCard;
