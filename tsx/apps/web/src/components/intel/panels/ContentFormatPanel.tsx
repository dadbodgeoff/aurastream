/**
 * Content Format Panel
 * 
 * Displays V2 content format analysis including:
 * - Optimal video duration
 * - Shorts vs long-form comparison
 * - Live vs VOD performance
 * 
 * Uses the new Creator Intel V2 hooks.
 */

'use client';

import { useContentFormatIntel } from '@aurastream/api-client';
import { Clock, TrendingUp, Video, Radio } from 'lucide-react';

interface ContentFormatPanelProps {
  categoryKey: string;
  className?: string;
}

export function ContentFormatPanel({ categoryKey, className = '' }: ContentFormatPanelProps) {
  const { data, isLoading, error } = useContentFormatIntel(categoryKey);

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-zinc-800/50 rounded-xl p-4 ${className}`}>
        <div className="h-4 bg-zinc-700 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-3 bg-zinc-700 rounded w-full" />
          <div className="h-3 bg-zinc-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-zinc-800/50 rounded-xl p-4 ${className}`}>
        <p className="text-zinc-500 text-sm">No format data available</p>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-800/50 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Video className="w-4 h-4 text-purple-400" />
        <h3 className="font-medium text-white">Content Format</h3>
        <span className="ml-auto text-xs text-zinc-500">
          {data.confidence}% confidence
        </span>
      </div>

      {/* Optimal Duration */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
          <Clock className="w-3 h-3" />
          <span>Optimal Duration</span>
        </div>
        <p className="text-lg font-semibold text-white">
          {data.optimalDurationRange}
        </p>
      </div>

      {/* Format Comparisons */}
      <div className="space-y-3">
        {/* Shorts vs Long-form */}
        <FormatComparisonRow
          label="Shorts vs Long-form"
          comparison={data.shortsVsLongform}
        />
        
        {/* Live vs VOD */}
        <FormatComparisonRow
          label="Live vs VOD"
          comparison={data.liveVsVod}
        />
      </div>

      {/* Top Insight */}
      {data.insights.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" />
            <p className="text-xs text-zinc-400">{data.insights[0]}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface FormatComparisonRowProps {
  label: string;
  comparison: {
    formatA: string;
    formatB: string;
    formatAAvgViews: number;
    formatBAvgViews: number;
    performanceRatio: number;
    recommendation: string;
  };
}

function FormatComparisonRow({ label, comparison }: FormatComparisonRowProps) {
  const winner = comparison.performanceRatio > 1 ? comparison.formatA : comparison.formatB;
  const ratio = comparison.performanceRatio > 1 
    ? comparison.performanceRatio 
    : 1 / comparison.performanceRatio;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="text-white">
        <span className="text-green-400">{winner}</span>
        {' '}
        <span className="text-zinc-500">({ratio.toFixed(1)}x)</span>
      </span>
    </div>
  );
}

export default ContentFormatPanel;
