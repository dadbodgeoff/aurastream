'use client';

import { useMemo } from 'react';
import type { WeeklySchedule, WeeklyTimeSlot } from '@aurastream/api-client';
import { cn } from '@/lib/utils';

interface WeeklyHeatmapProps {
  schedule: WeeklySchedule;
  className?: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Show hours from 6 AM to 2 AM (most relevant for streaming)
const DISPLAY_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];

function formatHour(hour: number): string {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 70) return 'bg-green-400';
  if (score >= 60) return 'bg-cyan-400';
  if (score >= 50) return 'bg-cyan-300/70';
  if (score >= 40) return 'bg-yellow-400/60';
  if (score >= 30) return 'bg-orange-400/50';
  return 'bg-red-400/30';
}

function getScoreOpacity(score: number): string {
  if (score >= 70) return 'opacity-100';
  if (score >= 50) return 'opacity-80';
  if (score >= 30) return 'opacity-60';
  return 'opacity-40';
}

export function WeeklyHeatmap({ schedule, className }: WeeklyHeatmapProps) {
  // Find the best slot for highlighting
  const bestSlot = useMemo(() => {
    let best: { day: string; hour: number; score: number } | null = null;
    
    for (const day of DAYS) {
      const slots = schedule[day] || [];
      for (const slot of slots) {
        if (!best || slot.score > best.score) {
          best = { day, hour: slot.hour, score: slot.score };
        }
      }
    }
    
    return best;
  }, [schedule]);

  return (
    <div className={cn("bg-background-surface border border-border-subtle rounded-xl p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-interactive-600/20 flex items-center justify-center">
            <span className="text-xl">📅</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Weekly Stream Schedule</h2>
            <p className="text-xs text-text-muted">Best times to go live ({schedule.timezone})</p>
          </div>
        </div>
        
        {schedule.bestSlot && (
          <div className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
            🎯 Best: {schedule.bestSlot}
          </div>
        )}
      </div>

      {/* AI Insight */}
      {schedule.aiInsight && (
        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-sm text-purple-300">
            <span className="font-medium">🤖 AI Insight:</span> {schedule.aiInsight}
          </p>
        </div>
      )}

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex mb-1">
            <div className="w-12 flex-shrink-0" /> {/* Spacer for day labels */}
            {DISPLAY_HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-micro text-text-muted"
              >
                {hour % 3 === 0 ? formatHour(hour) : ''}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {DAYS.map((day, dayIndex) => {
            const slots = schedule[day] || [];
            const slotMap = new Map(slots.map(s => [s.hour, s]));

            return (
              <div key={day} className="flex items-center mb-1">
                {/* Day label */}
                <div className="w-12 flex-shrink-0 text-xs text-text-secondary font-medium">
                  {DAY_LABELS[dayIndex]}
                </div>

                {/* Hour cells */}
                {DISPLAY_HOURS.map((hour) => {
                  const slot = slotMap.get(hour);
                  const score = slot?.score ?? 30;
                  const isBest = bestSlot?.day === day && bestSlot?.hour === hour;

                  return (
                    <div
                      key={hour}
                      className="flex-1 px-0.5"
                    >
                      <div
                        className={cn(
                          "h-6 rounded-sm transition-all cursor-pointer hover:scale-110 hover:z-10 relative",
                          getScoreColor(score),
                          getScoreOpacity(score),
                          isBest && "ring-2 ring-white ring-offset-1 ring-offset-background-surface"
                        )}
                        title={`${DAY_LABELS[dayIndex]} ${formatHour(hour)} - ${score}% opportunity${
                          slot ? ` (${slot.competition} competition, ${slot.viewers} viewers)` : ''
                        }`}
                      >
                        {isBest && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-micro">⭐</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border-subtle">
        <span className="text-xs text-text-muted">Opportunity:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm bg-red-400/30" />
          <span className="text-micro text-text-muted">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm bg-yellow-400/60" />
          <span className="text-micro text-text-muted">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm bg-cyan-400" />
          <span className="text-micro text-text-muted">Good</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm bg-green-500" />
          <span className="text-micro text-text-muted">Best</span>
        </div>
      </div>
    </div>
  );
}
