'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, RefreshCw, XCircle, Search, Filter, Save,
  Users, Zap, Brain, Palette, Sparkles, Database,
  Clock, Calendar, Infinity, Edit2, Check, X, RotateCcw,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';

// Types
interface LimitConfig {
  key: string;
  display_name: string;
  description: string;
  limit_type: string;
  category: string;
  free_limit: number;
  pro_limit: number;
  studio_limit: number;
  unlimited_limit: number;
}

interface AllLimitsResponse {
  limits: LimitConfig[];
  categories: string[];
  tiers: string[];
}

interface UsageItem {
  limit_key: string;
  display_name: string;
  category: string;
  limit_type: string;
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  retry_after: number | null;
  resets_at: string | null;
}

interface UserUsageResponse {
  user_id: string;
  tier: string;
  usage: UsageItem[];
  checked_at: string;
}

type CategoryFilter = 'all' | string;

// API
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchLimits(): Promise<AllLimitsResponse> {
  const res = await fetch(`${API_BASE}/api/v1/admin/rate-limits`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
  });
  if (!res.ok) throw new Error('Failed to fetch limits');
  return res.json();
}

async function fetchUserUsage(userId: string, tier: string): Promise<UserUsageResponse> {
  const res = await fetch(`${API_BASE}/api/v1/admin/rate-limits/usage/${userId}?tier=${tier}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
  });
  if (!res.ok) throw new Error('Failed to fetch usage');
  return res.json();
}

async function updateLimit(
  limitKey: string,
  updates: { free_limit?: number; pro_limit?: number; studio_limit?: number }
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/rate-limits/${limitKey}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update limit');
}

async function resetUserLimit(userId: string, limitKey: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/rate-limits/reset/${userId}/${limitKey}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
  });
  if (!res.ok) throw new Error('Failed to reset limit');
}

async function resetAllUserLimits(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/rate-limits/reset/${userId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
  });
  if (!res.ok) throw new Error('Failed to reset limits');
}

// Helpers
const categoryIcons: Record<string, typeof Shield> = {
  auth: Shield,
  api: Zap,
  generation: Sparkles,
  coach: Brain,
  vibe_branding: Palette,
  aura_lab: Sparkles,
  profile_creator: Users,
  storage: Database,
  intel: Brain,
  twitch: Zap,
  logo: Palette,
  thumbnail: Sparkles,
  promo: Users,
};

const categoryColors: Record<string, string> = {
  auth: 'text-red-400 bg-red-500/10',
  api: 'text-blue-400 bg-blue-500/10',
  generation: 'text-purple-400 bg-purple-500/10',
  coach: 'text-cyan-400 bg-cyan-500/10',
  vibe_branding: 'text-pink-400 bg-pink-500/10',
  aura_lab: 'text-amber-400 bg-amber-500/10',
  profile_creator: 'text-green-400 bg-green-500/10',
  storage: 'text-gray-400 bg-gray-500/10',
  intel: 'text-indigo-400 bg-indigo-500/10',
  twitch: 'text-violet-400 bg-violet-500/10',
  logo: 'text-orange-400 bg-orange-500/10',
  thumbnail: 'text-teal-400 bg-teal-500/10',
  promo: 'text-rose-400 bg-rose-500/10',
};

const limitTypeIcons: Record<string, typeof Clock> = {
  per_minute: Clock,
  per_hour: Clock,
  per_day: Calendar,
  monthly: Calendar,
  total: Database,
};

const formatLimit = (limit: number) => limit === -1 ? '∞' : limit.toLocaleString();

// Stat Card
function Stat({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-gray-800/40 rounded-lg px-4 py-3 border border-gray-700/40">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

// Editable Limit Cell
function EditableLimit({
  value,
  onSave,
  tier,
}: {
  value: number;
  onSave: (newValue: number) => void;
  tier: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  const handleSave = () => {
    const num = editValue === '-1' || editValue === '∞' ? -1 : parseInt(editValue, 10);
    if (!isNaN(num)) {
      onSave(num);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-16 px-2 py-1 text-xs bg-gray-800 border border-blue-500 rounded focus:outline-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <button onClick={handleSave} className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={handleCancel} className="p-1 text-red-400 hover:bg-red-500/20 rounded">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700/50 group"
    >
      <span className={value === -1 ? 'text-emerald-400' : 'text-white'}>
        {formatLimit(value)}
      </span>
      <Edit2 className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100" />
    </button>
  );
}

// Limit Row
function LimitRow({
  config,
  onUpdate,
}: {
  config: LimitConfig;
  onUpdate: (key: string, tier: string, value: number) => void;
}) {
  const Icon = categoryIcons[config.category] || Shield;
  const TypeIcon = limitTypeIcons[config.limit_type] || Clock;
  const colorClass = categoryColors[config.category] || 'text-gray-400 bg-gray-500/10';

  return (
    <tr className="border-b border-gray-800/50 hover:bg-gray-800/30">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium text-white">{config.display_name}</div>
            <div className="text-xs text-gray-500">{config.description}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs px-2 py-1 rounded ${colorClass}`}>
          {config.category}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <TypeIcon className="w-3 h-3" />
          {config.limit_type.replace('_', '/')}
        </div>
      </td>
      <td className="py-3 px-4">
        <EditableLimit
          value={config.free_limit}
          tier="free"
          onSave={(v) => onUpdate(config.key, 'free', v)}
        />
      </td>
      <td className="py-3 px-4">
        <EditableLimit
          value={config.pro_limit}
          tier="pro"
          onSave={(v) => onUpdate(config.key, 'pro', v)}
        />
      </td>
      <td className="py-3 px-4">
        <EditableLimit
          value={config.studio_limit}
          tier="studio"
          onSave={(v) => onUpdate(config.key, 'studio', v)}
        />
      </td>
    </tr>
  );
}

