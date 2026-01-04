'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Activity, AlertTriangle, CheckCircle, Clock, Cpu, Database,
  Pause, Play, RefreshCw, Server, XCircle, Zap, BarChart3,
  ChevronDown, ChevronUp, Filter, Search, ArrowUpDown,
  TrendingUp, TrendingDown, Minus, Eye, Settings, Brain,
} from 'lucide-react';

// Types
interface WorkerStatus {
  name: string;
  type: string;
  mode: string;
  enabled: boolean;
  running: boolean;
  last_run: string | null;
  last_success: string | null;
  last_error: string | null;
  consecutive_failures: number;
  health_status: string;
  avg_duration_ms: number;
  success_rate: number;
  total_executions: number;
  // Scheduled worker fields
  is_scheduled?: boolean;
  next_scheduled_run?: string | null;
  schedule_interval_seconds?: number;
}

interface OrchestratorStatus {
  state: string;
  instance_id: string;
  is_leader: boolean;
  uptime_seconds: number;
  started_at: string | null;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
}

interface ScoreReport {
  worker_name: string;
  execution_id: string;
  started_at: string;
  completed_at: string;
  success: boolean;
  duration_ms: number;
  error: string | null;
  reliability_score: number;
  performance_score: number;
  data_quality_score: number;
  resource_score: number;
  overall_score: number;
  anomalies: string[];
  recommendations: string[];
}

interface AnomalyAlert {
  alert_id: string;
  anomaly_type: string;
  severity: string;
  worker_name: string;
  message: string;
  detected_at: string;
  resolved: boolean;
}

interface DashboardSummary {
  orchestrator: OrchestratorStatus;
  workers: WorkerStatus[];
  recent_scores: ScoreReport[];
  active_anomalies: AnomalyAlert[];
  metrics: {
    total_workers: number;
    healthy_workers: number;
    running_workers: number;
    active_anomalies: number;
    avg_success_rate: number;
    total_executions_24h: number;
  };
}

type SortField = 'name' | 'health_status' | 'success_rate' | 'last_run' | 'avg_duration_ms';
type SortDir = 'asc' | 'desc';
type HealthFilter = 'all' | 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
type TypeFilter = 'all' | 'intel' | 'generation' | 'analytics' | 'thumbnail';

// API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchDashboard(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/api/v1/orchestrator/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

async function toggleWorker(name: string, enable: boolean): Promise<void> {
  const endpoint = enable ? 'enable' : 'disable';
  await fetch(`${API_BASE}/api/v1/orchestrator/workers/${name}/${endpoint}`, { method: 'POST' });
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
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
};

const healthColors: Record<string, string> = {
  healthy: 'text-emerald-400',
  degraded: 'text-amber-400',
  unhealthy: 'text-red-400',
  unknown: 'text-gray-500',
  offline: 'text-gray-600',
};

const healthBg: Record<string, string> = {
  healthy: 'bg-emerald-500/10 border-emerald-500/30',
  degraded: 'bg-amber-500/10 border-amber-500/30',
  unhealthy: 'bg-red-500/10 border-red-500/30',
  unknown: 'bg-gray-500/10 border-gray-500/30',
};

const scoreColor = (s: number) => s >= 90 ? 'text-emerald-400' : s >= 70 ? 'text-amber-400' : s >= 50 ? 'text-orange-400' : 'text-red-400';

// Compact Stat Card
function Stat({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-800/40 rounded-lg px-3 py-2 border border-gray-700/40">
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
    </div>
  );
}

