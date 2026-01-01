'use client';

import { Calendar, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLatestPlaybook } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { PanelCard } from './PanelCard';
import type { WeeklySchedule, WeeklyTimeSlot } from '@aurastream/api-client';

// =============================================================================
// Constants
// =============================================================================

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const HOURS = [0, 3, 6, 9, 12, 15, 18, 21]; // Show every 3 hours

// =============================================================================
// Heat Cell
// =============================================================================

function HeatCell({ 
  score, 
  isBest = false,
  hour,
  day,
}: { 
  score: number;
  isBest?: boolean;
  hour: number;
  day: string;
}) {
  // Color intensity based on score (0-100)
  const getColor = () => {
    if (isBest) return 'bg-interactive-500';
    if (score >= 80) return 'bg-interactive-600/80';
    if (score >= 60) return 'bg-interactive-600/60';
    if (score >= 40) return 'bg-interactive-600/40';
    if (score >= 20) return 'bg-interactive-600/20';
    return 'bg-white/5';
  };
  
  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}${period}`;
  };
  
  return (
    <div
      className={cn(
        'w-full aspect-square rounded-sm transition-all cursor-default',
        getColor(),
        isBest && 'ring-2 ring-interactive-400 ring-offset-1 ring-offset-background-surface'
      )}
      title={`${day} ${formatHour(hour)}: ${score}% opportunity`}
    />
  );
}

// =============================================================================
// Weekly Heatmap Panel
// =============================================================================

export function WeeklyHeatmapPanel() {
  const { data: playbook, isLoading, isError, refetch, dataUpdatedAt } = useLatestPlaybook();
  const subscribedCategories = useIntelStore(state => state.subscribedCategories);
  
  // Only show schedule if user has subscribed categories
  const hasSubscriptions = subscribedCategories.length > 0;
  const schedule = hasSubscriptions ? playbook?.weeklySchedule : undefined;
  
  // Find best slot
  const findBestSlot = (schedule: WeeklySchedule | undefined) => {
    if (!schedule) return null;
    
    let best = { day: '', hour: 0, score: 0 };
    
    DAY_KEYS.forEach((dayKey, dayIndex) => {
      const slots = schedule[dayKey] || [];
      slots.forEach((slot: WeeklyTimeSlot) => {
        if (slot.score > best.score) {
          best = { day: DAYS[dayIndex], hour: slot.hour, score: slot.score };
        }
      });
    });
    
    return best.score > 0 ? best : null;
  };
  
  const bestSlot = findBestSlot(schedule);
  
  // Get slot score for a specific day and hour
  const getSlotScore = (dayKey: typeof DAY_KEYS[number], hour: number): number => {
    if (!schedule) return 0;
    const slots = schedule[dayKey] || [];
    const slot = slots.find((s: WeeklyTimeSlot) => s.hour === hour);
    return slot?.score || 0;
  };
  
  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}${period}`;
  };
  
  return (
    <PanelCard
      title="Weekly Heatmap"
      icon={<Calendar className="w-4 h-4" />}
      isLoading={isLoading}
      isError={isError}
      errorMessage="Couldn't load schedule data"
      lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
      onRefresh={() => refetch()}
      size="wide"
    >
      {!schedule ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <Calendar className="w-8 h-8 text-text-muted/50 mb-2" />
          <p className="text-sm text-text-muted">
            {hasSubscriptions ? 'No schedule data available' : 'Subscribe to categories'}
          </p>
          {!hasSubscriptions && (
            <p className="text-xs text-text-muted mt-1">to see weekly schedule insights</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Best Slot Highlight */}
          {bestSlot && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-interactive-600/10 border border-interactive-500/20">
              <div className="p-2 rounded-lg bg-interactive-600/20">
                <TrendingUp className="w-4 h-4 text-interactive-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Best Time: {bestSlot.day} at {formatHour(bestSlot.hour)}
                </p>
                <p className="text-xs text-text-muted">
                  {bestSlot.score}% opportunity score
                </p>
              </div>
            </div>
          )}
          
          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[300px]">
              {/* Hour Labels */}
              <div className="flex mb-1">
                <div className="w-10" /> {/* Spacer for day labels */}
                {HOURS.map((hour) => (
                  <div key={hour} className="flex-1 text-center">
                    <span className="text-xs text-text-muted">
                      {formatHour(hour)}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Grid Rows */}
              {DAY_KEYS.map((dayKey, dayIndex) => (
                <div key={dayKey} className="flex items-center gap-1 mb-1">
                  {/* Day Label */}
                  <div className="w-10 text-xs text-text-muted">
                    {DAYS[dayIndex]}
                  </div>
                  
                  {/* Hour Cells */}
                  {HOURS.map((hour) => {
                    const score = getSlotScore(dayKey, hour);
                    const isBest = bestSlot?.day === DAYS[dayIndex] && bestSlot?.hour === hour;
                    
                    return (
                      <div key={hour} className="flex-1">
                        <HeatCell
                          score={score}
                          isBest={isBest}
                          hour={hour}
                          day={DAYS[dayIndex]}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Low</span>
              <div className="flex gap-0.5">
                {[5, 20, 40, 60, 80].map((score) => (
                  <div
                    key={score}
                    className={cn(
                      'w-4 h-3 rounded-sm',
                      score >= 80 ? 'bg-interactive-600/80' :
                      score >= 60 ? 'bg-interactive-600/60' :
                      score >= 40 ? 'bg-interactive-600/40' :
                      score >= 20 ? 'bg-interactive-600/20' :
                      'bg-white/5'
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-text-muted">High</span>
            </div>
            
            {schedule.timezone && (
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Clock className="w-3 h-3" />
                <span>{schedule.timezone}</span>
              </div>
            )}
          </div>
          
          {/* AI Insight */}
          {schedule.aiInsight && (
            <div className="pt-2 border-t border-border-subtle">
              <p className="text-xs text-text-secondary">
                💡 {schedule.aiInsight}
              </p>
            </div>
          )}
        </div>
      )}
    </PanelCard>
  );
}
