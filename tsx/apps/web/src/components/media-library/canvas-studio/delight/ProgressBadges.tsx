/**
 * Progress Badges Component
 * 
 * Visual progress indicators showing user stats and achievements.
 */

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { UserProgress, Achievement, AchievementProgress } from './types';
import { 
  ACHIEVEMENTS, 
  getAllAchievements, 
  getAchievementProgress, 
  getTierColor, 
  getTierBgColor 
} from './Achievements';

// ============================================================================
// Icons
// ============================================================================

function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ============================================================================
// Stat Badge
// ============================================================================

interface StatBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color?: string;
  className?: string;
}

function StatBadge({ icon, label, value, color = 'text-interactive-400', className }: StatBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-background-elevated/50 border border-border-subtle',
        className
      )}
    >
      <span className={cn('flex-shrink-0', color)}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-text-muted truncate">{label}</p>
        <p className="text-sm font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Achievement Badge
// ============================================================================

interface AchievementBadgeProps {
  achievement: Achievement;
  progress: AchievementProgress;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export function AchievementBadge({
  achievement,
  progress,
  size = 'md',
  showProgress = true,
  className,
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-16 h-16 text-3xl',
  };

  const progressPercent = Math.min(
    (progress.currentValue / achievement.requirement) * 100,
    100
  );

  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-1',
        !progress.isUnlocked && 'opacity-50 grayscale',
        className
      )}
      title={`${achievement.name}: ${achievement.description}`}
    >
      {/* Badge icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-xl',
          sizeClasses[size],
          getTierBgColor(achievement.tier),
          progress.isUnlocked && 'ring-2 ring-offset-2 ring-offset-background-surface',
          progress.isUnlocked && achievement.tier === 'gold' && 'ring-yellow-500',
          progress.isUnlocked && achievement.tier === 'platinum' && 'ring-purple-400',
          progress.isUnlocked && achievement.tier === 'silver' && 'ring-gray-400',
          progress.isUnlocked && achievement.tier === 'bronze' && 'ring-amber-600'
        )}
      >
        {achievement.icon}
      </div>

      {/* Progress bar */}
      {showProgress && !progress.isUnlocked && (
        <div className="w-full h-1 bg-background-elevated rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full', getTierColor(achievement.tier).replace('text-', 'bg-'))}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Label */}
      {size !== 'sm' && (
        <p className="text-[10px] text-text-muted text-center truncate max-w-full">
          {achievement.name}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Progress Overview
// ============================================================================

interface ProgressOverviewProps {
  progress: UserProgress;
  className?: string;
}

export function ProgressOverview({ progress, className }: ProgressOverviewProps) {
  const unlockedCount = progress.achievementsUnlocked.length;
  const totalCount = getAllAchievements().length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <StatBadge
          icon={<StarIcon />}
          label="Total Designs"
          value={progress.totalDesigns}
          color="text-yellow-500"
        />
        <StatBadge
          icon={<CalendarIcon />}
          label="This Week"
          value={progress.designsThisWeek}
          color="text-blue-400"
        />
        <StatBadge
          icon={<FireIcon />}
          label="Current Streak"
          value={`${progress.currentStreak} days`}
          color="text-orange-500"
        />
        <StatBadge
          icon={<TrophyIcon />}
          label="Achievements"
          value={`${unlockedCount}/${totalCount}`}
          color="text-purple-400"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Achievements Grid
// ============================================================================

interface AchievementsGridProps {
  progress: UserProgress;
  showLocked?: boolean;
  className?: string;
}

export function AchievementsGrid({ progress, showLocked = true, className }: AchievementsGridProps) {
  const achievements = useMemo(() => {
    const all = getAllAchievements();
    return all.map((achievement) => ({
      achievement,
      progress: getAchievementProgress(achievement.id, progress),
    }));
  }, [progress]);

  const filtered = showLocked
    ? achievements
    : achievements.filter((a) => a.progress.isUnlocked);

  return (
    <div className={cn('grid grid-cols-4 gap-3', className)}>
      {filtered.map(({ achievement, progress: achievementProgress }) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          progress={achievementProgress}
          size="md"
        />
      ))}
    </div>
  );
}

// ============================================================================
// Compact Progress Badge
// ============================================================================

interface CompactProgressBadgeProps {
  progress: UserProgress;
  className?: string;
}

export function CompactProgressBadge({ progress, className }: CompactProgressBadgeProps) {
  const unlockedCount = progress.achievementsUnlocked.length;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-background-surface/80 backdrop-blur-sm border border-border-subtle',
        className
      )}
    >
      <span className="text-yellow-500">
        <StarIcon />
      </span>
      <span className="text-sm font-medium text-text-primary">
        {progress.totalDesigns}
      </span>
      <span className="w-px h-4 bg-border-subtle" />
      <span className="text-purple-400">
        <TrophyIcon />
      </span>
      <span className="text-sm font-medium text-text-primary">
        {unlockedCount}
      </span>
      {progress.currentStreak > 0 && (
        <>
          <span className="w-px h-4 bg-border-subtle" />
          <span className="text-orange-500">
            <FireIcon />
          </span>
          <span className="text-sm font-medium text-text-primary">
            {progress.currentStreak}
          </span>
        </>
      )}
    </div>
  );
}