// Usage Lookup Panel
function UsageLookup() {
  const [userId, setUserId] = useState('');
  const [tier, setTier] = useState('free');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const queryClient = useQueryClient();

  const { data: usage, isLoading, error } = useQuery({
    queryKey: ['user-usage', userId, tier],
    queryFn: () => fetchUserUsage(userId, tier),
    enabled: searchTriggered && userId.length > 0,
  });

  const resetMutation = useMutation({
    mutationFn: ({ userId, limitKey }: { userId: string; limitKey: string }) =>
      resetUserLimit(userId, limitKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-usage'] });
    },
  });

  const resetAllMutation = useMutation({
    mutationFn: (userId: string) => resetAllUserLimits(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-usage'] });
    },
  });

  const handleSearch = () => {
    if (userId) {
      setSearchTriggered(true);
    }
  };

  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700/40 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-semibold">User Usage Lookup</h2>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Enter User ID..."
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            setSearchTriggered(false);
          }}
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
        />
        <select
          value={tier}
          onChange={(e) => {
            setTier(e.target.value);
            setSearchTriggered(false);
          }}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none"
        >
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="studio">Studio</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      )}

      {error && (
        <div className="text-center py-4 text-red-400 text-sm">
          Failed to load usage data
        </div>
      )}

      {usage && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">
              Showing usage for <span className="text-white font-mono">{usage.user_id}</span>
              <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                {usage.tier}
              </span>
            </div>
            <button
              onClick={() => resetAllMutation.mutate(userId)}
              disabled={resetAllMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="py-2 px-3 text-left text-xs text-gray-500 uppercase">Limit</th>
                  <th className="py-2 px-3 text-left text-xs text-gray-500 uppercase">Used</th>
                  <th className="py-2 px-3 text-left text-xs text-gray-500 uppercase">Limit</th>
                  <th className="py-2 px-3 text-left text-xs text-gray-500 uppercase">Remaining</th>
                  <th className="py-2 px-3 text-left text-xs text-gray-500 uppercase">Status</th>
                  <th className="py-2 px-3 text-left text-xs text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usage.usage.map((item) => (
                  <tr key={item.limit_key} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                    <td className="py-2 px-3">
                      <div className="font-medium text-white">{item.display_name}</div>
                      <div className="text-xs text-gray-500">{item.category}</div>
                    </td>
                    <td className="py-2 px-3 text-gray-300">{item.used}</td>
                    <td className="py-2 px-3 text-gray-300">{formatLimit(item.limit)}</td>
                    <td className="py-2 px-3">
                      <span className={item.remaining <= 0 && item.limit !== -1 ? 'text-red-400' : 'text-emerald-400'}>
                        {formatLimit(item.remaining)}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {item.allowed ? (
                        <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">OK</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">BLOCKED</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => resetMutation.mutate({ userId, limitKey: item.limit_key })}
                        disabled={resetMutation.isPending}
                        className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                        title="Reset this limit"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Page
export default function RateLimitsAdmin() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rate-limits'],
    queryFn: fetchLimits,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, tier, value }: { key: string; tier: string; value: number }) => {
      const updates: Record<string, number> = {};
      updates[`${tier}_limit`] = value;
      return updateLimit(key, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-limits'] });
    },
  });

  const handleUpdate = (key: string, tier: string, value: number) => {
    updateMutation.mutate({ key, tier, value });
  };

  // Filter and group limits
  const groupedLimits = useMemo(() => {
    if (!data) return {};

    let limits = data.limits;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      limits = limits.filter(
        (l) =>
          l.display_name.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.key.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      limits = limits.filter((l) => l.category === categoryFilter);
    }

    // Group by category
    const grouped: Record<string, LimitConfig[]> = {};
    for (const limit of limits) {
      if (!grouped[limit.category]) {
        grouped[limit.category] = [];
      }
      grouped[limit.category].push(limit);
    }

    return grouped;
  }, [data, search, categoryFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">Failed to load rate limits</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalLimits = data.limits.length;
  const categories = data.categories;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-400" />
            Rate Limits Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure rate limits for Free, Pro, and Studio tiers
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Stat label="Total Limits" value={totalLimits} color="text-blue-400" />
        <Stat label="Categories" value={categories.length} color="text-purple-400" />
        <Stat label="Tiers" value="4" color="text-emerald-400" />
        <Stat
          label="Last Updated"
          value={new Date().toLocaleTimeString()}
          color="text-gray-400"
        />
      </div>

      {/* User Usage Lookup */}
      <div className="mb-6">
        <UsageLookup />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search limits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Limits Table by Category */}
      {Object.entries(groupedLimits).map(([category, limits]) => {
        const Icon = categoryIcons[category] || Shield;
        const colorClass = categoryColors[category] || 'text-gray-400 bg-gray-500/10';
        const isExpanded = expandedCategory === null || expandedCategory === category;

        return (
          <div key={category} className="mb-4 bg-gray-800/30 rounded-lg border border-gray-700/40 overflow-hidden">
            <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">
                    {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                  </div>
                  <div className="text-xs text-gray-500">{limits.length} limits</div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-gray-700/40">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="py-2 px-4 text-left text-xs text-gray-500 uppercase w-1/3">
                        Limit
                      </th>
                      <th className="py-2 px-4 text-left text-xs text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="py-2 px-4 text-left text-xs text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="py-2 px-4 text-left text-xs text-gray-500 uppercase">
                        <span className="text-gray-400">Free</span>
                      </th>
                      <th className="py-2 px-4 text-left text-xs text-gray-500 uppercase">
                        <span className="text-blue-400">Pro</span>
                      </th>
                      <th className="py-2 px-4 text-left text-xs text-gray-500 uppercase">
                        <span className="text-purple-400">Studio</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {limits.map((config) => (
                      <LimitRow key={config.key} config={config} onUpdate={handleUpdate} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {Object.keys(groupedLimits).length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No limits match your search</p>
        </div>
      )}
    </div>
  );
}