// Compact Worker Row
function WorkerRow({ 
  worker, 
  onToggle, 
  onTrigger 
}: { 
  worker: WorkerStatus;
  onToggle: (name: string, enable: boolean) => void;
  onTrigger: (name: string) => void;
}) {
  const health = worker.health_status;
  
  // Calculate display success rate - show "N/A" if no executions
  const hasExecutions = worker.total_executions > 0;
  const successRateDisplay = hasExecutions 
    ? `${(worker.success_rate * 100).toFixed(0)}%`
    : 'N/A';
  const successRateColor = hasExecutions 
    ? scoreColor(worker.success_rate * 100)
    : 'text-gray-500';
  
  return (
    <tr className="border-b border-gray-800/50 hover:bg-gray-800/30 text-sm">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${worker.running ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          <Link href={`/admin/orchestrator/worker/${worker.name}`} className="text-white hover:text-blue-400 font-medium">
            {worker.name.replace(/_/g, ' ')}
          </Link>
        </div>
      </td>
      <td className="py-2 px-3">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          worker.mode === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
          worker.mode === 'continuous' ? 'bg-purple-500/20 text-purple-400' :
          'bg-green-500/20 text-green-400'
        }`}>
          {worker.mode}
        </span>
      </td>
      <td className="py-2 px-3">
        <span className={`text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400`}>
          {worker.type}
        </span>
      </td>
      <td className="py-2 px-3">
        <span className={`text-xs font-medium ${healthColors[health] || 'text-gray-500'}`}>
          {health}
        </span>
      </td>
      <td className="py-2 px-3 text-gray-400 text-xs">{formatTimeAgo(worker.last_run)}</td>
      <td className="py-2 px-3">
        <span className={successRateColor}>
          {successRateDisplay}
        </span>
      </td>
      <td className="py-2 px-3 text-gray-400 text-xs">{formatDuration(worker.avg_duration_ms)}</td>
      <td className="py-2 px-3 text-gray-500 text-xs">{worker.total_executions}</td>
      <td className="py-2 px-3">
        {worker.consecutive_failures > 0 && (
          <span className="text-[10px] text-red-400">⚠ {worker.consecutive_failures}</span>
        )}
      </td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(worker.name, !worker.enabled)}
            className={`p-1 rounded ${worker.enabled ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-gray-500 hover:bg-gray-700'}`}
            title={worker.enabled ? 'Disable' : 'Enable'}
          >
            {worker.enabled ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          {worker.mode === 'scheduled' && (
            <button
              onClick={() => onTrigger(worker.name)}
              className="p-1 rounded text-blue-400 hover:bg-blue-500/20"
              title="Trigger"
            >
              <Zap className="w-3 h-3" />
            </button>
          )}
          <Link
            href={`/admin/orchestrator/worker/${worker.name}`}
            className="p-1 rounded text-gray-400 hover:bg-gray-700"
            title="Details"
          >
            <Eye className="w-3 h-3" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

// Sortable Header
function SortHeader({ 
  label, 
  field, 
  current, 
  dir, 
  onSort 
}: { 
  label: string; 
  field: SortField; 
  current: SortField; 
  dir: SortDir; 
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th 
      className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-300 select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );
}

// Execution Row (compact)
function ExecutionRow({ score }: { score: ScoreReport }) {
  return (
    <tr className="border-b border-gray-800/30 hover:bg-gray-800/20 text-xs">
      <td className="py-1.5 px-3">
        <div className="flex items-center gap-1.5">
          {score.success ? (
            <CheckCircle className="w-3 h-3 text-emerald-500" />
          ) : (
            <XCircle className="w-3 h-3 text-red-500" />
          )}
          <span className="text-gray-300">{score.worker_name.replace(/_/g, ' ')}</span>
        </div>
      </td>
      <td className="py-1.5 px-3 text-gray-500">{formatTimeAgo(score.completed_at)}</td>
      <td className="py-1.5 px-3 text-gray-500">{formatDuration(score.duration_ms)}</td>
      <td className="py-1.5 px-3">
        <span className={`font-medium ${scoreColor(score.overall_score)}`}>
          {score.overall_score.toFixed(0)}
        </span>
      </td>
      <td className="py-1.5 px-3">
        <div className="flex gap-2 text-[10px]">
          <span className={scoreColor(score.reliability_score)} title="Reliability">R:{score.reliability_score.toFixed(0)}</span>
          <span className={scoreColor(score.performance_score)} title="Performance">P:{score.performance_score.toFixed(0)}</span>
          <span className={scoreColor(score.data_quality_score)} title="Data Quality">D:{score.data_quality_score.toFixed(0)}</span>
        </div>
      </td>
      <td className="py-1.5 px-3">
        {score.anomalies.length > 0 && (
          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
            {score.anomalies.length}
          </span>
        )}
      </td>
    </tr>
  );
}

// Anomaly Badge
function AnomalyBadge({ anomaly }: { anomaly: AnomalyAlert }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  
  return (
    <div className={`rounded px-2 py-1.5 border text-xs ${colors[anomaly.severity] || colors.low}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{anomaly.anomaly_type.replace(/_/g, ' ')}</span>
        <span className="text-[10px] opacity-70">{formatTimeAgo(anomaly.detected_at)}</span>
      </div>
      <div className="text-[10px] opacity-80 mt-0.5 truncate">{anomaly.message}</div>
    </div>
  );
}

// Main Dashboard
export default function OrchestratorDashboard() {
  const queryClient = useQueryClient();
  
  // Filters & Sorting
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [execPage, setExecPage] = useState(0);
  const execPerPage = 10;
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orchestrator-dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 10000,
  });
  
  const toggleMutation = useMutation({
    mutationFn: ({ name, enable }: { name: string; enable: boolean }) => toggleWorker(name, enable),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orchestrator-dashboard'] }),
  });
  
  const triggerMutation = useMutation({
    mutationFn: triggerWorker,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orchestrator-dashboard'] }),
  });
  
  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };
  
  // Filtered & sorted workers
  const filteredWorkers = useMemo(() => {
    if (!data) return [];
    
    let workers = [...data.workers];
    
    // Search
    if (search) {
      const q = search.toLowerCase();
      workers = workers.filter(w => w.name.toLowerCase().includes(q));
    }
    
    // Health filter
    if (healthFilter !== 'all') {
      workers = workers.filter(w => w.health_status === healthFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      workers = workers.filter(w => w.type === typeFilter);
    }
    
    // Sort
    workers.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'health_status': cmp = a.health_status.localeCompare(b.health_status); break;
        case 'success_rate': cmp = a.success_rate - b.success_rate; break;
        case 'last_run': cmp = (a.last_run || '').localeCompare(b.last_run || ''); break;
        case 'avg_duration_ms': cmp = a.avg_duration_ms - b.avg_duration_ms; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    
    return workers;
  }, [data, search, healthFilter, typeFilter, sortField, sortDir]);
  
  // Paginated executions
  const paginatedExecs = useMemo(() => {
    if (!data) return [];
    const start = execPage * execPerPage;
    return data.recent_scores.slice(start, start + execPerPage);
  }, [data, execPage]);
  
  const totalExecPages = data ? Math.ceil(data.recent_scores.length / execPerPage) : 0;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm mb-3">Failed to load dashboard</p>
          <button onClick={() => refetch()} className="text-xs px-3 py-1.5 bg-blue-600 rounded hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  const { orchestrator, metrics, active_anomalies } = data;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Orchestrator Dashboard</h1>
          <p className="text-xs text-gray-500">Worker monitoring & analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/orchestrator/provenance"
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 text-xs"
          >
            <Brain className="w-4 h-4" />
            Intelligence Provenance
          </Link>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
            orchestrator.state === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${orchestrator.state === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {orchestrator.state.toUpperCase()}
          </div>
          <button onClick={() => refetch()} className="p-1.5 rounded bg-gray-800 hover:bg-gray-700" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        <Stat label="Executions" value={orchestrator.total_executions.toLocaleString()} color="text-blue-400" />
        <Stat label="Success Rate" value={`${(orchestrator.success_rate * 100).toFixed(1)}%`} color={orchestrator.success_rate >= 0.95 ? 'text-emerald-400' : 'text-amber-400'} />
        <Stat label="Failed" value={orchestrator.failed_executions} color="text-red-400" />
        <Stat label="Workers" value={`${metrics.healthy_workers}/${metrics.total_workers}`} sub="healthy" color="text-purple-400" />
        <Stat label="Running" value={metrics.running_workers} color="text-cyan-400" />
        <Stat label="Anomalies" value={metrics.active_anomalies} color={metrics.active_anomalies > 0 ? 'text-amber-400' : 'text-emerald-400'} />
      </div>
      
      {/* Anomalies (if any) */}
      {active_anomalies.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">Active Anomalies</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {active_anomalies.slice(0, 4).map(a => <AnomalyBadge key={a.alert_id} anomaly={a} />)}
          </div>
        </div>
      )}
      
      {/* Workers Table */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 mb-4">
        <div className="flex items-center justify-between p-3 border-b border-gray-700/40">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium">Workers</span>
            <span className="text-xs text-gray-500">({filteredWorkers.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-32 pl-7 pr-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* Health Filter */}
            <select
              value={healthFilter}
              onChange={e => setHealthFilter(e.target.value as HealthFilter)}
              className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 focus:outline-none"
            >
              <option value="all">All Health</option>
              <option value="healthy">Healthy</option>
              <option value="degraded">Degraded</option>
              <option value="unhealthy">Unhealthy</option>
              <option value="unknown">Unknown</option>
            </select>
            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as TypeFilter)}
              className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="intel">Intel</option>
              <option value="generation">Generation</option>
              <option value="analytics">Analytics</option>
              <option value="thumbnail">Thumbnail</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <SortHeader label="Worker" field="name" current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Mode</th>
                <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Type</th>
                <SortHeader label="Health" field="health_status" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Last Run" field="last_run" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Success" field="success_rate" current={sortField} dir={sortDir} onSort={handleSort} />
                <SortHeader label="Avg Time" field="avg_duration_ms" current={sortField} dir={sortDir} onSort={handleSort} />
                <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Runs</th>
                <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Fails</th>
                <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map(w => (
                <WorkerRow
                  key={w.name}
                  worker={w}
                  onToggle={(name, enable) => toggleMutation.mutate({ name, enable })}
                  onTrigger={name => triggerMutation.mutate(name)}
                />
              ))}
            </tbody>
          </table>
          {filteredWorkers.length === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">No workers match filters</div>
          )}
        </div>
      </div>

      {/* Recent Executions */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 mb-4">
        <div className="flex items-center justify-between p-3 border-b border-gray-700/40">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">Recent Executions</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setExecPage(p => Math.max(0, p - 1))}
              disabled={execPage === 0}
              className="px-2 py-1 bg-gray-800 rounded disabled:opacity-30"
            >
              Prev
            </button>
            <span className="text-gray-500">{execPage + 1} / {totalExecPages || 1}</span>
            <button
              onClick={() => setExecPage(p => Math.min(totalExecPages - 1, p + 1))}
              disabled={execPage >= totalExecPages - 1}
              className="px-2 py-1 bg-gray-800 rounded disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
        
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Worker</th>
              <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Time</th>
              <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Duration</th>
              <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Score</th>
              <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Breakdown</th>
              <th className="py-1.5 px-3 text-left text-[10px] text-gray-500 uppercase">Issues</th>
            </tr>
          </thead>
          <tbody>
            {paginatedExecs.map(s => (
              <ExecutionRow key={`${s.worker_name}-${s.execution_id}`} score={s} />
            ))}
          </tbody>
        </table>
        {paginatedExecs.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-xs">No executions</div>
        )}
      </div>
      
      {/* Orchestrator Info (compact) */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium">Orchestrator Info</span>
        </div>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Instance</span>
            <div className="font-mono text-gray-300 truncate">{orchestrator.instance_id}</div>
          </div>
          <div>
            <span className="text-gray-500">Leader</span>
            <div className={orchestrator.is_leader ? 'text-emerald-400' : 'text-gray-500'}>
              {orchestrator.is_leader ? 'Yes' : 'No'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Started</span>
            <div className="text-gray-300">
              {orchestrator.started_at ? new Date(orchestrator.started_at).toLocaleString() : 'Unknown'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Uptime</span>
            <div className="text-gray-300">
              {orchestrator.uptime_seconds > 0 ? formatDuration(orchestrator.uptime_seconds * 1000) : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
