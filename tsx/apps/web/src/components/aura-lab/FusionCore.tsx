'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, Sparkles } from 'lucide-react';

import type { Element } from './types';

interface FusionCoreProps {
  subjectImageUrl: string | null;
  selectedElement: Element | null;
  onFuse: () => void;
  isFusing: boolean;
  isReady: boolean; // true when both subject and element are selected
}

/**
 * FusionCore - Central fusion reactor component.
 * 
 * Features:
 * - Circular design with animated border
 * - Shows subject thumbnail + selected element icon
 * - "FUSE!" button
 * - Spinning/pulsing animation when processing
 * - Visual states: idle, ready, processing, complete
 * - Particle effects using CSS
 */
export function FusionCore({
  subjectImageUrl,
  selectedElement,
  onFuse,
  isFusing,
  isReady,
}: FusionCoreProps) {
  const hasSubject = Boolean(subjectImageUrl);
  const hasElement = Boolean(selectedElement);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Fusion Reactor Container */}
      <div className="relative">
        {/* Outer Glow Ring */}
        <motion.div
          className={`
            absolute inset-0 rounded-full
            ${isReady ? 'bg-interactive-500/20' : 'bg-border-default/20'}
          `}
          animate={{
            scale: isFusing ? [1, 1.2, 1] : isReady ? [1, 1.05, 1] : 1,
            opacity: isFusing ? [0.5, 0.8, 0.5] : isReady ? [0.3, 0.5, 0.3] : 0.2,
          }}
          transition={{
            duration: isFusing ? 0.8 : 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            filter: isReady ? 'blur(20px)' : 'blur(10px)',
          }}
        />

        {/* Main Reactor Circle */}
        <div
          className={`
            relative w-64 h-64 rounded-full
            bg-gradient-to-br from-background-elevated to-background-surface
            border-4 transition-colors duration-300
            ${isFusing 
              ? 'border-interactive-500 shadow-lg shadow-interactive-500/50' 
              : isReady 
              ? 'border-interactive-500/50 shadow-lg shadow-interactive-500/25' 
              : 'border-border-default'
            }
          `}
        >
          {/* Spinning Border Animation */}
          {(isReady || isFusing) && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, transparent, ${isFusing ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.4)'}, transparent)`,
              }}
              animate={{ rotate: 360 }}
              transition={{
                duration: isFusing ? 1 : 3,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}

          {/* Inner Circle */}
          <div className="absolute inset-2 rounded-full bg-background-surface flex items-center justify-center overflow-hidden">
            {/* Content Container */}
            <div className="relative w-full h-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                {/* Idle State - No Subject */}
                {!hasSubject && !isFusing && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-background-elevated flex items-center justify-center">
                      <Zap className="w-8 h-8 text-text-disabled" />
                    </div>
                    <p className="text-sm text-text-tertiary">Awaiting subject</p>
                  </motion.div>
                )}

                {/* Subject Only - No Element */}
                {hasSubject && !hasElement && !isFusing && (
                  <motion.div
                    key="subject-only"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center"
                  >
                    <div className="relative w-24 h-24 mx-auto mb-3">
                      <img
                        src={subjectImageUrl!}
                        alt="Test subject"
                        className="w-full h-full rounded-full object-cover border-2 border-border-default"
                      />
                    </div>
                    <p className="text-sm text-text-secondary">Select an element</p>
                  </motion.div>
                )}

                {/* Ready State - Both Selected */}
                {isReady && !isFusing && (
                  <motion.div
                    key="ready"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-4"
                  >
                    {/* Subject */}
                    <motion.div
                      className="relative"
                      animate={{ x: [-2, 2, -2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <img
                        src={subjectImageUrl!}
                        alt="Test subject"
                        className="w-16 h-16 rounded-full object-cover border-2 border-interactive-500/50"
                      />
                    </motion.div>

                    {/* Plus Sign */}
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-2xl text-interactive-400 font-bold"
                    >
                      +
                    </motion.div>

                    {/* Element */}
                    <motion.div
                      className="w-16 h-16 rounded-full bg-background-elevated border-2 border-interactive-500/50 flex items-center justify-center"
                      animate={{ x: [2, -2, 2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-3xl">{selectedElement?.icon}</span>
                    </motion.div>
                  </motion.div>
                )}

                {/* Fusing State */}
                {isFusing && (
                  <motion.div
                    key="fusing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    {/* Merging Animation */}
                    <div className="relative w-32 h-32 mx-auto">
                      {/* Subject orbiting */}
                      <motion.div
                        className="absolute"
                        animate={{
                          rotate: 360,
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        <img
                          src={subjectImageUrl!}
                          alt="Fusing subject"
                          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full object-cover border-2 border-interactive-500"
                        />
                      </motion.div>

                      {/* Element orbiting (opposite direction) */}
                      <motion.div
                        className="absolute"
                        animate={{
                          rotate: -360,
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                      >
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-10 h-10 rounded-full bg-background-elevated border-2 border-interactive-500 flex items-center justify-center">
                          <span className="text-xl">{selectedElement?.icon}</span>
                        </div>
                      </motion.div>

                      {/* Center glow */}
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                        }}
                      >
                        <div className="w-12 h-12 rounded-full bg-interactive-500/30 blur-md" />
                      </motion.div>

                      {/* Sparkles */}
                      <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        animate={{ rotate: 180 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-6 h-6 text-interactive-400" />
                      </motion.div>
                    </div>

                    <motion.p
                      className="text-sm text-interactive-300 mt-4 font-medium"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      Fusing...
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Particle Effects */}
          {(isReady || isFusing) && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-interactive-400"
                  style={{
                    top: '50%',
                    left: '50%',
                  }}
                  animate={{
                    x: [0, Math.cos((i * Math.PI * 2) / 8) * 140],
                    y: [0, Math.sin((i * Math.PI * 2) / 8) * 140],
                    opacity: [1, 0],
                    scale: [1, 0.5],
                  }}
                  transition={{
                    duration: isFusing ? 1 : 2,
                    repeat: Infinity,
                    delay: i * (isFusing ? 0.1 : 0.2),
                    ease: 'easeOut',
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* FUSE Button */}
      <motion.button
        onClick={onFuse}
        disabled={!isReady || isFusing}
        className={`
          mt-8 px-12 py-4 rounded-xl font-bold text-lg
          transition-all duration-300
          ${isReady && !isFusing
            ? 'bg-gradient-to-r from-interactive-600 via-accent-600 to-interactive-600 bg-[length:200%_100%] hover:bg-[position:100%_0] text-white shadow-lg shadow-interactive-500/40 hover:shadow-interactive-500/60 hover:scale-105 cursor-pointer'
            : 'bg-background-elevated text-text-tertiary cursor-not-allowed'
          }
        `}
        whileTap={isReady && !isFusing ? { scale: 0.95 } : {}}
      >
        <span className="flex items-center gap-2">
          {isFusing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              FUSING...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              FUSE!
            </>
          )}
        </span>
      </motion.button>

      {/* Status Text */}
      <p className="mt-3 text-sm text-text-tertiary">
        {isFusing
          ? 'Creating your fusion...'
          : isReady
          ? 'Ready to fuse!'
          : hasSubject
          ? 'Select an element to continue'
          : 'Upload and lock a test subject'
        }
      </p>
    </div>
  );
}

export default FusionCore;
