'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowLeft, Activity, CheckCircle, RefreshCw, XCircle, Zap,
  BarChart3, Timer, AlertCircle, Calendar, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Database, Cpu, Clock,
  Filter, Download, Search,
} from 'lucide-react';

// Types
interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

interface WorkerMetrics {
  worker_name: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  last_24h_executions: number;
  last_24h_failures: number;
  execution_history: TimeSeriesPoint[];
  duration_history: TimeSeriesPoint[];
}

interface DataVerification {
  records_fetched: number;
  records_processed: number;
  records_failed: number;
  api_calls_made: number;
  api_calls_succeeded: number;
  cache_hits: number;
  cache_writes: number;
  quality_level: string;
}

interface ExecutionReport {
  worker_name: string;
  execution_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  outcome: string;
  error_message: string | null;
  data_verification: DataVerification;
  custom_metrics: Record<string, any>;
  reliability_score: number;
  performance_score: number;
  data_quality_score: number;
  resource_efficiency_score: number;
  overall_score: number;
  anomalies: string[];
  recommendations: string[];
}

interface WorkerStats {
  worker_name: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  total_records_processed: number;
  avg_records_per_run: number;
  avg_overall_score: number;
  score_trend: number[];
  duration_trend: number[];
  first_execution: string | null;
  last_execution: string | null;
}

interface HourlyPerformance {
  hour: number;
  avg_score: number;
  avg_duration_ms: number;
  execution_count: number;
}

interface LearningInsights {
  worker_name: string;
  optimal_hour_utc: number | null;
  optimal_day: number | null;
  hourly_performance: HourlyPerformance[];
  data_volume_trend: string;
  suggested_optimizations: string[];
}

type TabType = 'overview' | 'executions' | 'learning' | 'data';
type OutcomeFilter = 'all' | 'success' | 'failed' | 'skipped';

// API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchWorkerMetrics(name: string): Promise<WorkerMetrics> {
  const res = await fetch(`${API_BASE}/api/v1/orchestrator/workers/${name}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

async function fetchWorkerExecutions(name: string, limit = 50): Promise<ExecutionReport[]> {
  const res = await fetch(`${API_BASE}/api/v1/orchestrator/workers/${name}/executions?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch executions');
  return res.json();
}

async function fetchWorkerStats(name: string): Promise<WorkerStats> {
  const res = await fetch(`${API_BASE}/api/v1/orchestrator/workers/${name}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

async function fetchWorkerLearning(name: string): Promise<LearningInsights> {
  const res = await fetch(`${API_BASE}/api/v1/orchestrator/workers/${name}/learning`);
  if (!res.ok) throw new Error('Failed to fetch learning');
  return res.json();
}

async function triggerWorker(name: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/orchestrator/workers/${name}/trigger`, { method: 'POST' });
}

