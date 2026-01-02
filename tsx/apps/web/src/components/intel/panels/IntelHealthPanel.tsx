/**
 * Intel Health Panel
 * 
 * Displays V2 system health and orchestrator status.
 * Useful for admin/debugging views.
 */

'use client';

import { useIntelHealth, useOrchestratorStatus } from '@aurastream/api-client';
import { Activity, CheckCircle, AlertCircle, XCircle, Gauge } from 'lucide-react';

interface IntelHealthPanelProps {
  className?: string;
}

export function IntelHealthPanel({ className = '' }: IntelHealthPanelProps) {
  const { data: health, isLoading: healthLoading } = useIntelHealth();
  const { data: orchestrator, isLoading: orchLoading } = useOrchestratorStatus();

  if (healthLoading || orchLoading) {
    return (
      <div className={`animate-pulse bg-zinc-800/50 rounded-xl p-4 ${className}`}>
        <div className="h-4 bg-zinc-700 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-3 bg-zinc-700 rounded w-full" />
          <div className="h-3 bg-zinc-700 rounded w-2/3" />
        </div>
      </div>
    );
  }

  const statusIcon = {
    healthy: <CheckCircle className="w-4 h-4 text-green-400" />,
    degraded: <AlertCircle className="w-4 h-4 text-yellow-400" />,
    unhealthy: <XCircle className="w-4 h-4 text-red-400" />,
    unknown: <AlertCircle className="w-4 h-4 text-zinc-400" />,
  };

  return (
    <div className={`bg-zinc-800/50 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-blue-400" />
        <h3 className="font-medium text-white">Intel System Health</h3>
      </div>

      {/* Overall Status */}
      {health && (
        <div className="flex items-center gap-2 mb-4">
          {statusIcon[health.status]}
          <span className="text-sm text-white capitalize">{health.status}</span>
        </div>
      )}

      {/* Components */}
      {health?.components && (
        <div className="space-y-2 mb-4">
          {health.components.map((comp) => (
            <div key={comp.name} className="flex items-center justify-between text-sm">
              <span className="text-zinc-400 capitalize">{comp.name}</span>
              <div className="flex items-center gap-1">
                {statusIcon[comp.status]}
                <span className="text-zinc-300">{comp.message || comp.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Orchestrator Metrics */}
      {orchestrator && (
        <div className="pt-4 border-t border-zinc-700">
          <div className="flex items-center gap-2 mb-3">
            <Gauge className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-zinc-400">Orchestrator</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-zinc-500 text-xs">Tasks Run</p>
              <p className="text-white font-medium">{orchestrator.metrics.tasksExecuted}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Success Rate</p>
              <p className="text-white font-medium">
                {orchestrator.metrics.successRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Quota Used</p>
              <p className="text-white font-medium">
                {orchestrator.quota.percentUsed.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Uptime</p>
              <p className="text-white font-medium">
                {formatUptime(orchestrator.metrics.uptimeSeconds)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default IntelHealthPanel;
