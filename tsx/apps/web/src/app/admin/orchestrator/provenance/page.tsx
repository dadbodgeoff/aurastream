'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Brain, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Search, RefreshCw, CheckCircle, AlertTriangle,
  Database, Zap, TrendingUp, Eye, BarChart3, Layers,
  ArrowUpDown, X, Play, AlertCircle,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface DataSource {
  source_type: string;
  source_key: string;
  records_used: number;
  freshness_seconds: number;
  quality_score: number;
}

interface DecisionFactor {
  factor_name: string;
  raw_value: any;
  normalized_value: number;
  weight: number;
  contribution: number;
  reasoning: string;
}

interface ReasoningStep {
  step_number: number;
  operation: string;
  description: string;
  input_count: number;
  output_count: number;
  algorithm: string;
  duration_ms: number;
}

interface ProvenanceRecord {
  provenance_id: string;
  worker_name: string;
  execution_id: string;
  insight_type: string;
  category_key: string;
  computed_at: string;
  computation_duration_ms: number;
  insight_id: string;
  insight_summary: string;
  insight_value: any;
  confidence_score: number;
  confidence_level: string;
  quality_score: number;
  data_sources: DataSource[];
  total_records_analyzed: number;
  data_freshness_avg_seconds: number;
  decision_factors: DecisionFactor[];
  primary_factor: string;
  reasoning_chain: ReasoningStep[];
  algorithm_version: string;
  validation_passed: boolean;
  validation_errors: string[];
  tags: string[];
}

interface RunSummary {
  execution_id: string;
  worker_name: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  total_insights: number;
  avg_confidence: number;
  avg_quality: number;
  validation_pass_rate: number;
  categories_processed: string[];
  insight_types: string[];
  has_anomalies: boolean;
  anomaly_reasons: string[];
}

interface RunDetail extends RunSummary {
  insights: ProvenanceRecord[];
  top_decision_factors: { name: string; count: number; avg_contribution: number }[];
}

type SortField = 'computed_at' | 'confidence_score' | 'quality_score' | 'computation_duration_ms';
type ViewMode = 'runs' | 'insights';

// API functions
async function fetchRecords(params: URLSearchParams) {
  const res = await fetch(`${API_BASE}/api/v1/provenance/records?${params}`);
  if (!res.ok) throw new Error('Failed to fetch records');
  return res.json();
}

async function fetchRuns(params: URLSearchParams) {
  const res = await fetch(`${API_BASE}/api/v1/provenance/runs?${params}`);
  if (!res.ok) throw new Error('Failed to fetch runs');
  return res.json();
}

async function fetchRunDetail(executionId: string) {
  const res = await fetch(`${API_BASE}/api/v1/provenance/runs/${executionId}`);
  if (!res.ok) throw new Error('Failed to fetch run detail');
  return res.json();
}

async function fetchAggregation(hours: number = 24) {
  const res = await fetch(`${API_BASE}/api/v1/provenance/aggregate?hours=${hours}`);
  if (!res.ok) throw new Error('Failed to fetch aggregation');
  return res.json();
}

async function fetchSummary(hours: number = 24) {
  const res = await fetch(`${API_BASE}/api/v1/provenance/summary?hours=${hours}`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

// Helpers
const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

const formatFreshness = (seconds: number) => {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(0)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
};

const confidenceColor = (level: string) => {
  const colors: Record<string, string> = {
    very_high: 'text-emerald-400',
    high: 'text-green-400',
    medium: 'text-amber-400',
    low: 'text-orange-400',
    very_low: 'text-red-400',
  };
  return colors[level] || 'text-gray-400';
};

const scoreColor = (score: number) => 
  score >= 0.9 ? 'text-emerald-400' : 
  score >= 0.7 ? 'text-green-400' : 
  score >= 0.5 ? 'text-amber-400' : 
  score >= 0.3 ? 'text-orange-400' : 'text-red-400';

const insightTypeLabel = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Components
function StatCard({ label, value, sub, icon: Icon, color = 'text-white' }: { 
  label: string; value: string | number; sub?: string; icon: any; color?: string 
}) {
  return (
    <div className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/40">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-600">{sub}</div>}
    </div>
  );
}

function FactorBar({ factor }: { factor: DecisionFactor }) {
  const pct = Math.round(factor.contribution * 100);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-300">{factor.factor_name.replace(/_/g, ' ')}</span>
        <span className={scoreColor(factor.contribution)}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="text-[10px] text-gray-500 mt-0.5">{factor.reasoning}</div>
    </div>
  );
}

