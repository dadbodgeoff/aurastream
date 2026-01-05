/**
 * Celebrations Component
 * 
 * Confetti animations and celebration overlays for achievements and milestones.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Achievement, CelebrationConfig, CelebrationIntensity } from './types';
import { playSound } from './SoundEffects';
import { getTierColor, getTierBgColor } from './Achievements';

// ============================================================================
// Confetti Particle
// ============================================================================

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
}

const CONFETTI_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
];

function createParticle(id: number, intensity: CelebrationIntensity): Particle {
  const speedMultiplier = intensity === 'epic' ? 1.5 : intensity === 'normal' ? 1 : 0.7;
  
  return {
    id,
    x: Math.random() * 100,
    y: -10,
    rotation: Math.random() * 360,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: Math.random() * 8 + 4,
    velocityX: (Math.random() - 0.5) * 4 * speedMultiplier,
    velocityY: Math.random() * 3 + 2,
    rotationSpeed: (Math.random() - 0.5) * 10,
  };
}

// ============================================================================
// Confetti Canvas
// ============================================================================

interface ConfettiProps {
  isActive: boolean;
  intensity: CelebrationIntensity;
  duration?: number;
  onComplete?: () => void;
}

function Confetti({ isActive, intensity, duration = 3000, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    const particleCount = intensity === 'epic' ? 100 : intensity === 'normal' ? 50 : 25;
    const initialParticles = Array.from({ length: particleCount }, (_, i) =>
      createParticle(i, intensity)
    );
    setParticles(initialParticles);

    // Animation loop
    let animationId: number;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed > duration) {
        setParticles([]);
        onComplete?.();
        return;
      }

      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.velocityX * 0.1,
            y: p.y + p.velocityY * 0.1,
            rotation: p.rotation + p.rotationSpeed,
            velocityY: p.velocityY + 0.05, // Gravity
          }))
          .filter((p) => p.y < 110) // Remove particles that fell off screen
      );

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, intensity, duration, onComplete]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Achievement Toast
// ============================================================================

interface AchievementToastProps {
  achievement: Achievement;
  isVisible: boolean;
  onClose: () => void;
}

function AchievementToast({ achievement, isVisible, onClose }: AchievementToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed top-20 left-1/2 -translate-x-1/2 z-[201]',
        'animate-in slide-in-from-top-4 fade-in duration-500'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-4 px-6 py-4 rounded-2xl',
          'bg-background-surface/95 backdrop-blur-md',
          'border-2 shadow-2xl',
          getTierBgColor(achievement.tier),
          achievement.tier === 'gold' && 'border-yellow-500/50',
          achievement.tier === 'platinum' && 'border-purple-400/50',
          achievement.tier === 'silver' && 'border-gray-400/50',
          achievement.tier === 'bronze' && 'border-amber-600/50'
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center w-14 h-14 rounded-xl text-3xl',
            getTierBgColor(achievement.tier)
          )}
        >
          {achievement.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-0.5">
            Achievement Unlocked!
          </p>
          <h3 className={cn('text-lg font-bold', getTierColor(achievement.tier))}>
            {achievement.name}
          </h3>
          <p className="text-sm text-text-secondary">{achievement.description}</p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-background-elevated transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Milestone Toast
// ============================================================================

interface MilestoneToastProps {
  milestone: number;
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

function MilestoneToast({ milestone, message, isVisible, onClose }: MilestoneToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed top-20 left-1/2 -translate-x-1/2 z-[201]',
        'animate-in slide-in-from-top-4 fade-in duration-500'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-5 py-3 rounded-xl',
          'bg-gradient-to-r from-interactive-500/20 to-purple-500/20',
          'border border-interactive-500/30 shadow-lg backdrop-blur-md'
        )}
      >
        <span className="text-2xl">🎉</span>
        <div>
          <p className="text-sm font-semibold text-text-primary">{message}</p>
          <p className="text-xs text-text-secondary">{milestone} designs created!</p>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// Celebration Provider Hook
// ============================================================================

interface UseCelebrationReturn {
  celebrate: (config: CelebrationConfig) => void;
  celebrateAchievement: (achievement: Achievement) => void;
  celebrateMilestone: (milestone: number, message?: string) => void;
  isActive: boolean;
}

export function useCelebration(): UseCelebrationReturn {
  const [isActive, setIsActive] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<CelebrationConfig | null>(null);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);

  const celebrate = useCallback((config: CelebrationConfig) => {
    setCurrentConfig(config);
    setIsActive(true);
    
    // Play sound based on intensity
    if (config.intensity === 'epic') {
      playSound('celebration');
    } else if (config.intensity === 'normal') {
      playSound('success');
    } else {
      playSound('pop');
    }

    if (config.achievement) {
      setShowAchievement(true);
    }
    if (config.milestone) {
      setShowMilestone(true);
    }
  }, []);

  const celebrateAchievement = useCallback((achievement: Achievement) => {
    celebrate({
      trigger: 'achievement_unlocked',
      intensity: achievement.tier === 'platinum' ? 'epic' : 
                 achievement.tier === 'gold' ? 'normal' : 'subtle',
      achievement,
    });
  }, [celebrate]);

  const celebrateMilestone = useCallback((milestone: number, message?: string) => {
    const intensity: CelebrationIntensity = 
      milestone >= 100 ? 'epic' :
      milestone >= 25 ? 'normal' : 'subtle';

    celebrate({
      trigger: 'milestone_reached',
      intensity,
      milestone,
      message: message || `You've created ${milestone} designs!`,
    });
  }, [celebrate]);

  const handleComplete = useCallback(() => {
    setIsActive(false);
    setCurrentConfig(null);
  }, []);

  const handleCloseAchievement = useCallback(() => {
    setShowAchievement(false);
  }, []);

  const handleCloseMilestone = useCallback(() => {
    setShowMilestone(false);
  }, []);

  return {
    celebrate,
    celebrateAchievement,
    celebrateMilestone,
    isActive,
  };
}

// ============================================================================
// Celebration Overlay Component
// ============================================================================

interface CelebrationOverlayProps {
  config: CelebrationConfig | null;
  isActive: boolean;
  onComplete: () => void;
  onCloseAchievement: () => void;
  onCloseMilestone: () => void;
  showAchievement: boolean;
  showMilestone: boolean;
}

export function CelebrationOverlay({
  config,
  isActive,
  onComplete,
  onCloseAchievement,
  onCloseMilestone,
  showAchievement,
  showMilestone,
}: CelebrationOverlayProps) {
  if (!config) return null;

  return (
    <>
      <Confetti
        isActive={isActive}
        intensity={config.intensity}
        onComplete={onComplete}
      />
      
      {config.achievement && (
        <AchievementToast
          achievement={config.achievement}
          isVisible={showAchievement}
          onClose={onCloseAchievement}
        />
      )}
      
      {config.milestone && config.message && (
        <MilestoneToast
          milestone={config.milestone}
          message={config.message}
          isVisible={showMilestone}
          onClose={onCloseMilestone}
        />
      )}
    </>
  );
}

// ============================================================================
// Simple Celebration Trigger
// ============================================================================

interface CelebrationProps {
  trigger: CelebrationConfig | null;
}

export function Celebration({ trigger }: CelebrationProps) {
  const [isActive, setIsActive] = useState(false);
  const [showAchievement, setShowAchievement] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsActive(true);
      if (trigger.achievement) setShowAchievement(true);
      if (trigger.milestone) setShowMilestone(true);
      
      // Play sound
      if (trigger.intensity === 'epic') {
        playSound('celebration');
      } else if (trigger.intensity === 'normal') {
        playSound('success');
      }
    }
  }, [trigger]);

  if (!trigger) return null;

  return (
    <CelebrationOverlay
      config={trigger}
      isActive={isActive}
      onComplete={() => setIsActive(false)}
      onCloseAchievement={() => setShowAchievement(false)}
      onCloseMilestone={() => setShowMilestone(false)}
      showAchievement={showAchievement}
      showMilestone={showMilestone}
    />
  );
}
