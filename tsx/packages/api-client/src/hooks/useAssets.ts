import { useQuery } from '@tanstack/react-query';
import type { Job, JobListResponse, Asset, JobFilters } from '../types/assets';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// Transform snake_case to camelCase
function transformJob(data: any): Job {
  return {
    id: data.id,
    userId: data.user_id,
    brandKitId: data.brand_kit_id,
    assetType: data.asset_type,
    status: data.status,
    progress: data.progress,
    errorMessage: data.error_message,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    completedAt: data.completed_at,
  };
}

function transformAsset(data: any): Asset {
  return {
    id: data.id,
    jobId: data.job_id,
    userId: data.user_id,
    assetType: data.asset_type,
    url: data.url,
    width: data.width,
    height: data.height,
    fileSize: data.file_size,
    isPublic: data.is_public,
    viralScore: data.viral_score,
    createdAt: data.created_at,
  };
}

export const assetKeys = {
  all: ['assets'] as const,
  jobs: () => [...assetKeys.all, 'jobs'] as const,
  jobsList: (filters?: JobFilters) => [...assetKeys.jobs(), 'list', filters] as const,
  jobDetail: (jobId: string) => [...assetKeys.jobs(), 'detail', jobId] as const,
  jobAssets: (jobId: string) => [...assetKeys.jobs(), 'assets', jobId] as const,
  publicAsset: (assetId: string) => [...assetKeys.all, 'public', assetId] as const,
};

export function useAssetJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: assetKeys.jobsList(filters),
    queryFn: async (): Promise<JobListResponse> => {
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.offset) params.set('offset', String(filters.offset));
      
      const url = `${API_BASE}/jobs${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      
      return {
        jobs: data.jobs.map(transformJob),
        total: data.total,
        limit: data.limit,
        offset: data.offset,
      };
    },
  });
}

export function useAssetJob(jobId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.jobDetail(jobId ?? ''),
    queryFn: async (): Promise<Job> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch job');
      const data = await response.json();
      return transformJob(data);
    },
    enabled: !!jobId,
  });
}

export function useAssetJobAssets(jobId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.jobAssets(jobId ?? ''),
    queryFn: async (): Promise<Asset[]> => {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/jobs/${jobId}/assets`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Failed to fetch job assets');
      const data = await response.json();
      return data.map(transformAsset);
    },
    enabled: !!jobId,
  });
}

export function usePublicAsset(assetId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.publicAsset(assetId ?? ''),
    queryFn: async (): Promise<Asset> => {
      // Fetch from public endpoint (no auth)
      const response = await fetch(`${API_BASE.replace('/api/v1', '')}/asset/${assetId}`);
      if (!response.ok) throw new Error('Asset not found');
      const data = await response.json();
      return transformAsset(data);
    },
    enabled: !!assetId,
  });
}