function ReasoningChain({ steps }: { steps: ReasoningStep[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
            {step.step_number}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white">{step.operation}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">{step.algorithm}</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{step.description}</div>
            <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
              <span>In: {step.input_count}</span>
              <span>→</span>
              <span>Out: {step.output_count}</span>
              <span>•</span>
              <span>{formatDuration(step.duration_ms)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecordDetailModal({ record, onClose }: { record: ProvenanceRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-white">{insightTypeLabel(record.insight_type)}</h2>
            <p className="text-xs text-gray-500">{record.provenance_id}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Summary */}
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-white mb-2">Insight Summary</h3>
            <p className="text-sm text-gray-300">{record.insight_summary}</p>
            <div className="flex gap-4 mt-3 text-xs">
              <div>
                <span className="text-gray-500">Confidence:</span>
                <span className={`ml-1 font-medium ${confidenceColor(record.confidence_level)}`}>
                  {(record.confidence_score * 100).toFixed(0)}% ({record.confidence_level.replace('_', ' ')})
                </span>
              </div>
              <div>
                <span className="text-gray-500">Quality:</span>
                <span className={`ml-1 font-medium ${scoreColor(record.quality_score)}`}>
                  {(record.quality_score * 100).toFixed(0)}%
                </span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-1 text-gray-300">{formatDuration(record.computation_duration_ms)}</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Decision Factors */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Decision Factors
                <span className="text-[10px] text-gray-500">Primary: {record.primary_factor}</span>
              </h3>
              {record.decision_factors.map((f, i) => (
                <FactorBar key={i} factor={f} />
              ))}
            </div>
            
            {/* Data Sources */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                Data Sources
                <span className="text-[10px] text-gray-500">{record.total_records_analyzed} records</span>
              </h3>
              <div className="space-y-2">
                {record.data_sources.map((ds, i) => (
                  <div key={i} className="bg-gray-800/50 rounded p-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-mono">{ds.source_key}</span>
                      <span className={scoreColor(ds.quality_score)}>{(ds.quality_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                      <span>{ds.records_used} records</span>
                      <span>•</span>
                      <span>{formatFreshness(ds.freshness_seconds)} old</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Reasoning Chain */}
          <div className="bg-gray-800/30 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Reasoning Chain
              <span className="text-[10px] text-gray-500">{record.reasoning_chain.length} steps</span>
            </h3>
            <ReasoningChain steps={record.reasoning_chain} />
          </div>
          
          {/* Validation */}
          {!record.validation_passed && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
              <h3 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Validation Errors
              </h3>
              <ul className="text-xs text-red-300 space-y-1">
                {record.validation_errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function RunDetailModal({ executionId, onClose }: { executionId: string; onClose: () => void }) {
  const { data: run, isLoading } = useQuery({
    queryKey: ['provenance-run-detail', executionId],
    queryFn: () => fetchRunDetail(executionId),
  });
  
  const [selectedInsight, setSelectedInsight] = useState<ProvenanceRecord | null>(null);
  
  if (selectedInsight) {
    return <RecordDetailModal record={selectedInsight} onClose={() => setSelectedInsight(null)} />;
  }
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-xl border border-gray-700 max-w-5xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-purple-400" />
              Run Details
            </h2>
            <p className="text-xs text-gray-500 font-mono">{executionId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
            </div>
          ) : run ? (
            <>
              {/* Run Summary */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <StatCard label="Worker" value={run.worker_name.replace(/_/g, ' ')} icon={Zap} color="text-cyan-400" />
                <StatCard label="Insights" value={run.total_insights} icon={Brain} color="text-purple-400" />
                <StatCard label="Avg Confidence" value={`${(run.avg_confidence * 100).toFixed(0)}%`} icon={TrendingUp} color={scoreColor(run.avg_confidence)} />
                <StatCard label="Duration" value={formatDuration(run.duration_ms)} icon={Database} color="text-blue-400" />
              </div>
              
              {/* Anomalies */}
              {run.has_anomalies && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Anomalies Detected
                  </div>
                  <ul className="text-xs text-amber-300 space-y-1">
                    {run.anomaly_reasons.map((r: string, i: number) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              )}
              
              {/* Categories & Types */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 bg-gray-800/30 rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase mb-2">Categories Processed</div>
                  <div className="flex flex-wrap gap-1">
                    {run.categories_processed.map((c: string) => (
                      <span key={c} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 bg-gray-800/30 rounded-lg p-3">
                  <div className="text-[10px] text-gray-500 uppercase mb-2">Insight Types</div>
                  <div className="flex flex-wrap gap-1">
                    {run.insight_types.map((t: string) => (
                      <span key={t} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">{insightTypeLabel(t)}</span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Top Decision Factors */}
              {run.top_decision_factors?.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-3 mb-4">
                  <div className="text-[10px] text-gray-500 uppercase mb-2">Top Decision Factors</div>
                  <div className="flex flex-wrap gap-2">
                    {run.top_decision_factors.slice(0, 6).map((f: any) => (
                      <div key={f.name} className="bg-gray-800/50 rounded px-2 py-1 text-xs">
                        <span className="text-gray-300">{f.name.replace(/_/g, ' ')}</span>
                        <span className="text-gray-500 ml-1">×{f.count}</span>
                        <span className={`ml-1 ${scoreColor(f.avg_contribution)}`}>({(f.avg_contribution * 100).toFixed(0)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Insights Table */}
              <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 overflow-hidden">
                <div className="p-3 border-b border-gray-700/40">
                  <span className="text-sm font-medium">Insights Generated ({run.insights.length})</span>
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full">
                    <thead className="bg-gray-800/50 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Insight</th>
                        <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Category</th>
                        <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Confidence</th>
                        <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Quality</th>
                        <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Duration</th>
                        <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.insights.map((insight: ProvenanceRecord) => (
                        <tr 
                          key={insight.provenance_id}
                          className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer text-sm"
                          onClick={() => setSelectedInsight(insight)}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {insight.validation_passed ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              )}
                              <div>
                                <div className="text-white font-medium">{insightTypeLabel(insight.insight_type)}</div>
                                <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{insight.insight_summary}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                              {insight.category_key || 'N/A'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-xs font-medium ${confidenceColor(insight.confidence_level)}`}>
                              {(insight.confidence_score * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-xs ${scoreColor(insight.quality_score)}`}>
                              {(insight.quality_score * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs text-gray-400">{formatDuration(insight.computation_duration_ms)}</td>
                          <td className="py-2 px-3">
                            <button className="p-1 hover:bg-gray-700 rounded">
                              <Eye className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">Run not found</div>
          )}
        </div>
      </div>
    </div>
  );
}

function RunRow({ run, onClick }: { run: RunSummary; onClick: () => void }) {
  return (
    <tr 
      className={`border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer text-sm ${run.has_anomalies ? 'bg-amber-500/5' : ''}`}
      onClick={onClick}
    >
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          {run.has_anomalies ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          )}
          <div>
            <div className="text-white font-medium font-mono text-xs">{run.execution_id}</div>
            <div className="text-[10px] text-gray-500">{run.worker_name.replace(/_/g, ' ')}</div>
          </div>
        </div>
      </td>
      <td className="py-2.5 px-3 text-xs text-gray-400">{run.total_insights}</td>
      <td className="py-2.5 px-3">
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {run.categories_processed.slice(0, 3).map(c => (
            <span key={c} className="text-[10px] px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded">{c}</span>
          ))}
          {run.categories_processed.length > 3 && (
            <span className="text-[10px] text-gray-500">+{run.categories_processed.length - 3}</span>
          )}
        </div>
      </td>
      <td className="py-2.5 px-3">
        <span className={`text-xs font-medium ${scoreColor(run.avg_confidence)}`}>
          {(run.avg_confidence * 100).toFixed(0)}%
        </span>
      </td>
      <td className="py-2.5 px-3">
        <span className={`text-xs ${scoreColor(run.avg_quality)}`}>
          {(run.avg_quality * 100).toFixed(0)}%
        </span>
      </td>
      <td className="py-2.5 px-3">
        <span className={`text-xs ${run.validation_pass_rate >= 0.9 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {(run.validation_pass_rate * 100).toFixed(0)}%
        </span>
      </td>
      <td className="py-2.5 px-3 text-xs text-gray-400">{formatDuration(run.duration_ms)}</td>
      <td className="py-2.5 px-3 text-xs text-gray-500">{formatTimeAgo(run.started_at)}</td>
      <td className="py-2.5 px-3">
        {run.has_anomalies && (
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
            {run.anomaly_reasons.length} issue{run.anomaly_reasons.length > 1 ? 's' : ''}
          </span>
        )}
      </td>
    </tr>
  );
}

function RecordRow({ record, onClick }: { record: ProvenanceRecord; onClick: () => void }) {
  return (
    <tr 
      className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer text-sm"
      onClick={onClick}
    >
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          {record.validation_passed ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          )}
          <div>
            <div className="text-white font-medium">{insightTypeLabel(record.insight_type)}</div>
            <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{record.insight_summary}</div>
          </div>
        </div>
      </td>
      <td className="py-2.5 px-3">
        <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
          {record.category_key || 'N/A'}
        </span>
      </td>
      <td className="py-2.5 px-3 text-xs text-gray-400">{record.worker_name.replace(/_/g, ' ')}</td>
      <td className="py-2.5 px-3">
        <span className={`text-xs font-medium ${confidenceColor(record.confidence_level)}`}>
          {(record.confidence_score * 100).toFixed(0)}%
        </span>
      </td>
      <td className="py-2.5 px-3">
        <span className={`text-xs ${scoreColor(record.quality_score)}`}>
          {(record.quality_score * 100).toFixed(0)}%
        </span>
      </td>
      <td className="py-2.5 px-3 text-xs text-gray-400">{record.total_records_analyzed}</td>
      <td className="py-2.5 px-3 text-xs text-gray-400">{formatDuration(record.computation_duration_ms)}</td>
      <td className="py-2.5 px-3 text-xs text-gray-500">{formatTimeAgo(record.computed_at)}</td>
      <td className="py-2.5 px-3">
        <button className="p-1 hover:bg-gray-700 rounded" onClick={e => { e.stopPropagation(); onClick(); }}>
          <Eye className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </td>
    </tr>
  );
}

function SortHeader({ label, field, current, dir, onSort }: {
  label: string; field: SortField; current: SortField; dir: boolean; onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th 
      className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-300"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (dir ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </div>
    </th>
  );
}


// Main Component
export default function ProvenanceDashboard() {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('runs');
  
  // Filters
  const [search, setSearch] = useState('');
  const [workerFilter, setWorkerFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('');
  const [validationFilter, setValidationFilter] = useState(false);
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('computed_at');
  const [sortDesc, setSortDesc] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  
  // Detail modals
  const [selectedRecord, setSelectedRecord] = useState<ProvenanceRecord | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  
  // Time range
  const [hours, setHours] = useState(24);
  
  // Build query params for insights
  const insightParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (workerFilter) params.set('worker_names', workerFilter);
    if (typeFilter) params.set('insight_types', typeFilter);
    if (categoryFilter) params.set('category_keys', categoryFilter);
    if (confidenceFilter) params.set('confidence_levels', confidenceFilter);
    if (validationFilter) params.set('validation_passed_only', 'true');
    params.set('sort_by', sortField);
    params.set('sort_desc', String(sortDesc));
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    params.set('start_time', start);
    return params;
  }, [search, workerFilter, typeFilter, categoryFilter, confidenceFilter, validationFilter, sortField, sortDesc, page, pageSize, hours]);
  
  // Build query params for runs
  const runParams = useMemo(() => {
    const params = new URLSearchParams();
    if (workerFilter) params.set('worker_name', workerFilter);
    if (anomaliesOnly) params.set('anomalies_only', 'true');
    params.set('hours', String(hours));
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    return params;
  }, [workerFilter, anomaliesOnly, hours, page, pageSize]);
  
  // Queries
  const { data: recordsData, isLoading: loadingRecords, refetch: refetchRecords } = useQuery({
    queryKey: ['provenance-records', insightParams.toString()],
    queryFn: () => fetchRecords(insightParams),
    refetchInterval: 30000,
    enabled: viewMode === 'insights',
  });
  
  const { data: runsData, isLoading: loadingRuns, refetch: refetchRuns } = useQuery({
    queryKey: ['provenance-runs', runParams.toString()],
    queryFn: () => fetchRuns(runParams),
    refetchInterval: 30000,
    enabled: viewMode === 'runs',
  });
  
  const { data: aggregation } = useQuery({
    queryKey: ['provenance-aggregation', hours],
    queryFn: () => fetchAggregation(hours),
    refetchInterval: 60000,
  });
  
  const { data: summary } = useQuery({
    queryKey: ['provenance-summary', hours],
    queryFn: () => fetchSummary(hours),
    refetchInterval: 60000,
  });
  
  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
    setPage(1);
  };
  
  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setWorkerFilter('');
    setTypeFilter('');
    setCategoryFilter('');
    setConfidenceFilter('');
    setValidationFilter(false);
    setAnomaliesOnly(false);
    setPage(1);
  };
  
  const hasFilters = search || workerFilter || typeFilter || categoryFilter || confidenceFilter || validationFilter || anomaliesOnly;
  
  const records = recordsData?.records || [];
  const recordsTotal = recordsData?.total || 0;
  const recordsTotalPages = recordsData?.total_pages || 1;
  
  const runs = runsData?.runs || [];
  const runsTotal = runsData?.total || 0;
  const runsTotalPages = runsData?.total_pages || 1;
  
  const refetch = viewMode === 'runs' ? refetchRuns : refetchRecords;
  const isLoading = viewMode === 'runs' ? loadingRuns : loadingRecords;
  const total = viewMode === 'runs' ? runsTotal : recordsTotal;
  const totalPages = viewMode === 'runs' ? runsTotalPages : recordsTotalPages;
  
  // Count anomalies
  const anomalyCount = runs.filter((r: RunSummary) => r.has_anomalies).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/orchestrator" className="p-2 hover:bg-gray-800 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400" />
              Intelligence Provenance
            </h1>
            <p className="text-xs text-gray-500">Track reasoning chains & decision factors</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={hours}
            onChange={e => { setHours(Number(e.target.value)); setPage(1); }}
            className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5"
          >
            <option value={1}>Last 1h</option>
            <option value={6}>Last 6h</option>
            <option value={24}>Last 24h</option>
            <option value={72}>Last 3d</option>
            <option value={168}>Last 7d</option>
          </select>
          <button onClick={() => refetch()} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {summary && (
        <div className="grid grid-cols-6 gap-2 mb-4">
          <StatCard label="Total Insights" value={summary.total_insights} icon={Brain} color="text-purple-400" />
          <StatCard label="Avg Confidence" value={`${(summary.avg_confidence * 100).toFixed(0)}%`} icon={TrendingUp} color={summary.avg_confidence >= 0.7 ? 'text-emerald-400' : 'text-amber-400'} />
          <StatCard label="Avg Quality" value={`${(summary.avg_quality * 100).toFixed(0)}%`} icon={CheckCircle} color={summary.avg_quality >= 0.7 ? 'text-emerald-400' : 'text-amber-400'} />
          <StatCard label="Validation Rate" value={`${(summary.validation_rate * 100).toFixed(0)}%`} icon={AlertTriangle} color={summary.validation_rate >= 0.95 ? 'text-emerald-400' : 'text-amber-400'} />
          <StatCard label="Top Category" value={summary.top_categories?.[0]?.key || 'N/A'} sub={`${summary.top_categories?.[0]?.count || 0} insights`} icon={Layers} color="text-blue-400" />
          <StatCard label="Top Worker" value={summary.top_workers?.[0]?.name?.replace(/_/g, ' ') || 'N/A'} sub={`${summary.top_workers?.[0]?.count || 0} insights`} icon={Zap} color="text-cyan-400" />
        </div>
      )}
      
      {/* Top Decision Factors */}
      {aggregation?.top_decision_factors?.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium">Top Decision Factors</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {aggregation.top_decision_factors.slice(0, 8).map((f: any) => (
              <div key={f.name} className="bg-gray-800/50 rounded px-2 py-1 text-xs">
                <span className="text-gray-300">{f.name.replace(/_/g, ' ')}</span>
                <span className="text-gray-500 ml-1">×{f.count}</span>
                <span className={`ml-1 ${scoreColor(f.avg_contribution)}`}>({(f.avg_contribution * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => { setViewMode('runs'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'runs' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            Runs
            {anomalyCount > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">
                {anomalyCount} anomal{anomalyCount === 1 ? 'y' : 'ies'}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => { setViewMode('insights'); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'insights' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            All Insights
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {viewMode === 'insights' && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search insights..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
          
          <select value={workerFilter} onChange={e => { setWorkerFilter(e.target.value); setPage(1); }} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
            <option value="">All Workers</option>
            <option value="creator_intel_worker">Creator Intel</option>
            <option value="thumbnail_intel_worker">Thumbnail Intel</option>
            <option value="playbook_worker">Playbook</option>
          </select>
          
          {viewMode === 'insights' && (
            <>
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
                <option value="">All Types</option>
                <option value="video_idea">Video Idea</option>
                <option value="title_suggestion">Title Suggestion</option>
                <option value="keyword_ranking">Keyword Ranking</option>
                <option value="viral_prediction">Viral Prediction</option>
                <option value="thumbnail_analysis">Thumbnail Analysis</option>
                <option value="trend_detection">Trend Detection</option>
              </select>
              
              <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
                <option value="">All Categories</option>
                {Object.keys(aggregation?.records_by_category || {}).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <select value={confidenceFilter} onChange={e => { setConfidenceFilter(e.target.value); setPage(1); }} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
                <option value="">All Confidence</option>
                <option value="very_high">Very High</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="very_low">Very Low</option>
              </select>
              
              <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={validationFilter} onChange={e => { setValidationFilter(e.target.checked); setPage(1); }} className="rounded bg-gray-700 border-gray-600" />
                Valid only
              </label>
            </>
          )}
          
          {viewMode === 'runs' && (
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={anomaliesOnly} onChange={e => { setAnomaliesOnly(e.target.checked); setPage(1); }} className="rounded bg-gray-700 border-gray-600" />
              Anomalies only
            </label>
          )}
          
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 hover:bg-gray-700 rounded">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-gray-700/40">
          <div className="flex items-center gap-2">
            {viewMode === 'runs' ? <Play className="w-4 h-4 text-purple-400" /> : <Database className="w-4 h-4 text-blue-400" />}
            <span className="text-sm font-medium">{viewMode === 'runs' ? 'Worker Runs' : 'Provenance Records'}</span>
            <span className="text-xs text-gray-500">({total} total)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            Page {page} of {totalPages}
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : (viewMode === 'runs' ? runs : records).length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {viewMode === 'runs' ? 'runs' : 'provenance records'} found</p>
            {hasFilters && <p className="text-xs mt-1">Try adjusting your filters</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              {viewMode === 'runs' ? (
                <>
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Run</th>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Insights</th>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Categories</th>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Confidence</th>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Quality</th>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Validation</th>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Duration</th>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Time</th>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run: RunSummary) => (
                      <RunRow key={run.execution_id} run={run} onClick={() => setSelectedRunId(run.execution_id)} />
                    ))}
                  </tbody>
                </>
              ) : (
                <>
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Insight</th>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Category</th>
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Worker</th>
                      <SortHeader label="Confidence" field="confidence_score" current={sortField} dir={sortDesc} onSort={handleSort} />
                      <SortHeader label="Quality" field="quality_score" current={sortField} dir={sortDesc} onSort={handleSort} />
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase">Records</th>
                      <SortHeader label="Duration" field="computation_duration_ms" current={sortField} dir={sortDesc} onSort={handleSort} />
                      <SortHeader label="Time" field="computed_at" current={sortField} dir={sortDesc} onSort={handleSort} />
                      <th className="py-2 px-3 text-left text-[10px] text-gray-500 uppercase w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r: ProvenanceRecord) => (
                      <RecordRow key={r.provenance_id} record={r} onClick={() => setSelectedRecord(r)} />
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-gray-700/40">
            <div className="text-xs text-gray-500">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
                <ChevronLeft className="w-4 h-4 -ml-2" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded text-xs ${page === pageNum ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-400'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
                <ChevronRight className="w-4 h-4 -ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Detail Modals */}
      {selectedRecord && (
        <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
      {selectedRunId && (
        <RunDetailModal executionId={selectedRunId} onClose={() => setSelectedRunId(null)} />
      )}
    </div>
  );
}