// Helpers
const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const formatTimeAgo = (iso: string | null) => {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

const scoreColor = (s: number) => s >= 90 ? 'text-emerald-400' : s >= 70 ? 'text-amber-400' : s >= 50 ? 'text-orange-400' : 'text-red-400';
const scoreBg = (s: number) => s >= 90 ? 'bg-emerald-500' : s >= 70 ? 'bg-amber-500' : s >= 50 ? 'bg-orange-500' : 'bg-red-500';
const outcomeColor = (o: string) => o === 'success' ? 'text-emerald-400' : o === 'failed' ? 'text-red-400' : 'text-gray-400';
const outcomeIcon = (o: string) => o === 'success' ? CheckCircle : o === 'failed' ? XCircle : Minus;

// Compact Stat
function Stat({ label, value, sub, color = 'text-white', trend }: { 
  label: string; value: string | number; sub?: string; color?: string; trend?: 'up' | 'down' | 'stable';
}) {
  return (
    <div className="bg-gray-800/40 rounded-lg px-3 py-2 border border-gray-700/40">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="flex items-center gap-1">
        <span className={`text-lg font-semibold ${color}`}>{value}</span>
        {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
      </div>
      {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
    </div>
  );
}

// Score Bar
function ScoreBar({ label, score, compact = false }: { label: string; score: number; compact?: boolean }) {
  return (
    <div className={compact ? 'mb-1' : 'mb-2'}>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className={scoreColor(score)}>{score.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${scoreBg(score)} transition-all`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// Mini Sparkline Chart
function Sparkline({ data, height = 40, color = '#3b82f6', showSuccess = false }: {
  data: TimeSeriesPoint[];
  height?: number;
  color?: string;
  showSuccess?: boolean;
}) {
  if (data.length === 0) return <div className="text-gray-600 text-xs">No data</div>;
  
  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-px" style={{ height }}>
      {data.slice(-30).map((point, i) => {
        const h = ((point.value - min) / range) * 100;
        const c = showSuccess ? (point.value === 1 ? '#10b981' : '#ef4444') : color;
        return (
          <div
            key={i}
            className="flex-1 rounded-t transition-all hover:opacity-70"
            style={{ height: `${Math.max(h, 5)}%`, backgroundColor: c, minWidth: 2 }}
            title={`${new Date(point.timestamp).toLocaleTimeString()}: ${showSuccess ? (point.value === 1 ? 'OK' : 'Fail') : formatDuration(point.value)}`}
          />
        );
      })}
    </div>
  );
}

// Hourly Heatmap
function HourlyHeatmap({ data }: { data: HourlyPerformance[] }) {
  const maxCount = Math.max(...data.map(d => d.execution_count), 1);
  
  return (
    <div className="grid grid-cols-12 gap-1">
      {Array.from({ length: 24 }, (_, h) => {
        const perf = data.find(d => d.hour === h);
        const intensity = perf ? perf.execution_count / maxCount : 0;
        const score = perf?.avg_score || 0;
        
        return (
          <div
            key={h}
            className="aspect-square rounded text-[8px] flex items-center justify-center cursor-default"
            style={{
              backgroundColor: perf ? `rgba(59, 130, 246, ${0.2 + intensity * 0.6})` : 'rgba(55, 65, 81, 0.3)',
              color: intensity > 0.5 ? 'white' : 'rgb(156, 163, 175)',
            }}
            title={`${h}:00 UTC - ${perf?.execution_count || 0} runs, avg score: ${score.toFixed(0)}`}
          >
            {h}
          </div>
        );
      })}
    </div>
  );
}

// Execution Row (expandable)
function ExecutionRow({ exec, expanded, onToggle }: { 
  exec: ExecutionReport; 
  expanded: boolean; 
  onToggle: () => void;
}) {
  const Icon = outcomeIcon(exec.outcome);
  
  return (
    <>
      <tr 
        className="border-b border-gray-800/30 hover:bg-gray-800/20 text-xs cursor-pointer"
        onClick={onToggle}
      >
        <td className="py-1.5 px-3">
          <div className="flex items-center gap-1.5">
            <Icon className={`w-3 h-3 ${outcomeColor(exec.outcome)}`} />
            <span className="font-mono text-gray-400 text-[10px]">{exec.execution_id.slice(0, 8)}</span>
          </div>
        </td>
        <td className="py-1.5 px-3 text-gray-500">{formatTimeAgo(exec.completed_at)}</td>
        <td className="py-1.5 px-3 text-gray-400">{formatDuration(exec.duration_ms)}</td>
        <td className="py-1.5 px-3">
          <span className={`font-medium ${scoreColor(exec.overall_score)}`}>{exec.overall_score.toFixed(0)}</span>
        </td>
        <td className="py-1.5 px-3 text-gray-500">{exec.data_verification.records_processed}</td>
        <td className="py-1.5 px-3">
          {exec.anomalies.length > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded">{exec.anomalies.length}</span>
          )}
        </td>
        <td className="py-1.5 px-3">
          {expanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-800/10">
          <td colSpan={7} className="p-3">
            <div className="grid grid-cols-4 gap-3 mb-3">
              <ScoreBar label="Reliability" score={exec.reliability_score} compact />
              <ScoreBar label="Performance" score={exec.performance_score} compact />
              <ScoreBar label="Data Quality" score={exec.data_quality_score} compact />
              <ScoreBar label="Resource" score={exec.resource_efficiency_score} compact />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Data Verification */}
              <div className="bg-gray-800/30 rounded p-2">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Data Verification</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-gray-500">Fetched:</span> <span className="text-white">{exec.data_verification.records_fetched}</span></div>
                  <div><span className="text-gray-500">Processed:</span> <span className="text-white">{exec.data_verification.records_processed}</span></div>
                  <div><span className="text-gray-500">Failed:</span> <span className="text-red-400">{exec.data_verification.records_failed}</span></div>
                  <div><span className="text-gray-500">API Calls:</span> <span className="text-white">{exec.data_verification.api_calls_succeeded}/{exec.data_verification.api_calls_made}</span></div>
                  <div><span className="text-gray-500">Cache Hits:</span> <span className="text-white">{exec.data_verification.cache_hits}</span></div>
                  <div><span className="text-gray-500">Cache Writes:</span> <span className="text-white">{exec.data_verification.cache_writes}</span></div>
                </div>
              </div>
              
              {/* Custom Metrics */}
              <div className="bg-gray-800/30 rounded p-2">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Custom Metrics</div>
                <div className="text-xs text-gray-400 max-h-20 overflow-auto">
                  {Object.entries(exec.custom_metrics).slice(0, 6).map(([k, v]) => (
                    <div key={k} className="truncate">
                      <span className="text-gray-500">{k}:</span> <span className="text-white">{typeof v === 'object' ? JSON.stringify(v).slice(0, 30) : String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {exec.error_message && (
              <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded p-2 text-xs text-red-400">
                {exec.error_message}
              </div>
            )}
            
            {exec.anomalies.length > 0 && (
              <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                <div className="text-[10px] text-amber-400 mb-1">Anomalies</div>
                <ul className="text-xs text-amber-300 list-disc list-inside">
                  {exec.anomalies.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            
            {exec.recommendations.length > 0 && (
              <div className="mt-2 bg-blue-500/10 border border-blue-500/20 rounded p-2">
                <div className="text-[10px] text-blue-400 mb-1">Recommendations</div>
                <ul className="text-xs text-blue-300 list-disc list-inside">
                  {exec.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// Main Component
export default function WorkerDetailPage() {
  const params = useParams();
  const workerName = params.name as string;
  
  const [tab, setTab] = useState<TabType>('overview');
  const [expandedExec, setExpandedExec] = useState<string | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all');
  const [execPage, setExecPage] = useState(0);
  const execPerPage = 15;
  
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['worker-metrics', workerName],
    queryFn: () => fetchWorkerMetrics(workerName),
    refetchInterval: 15000,
  });
  
  const { data: executions, isLoading: execLoading } = useQuery({
    queryKey: ['worker-executions', workerName],
    queryFn: () => fetchWorkerExecutions(workerName, 100),
    refetchInterval: 15000,
  });
  
  const { data: stats } = useQuery({
    queryKey: ['worker-stats', workerName],
    queryFn: () => fetchWorkerStats(workerName),
    refetchInterval: 30000,
  });
  
  const { data: learning } = useQuery({
    queryKey: ['worker-learning', workerName],
    queryFn: () => fetchWorkerLearning(workerName),
    refetchInterval: 60000,
  });
  
  const triggerMutation = useMutation({ mutationFn: () => triggerWorker(workerName) });
  
  // Filtered executions
  const filteredExecs = useMemo(() => {
    if (!executions) return [];
    let execs = [...executions];
    if (outcomeFilter !== 'all') {
      execs = execs.filter(e => e.outcome === outcomeFilter);
    }
    return execs;
  }, [executions, outcomeFilter]);
  
  const paginatedExecs = useMemo(() => {
    const start = execPage * execPerPage;
    return filteredExecs.slice(start, start + execPerPage);
  }, [filteredExecs, execPage]);
  
  const totalExecPages = Math.ceil(filteredExecs.length / execPerPage);
  
  const isLoading = metricsLoading || execLoading;
  const displayName = workerName.replace(/_/g, ' ');
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }
  
  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm mb-2">Worker not found</p>
          <Link href="/admin/orchestrator" className="text-xs text-blue-400 hover:underline">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/orchestrator" className="p-1.5 rounded bg-gray-800 hover:bg-gray-700">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold capitalize">{displayName}</h1>
            <p className="text-xs text-gray-500">Worker Analytics</p>
          </div>
        </div>
        <button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
        >
          <Zap className="w-3 h-3" />
          Trigger
        </button>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-8 gap-2 mb-4">
        <Stat label="Total Runs" value={metrics.total_executions.toLocaleString()} color="text-blue-400" />
        <Stat label="Success Rate" value={`${(metrics.success_rate * 100).toFixed(1)}%`} color={metrics.success_rate >= 0.95 ? 'text-emerald-400' : 'text-amber-400'} />
        <Stat label="Failed" value={metrics.failed_executions} color="text-red-400" />
        <Stat label="Avg Duration" value={formatDuration(metrics.avg_duration_ms)} color="text-purple-400" />
        <Stat label="P50" value={formatDuration(metrics.p50_duration_ms)} color="text-gray-300" />
        <Stat label="P95" value={formatDuration(metrics.p95_duration_ms)} color="text-orange-400" />
        <Stat label="Last 24h" value={metrics.last_24h_executions} sub={`${metrics.last_24h_failures} failed`} color="text-cyan-400" />
        <Stat label="Avg Score" value={stats?.avg_overall_score.toFixed(0) || '-'} color={scoreColor(stats?.avg_overall_score || 0)} />
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800">
        {(['overview', 'executions', 'learning', 'data'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs capitalize border-b-2 transition-colors ${
              tab === t ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          {/* Execution History Chart */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">Execution History</span>
            </div>
            <Sparkline data={metrics.execution_history} showSuccess height={60} />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>Older</span>
              <span>Recent</span>
            </div>
          </div>
          
          {/* Duration History Chart */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Duration History</span>
            </div>
            <Sparkline data={metrics.duration_history} color="#3b82f6" height={60} />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>Older</span>
              <span>Recent</span>
            </div>
          </div>
          
          {/* Score Breakdown */}
          {stats && (
            <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">Performance Stats</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-gray-500">Min Duration:</span> <span className="text-white">{formatDuration(stats.min_duration_ms)}</span></div>
                <div><span className="text-gray-500">Max Duration:</span> <span className="text-white">{formatDuration(stats.max_duration_ms)}</span></div>
                <div><span className="text-gray-500">Total Records:</span> <span className="text-white">{stats.total_records_processed.toLocaleString()}</span></div>
                <div><span className="text-gray-500">Avg/Run:</span> <span className="text-white">{stats.avg_records_per_run.toFixed(0)}</span></div>
                <div><span className="text-gray-500">First Run:</span> <span className="text-white">{formatTimeAgo(stats.first_execution)}</span></div>
                <div><span className="text-gray-500">Last Run:</span> <span className="text-white">{formatTimeAgo(stats.last_execution)}</span></div>
              </div>
            </div>
          )}
          
          {/* Hourly Heatmap */}
          {learning && learning.hourly_performance.length > 0 && (
            <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium">Hourly Activity (UTC)</span>
              </div>
              <HourlyHeatmap data={learning.hourly_performance} />
            </div>
          )}
        </div>
      )}

      {tab === 'executions' && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/40">
          <div className="flex items-center justify-between p-3 border-b border-gray-700/40">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">Execution Log</span>
              <span className="text-xs text-gray-500">({filteredExecs.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={outcomeFilter}
                onChange={e => { setOutcomeFilter(e.target.value as OutcomeFilter); setExecPage(0); }}
                className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1"
              >
                <option value="all">All Outcomes</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setExecPage(p => Math.max(0, p - 1))}
                  disabled={execPage === 0}
                  className="px-2 py-1 bg-gray-800 rounded disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="text-gray-500 px-2">{execPage + 1}/{totalExecPages || 1}</span>
                <button
                  onClick={() => setExecPage(p => Math.min(totalExecPages - 1, p + 1))}
                  disabled={execPage >= totalExecPages - 1}
                  className="px-2 py-1 bg-gray-800 rounded disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">ID</th>
                <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Time</th>
                <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Duration</th>
                <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Score</th>
                <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Records</th>
                <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Issues</th>
                <th className="py-1.5 px-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedExecs.map(exec => (
                <ExecutionRow
                  key={exec.execution_id}
                  exec={exec}
                  expanded={expandedExec === exec.execution_id}
                  onToggle={() => setExpandedExec(e => e === exec.execution_id ? null : exec.execution_id)}
                />
              ))}
            </tbody>
          </table>
          {paginatedExecs.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-xs">No executions match filter</div>
          )}
        </div>
      )}
      
      {tab === 'learning' && learning && (
        <div className="grid grid-cols-2 gap-4">
          {/* Optimal Times */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium">Optimal Execution Times</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs">Best Hour (UTC)</div>
                <div className="text-xl font-bold text-emerald-400">
                  {learning.optimal_hour_utc !== null ? `${learning.optimal_hour_utc}:00` : '-'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Best Day</div>
                <div className="text-xl font-bold text-blue-400">
                  {learning.optimal_day !== null ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][learning.optimal_day] : '-'}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs">
              <div className="text-gray-500 mb-1">Data Volume Trend</div>
              <div className={`font-medium ${
                learning.data_volume_trend === 'increasing' ? 'text-emerald-400' :
                learning.data_volume_trend === 'decreasing' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {learning.data_volume_trend === 'increasing' && <TrendingUp className="w-3 h-3 inline mr-1" />}
                {learning.data_volume_trend === 'decreasing' && <TrendingDown className="w-3 h-3 inline mr-1" />}
                {learning.data_volume_trend.charAt(0).toUpperCase() + learning.data_volume_trend.slice(1)}
              </div>
            </div>
          </div>
          
          {/* Optimizations */}
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">Suggested Optimizations</span>
            </div>
            {learning.suggested_optimizations.length > 0 ? (
              <ul className="text-xs text-gray-300 space-y-2">
                {learning.suggested_optimizations.map((opt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    {opt}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-gray-500">No optimizations suggested</div>
            )}
          </div>
          
          {/* Hourly Performance Table */}
          <div className="col-span-2 bg-gray-800/30 rounded-lg border border-gray-700/40 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">Hourly Performance Breakdown</span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {learning.hourly_performance.sort((a, b) => a.hour - b.hour).map(hp => (
                <div key={hp.hour} className="bg-gray-800/50 rounded p-2 text-center">
                  <div className="text-[10px] text-gray-500">{hp.hour}:00</div>
                  <div className={`text-sm font-medium ${scoreColor(hp.avg_score)}`}>{hp.avg_score.toFixed(0)}</div>
                  <div className="text-[10px] text-gray-600">{hp.execution_count} runs</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {tab === 'data' && stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Data Processing Summary</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Total Records Processed</span><span className="text-white">{stats.total_records_processed.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Average per Run</span><span className="text-white">{stats.avg_records_per_run.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Executions</span><span className="text-white">{stats.total_executions}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Success Rate</span><span className={scoreColor(stats.success_rate * 100)}>{(stats.success_rate * 100).toFixed(1)}%</span></div>
            </div>
          </div>
          
          <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">Score Trend</span>
            </div>
            {stats.score_trend.length > 0 ? (
              <div className="flex items-end gap-1 h-16">
                {stats.score_trend.slice(-20).map((s, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${scoreBg(s)}`}
                    style={{ height: `${s}%`, minWidth: 4 }}
                    title={`Score: ${s.toFixed(0)}`}
                  />
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No trend data</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
