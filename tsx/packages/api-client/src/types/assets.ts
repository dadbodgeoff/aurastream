// Job status enum matching backend
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'partial';

// Asset type enum matching backend
export type AssetType = 'thumbnail' | 'overlay' | 'banner' | 'story_graphic' | 'clip_cover';

// Job interface matching backend JobResponse
export interface Job {
  id: string;
  userId: string;
  brandKitId: string | null;
  assetType: AssetType;
  status: JobStatus;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// Job list response matching backend JobListResponse
export interface JobListResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

// Asset interface matching backend AssetResponse
export interface Asset {
  id: string;
  jobId: string;
  userId: string;
  brandKitId?: string | null;
  assetType: AssetType;
  url: string;
  width: number;
  height: number;
  fileSize: number;
  isPublic: boolean;
  viralScore: number | null;
  createdAt: string;
}

// Job filters for list query
export interface JobFilters {
  status?: JobStatus;
  limit?: number;
  offset?: number;
}
