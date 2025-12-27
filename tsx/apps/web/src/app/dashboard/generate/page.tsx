'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useJobs } from '@aurastream/api-client';
import {
  PageContainer,
  JobCard,
  SearchInput,
  FilterDropdown,
  EmptyState,
  LoadingState,
  ErrorState,
  JobsIcon,
} from '@/components/dashboard';
import type { JobStatus } from '@/components/dashboard';

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'partial', label: 'Partial' },
];

const ASSET_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'banner', label: 'Banner' },
  { value: 'story_graphic', label: 'Story Graphic' },
  { value: 'twitch_emote', label: 'Twitch Emote' },
  { value: 'twitch_badge', label: 'Twitch Badge' },
];

// =============================================================================
// Main Page
// =============================================================================

export default function GeneratePage() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useJobs({ limit: 50 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const jobs = data?.jobs ?? [];

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job: any) => {
      if (statusFilter && job.status !== statusFilter) return false;
      if (typeFilter && job.asset_type !== typeFilter) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        if (!job.asset_type.toLowerCase().includes(searchLower) &&
            !job.id.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      return true;
    });
  }, [jobs, statusFilter, typeFilter, search]);

  // Group jobs by status
  const activeJobs = filteredJobs.filter((j: any) => j.status === 'queued' || j.status === 'processing');
  const completedJobs = filteredJobs.filter((j: any) => j.status === 'completed' || j.status === 'partial');
  const failedJobs = filteredJobs.filter((j: any) => j.status === 'failed');

  if (isLoading) {
    return (
      <PageContainer title="Generation Jobs">
        <LoadingState message="Loading jobs..." />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Generation Jobs">
        <ErrorState
          message="Failed to load jobs. Please try again."
          onRetry={() => refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Generation Jobs"
      description="Track and manage your asset generation jobs"
    >
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search jobs..."
          className="flex-1 max-w-xs"
        />
        <div className="flex items-center gap-3">
          <FilterDropdown
            label="Status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as string)}
          />
          <FilterDropdown
            label="Type"
            options={ASSET_TYPE_OPTIONS}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as string)}
          />
        </div>
      </div>

      {filteredJobs.length > 0 ? (
        <div className="space-y-8">
          {/* Active Jobs */}
          {activeJobs.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4">
                Active ({activeJobs.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeJobs.map((job: any) => (
                  <JobCard
                    key={job.id}
                    id={job.id}
                    assetType={job.asset_type}
                    status={job.status as JobStatus}
                    progress={job.progress}
                    errorMessage={job.error_message}
                    createdAt={job.created_at}
                    completedAt={job.completed_at}
                    onClick={() => router.push(`/dashboard/assets?job=${job.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Jobs */}
          {completedJobs.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4">
                Completed ({completedJobs.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedJobs.map((job: any) => (
                  <JobCard
                    key={job.id}
                    id={job.id}
                    assetType={job.asset_type}
                    status={job.status as JobStatus}
                    progress={job.progress}
                    createdAt={job.created_at}
                    completedAt={job.completed_at}
                    onClick={() => router.push(`/dashboard/assets?job=${job.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Failed Jobs */}
          {failedJobs.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-4">
                Failed ({failedJobs.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {failedJobs.map((job: any) => (
                  <JobCard
                    key={job.id}
                    id={job.id}
                    assetType={job.asset_type}
                    status={job.status as JobStatus}
                    progress={job.progress}
                    errorMessage={job.error_message}
                    createdAt={job.created_at}
                    onClick={() => router.push(`/dashboard/assets?job=${job.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={<JobsIcon className="w-8 h-8" />}
          title={search || statusFilter || typeFilter ? 'No jobs found' : 'No generation jobs yet'}
          description={
            search || statusFilter || typeFilter
              ? 'Try adjusting your filters'
              : 'Create your first asset to see generation jobs here'
          }
          action={!search && !statusFilter && !typeFilter ? { label: 'Create Asset', href: '/dashboard/create' } : undefined}
        />
      )}
    </PageContainer>
  );
}
