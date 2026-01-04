'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@aurastream/api-client';
import { useAuth, useSimpleAnalytics, createDevLogger } from '@aurastream/shared';
import { useGenerationCelebration } from '@/hooks/useGenerationCelebration';
import { showErrorToast, showSuccessToast } from '@/utils/errorMessages';
import { QuickRefinementChoice, QuickRefineInput } from '@/components/quick-create/refinement';

// Dev logger for SSE debugging
const log = createDevLogger({ prefix: '[SSE]' });

interface GenerationProgress {
  type: 'progress' | 'completed' | 'failed' | 'heartbeat' | 'timeout' | 'error';
  status?: string;
  progress?: number;
  message?: string;
  error?: string;
  asset?: {
    id: string;
    url: string;
    asset_type: string;
    width: number;
    height: number;
    file_size: number;
  };
}

/**
 * Progress stage configuration with user-friendly messages
 */
const PROGRESS_STAGES = [
  { threshold: 0, label: 'Starting generation', message: 'Preparing your request...' },
  { threshold: 10, label: 'Analyzing prompt', message: 'Understanding your creative vision...' },
  { threshold: 30, label: 'Generating asset', message: 'AI is creating your masterpiece...' },
  { threshold: 50, label: 'Applying brand elements', message: 'Adding your brand identity...' },
  { threshold: 70, label: 'Uploading to storage', message: 'Saving your creation...' },
  { threshold: 90, label: 'Finalizing', message: 'Almost there...' },
];

function getAccessToken(): string | null {
  return apiClient.getAccessToken();
}

export default function GenerationProgressPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const { user } = useAuth();
  const { trackGenerationCompleted, trackGenerationFailed } = useSimpleAnalytics();

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'queued' | 'processing' | 'completed' | 'failed'>('connecting');
  const [message, setMessage] = useState('Connecting...');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [asset, setAsset] = useState<GenerationProgress['asset'] | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refinement flow state
  const [refinementStep, setRefinementStep] = useState<'choice' | 'input' | 'satisfied'>('choice');
  const [isRefining, setIsRefining] = useState(false);

  const { celebrateGeneration } = useGenerationCelebration();
  const celebrationTriggeredRef = useRef(false);
  const maxRetries = 3;
  
  // Simple polling refs - no abort controller needed
  const isMountedRef = useRef(true);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentJobIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    currentJobIdRef.current = jobId;
    return () => {
      isMountedRef.current = false;
      currentJobIdRef.current = null;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [jobId]);

  // Polling fallback for job status (SSE often blocked by Cloudflare)
  // Store analytics functions in refs to avoid dependency issues
  const trackGenerationCompletedRef = useRef(trackGenerationCompleted);
  const trackGenerationFailedRef = useRef(trackGenerationFailed);
  trackGenerationCompletedRef.current = trackGenerationCompleted;
  trackGenerationFailedRef.current = trackGenerationFailed;

  // Track asset fetch retries when job is completed but assets not yet available
  const assetFetchRetriesRef = useRef(0);
  const MAX_ASSET_FETCH_RETRIES = 5;

  /**
   * Simple, bulletproof polling function.
   * No abort controllers - just checks if we should continue based on refs.
   */
  const pollJobStatus = useCallback(async (): Promise<boolean> => {
    const accessToken = getAccessToken();
    
    // Guard: Check if we should poll
    if (!accessToken || !jobId) {
      console.log('[POLL] No token or jobId, skipping');
      return false; // Continue polling
    }
    
    // Guard: Check if component is still mounted and job ID matches
    if (!isMountedRef.current || currentJobIdRef.current !== jobId) {
      console.log('[POLL] Unmounted or job changed, stopping');
      return true; // Stop polling
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    try {
      // STEP 1: Fetch job status from database
      console.log('[POLL] Fetching job status for:', jobId);
      const response = await fetch(`${apiBase}/api/v1/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      
      if (!isMountedRef.current || currentJobIdRef.current !== jobId) return true;
      
      if (!response.ok) {
        console.error('[POLL] HTTP error:', response.status);
        return false; // Continue polling on HTTP errors
      }
      
      const job = await response.json();
      const jobStatus = job.status;
      const jobProgress = job.progress || 0;
      
      console.log('[POLL] Job status:', jobStatus, 'progress:', jobProgress);
      
      // Update UI state
      if (isMountedRef.current) {
        setProgress(prev => Math.max(prev, jobProgress));
        setStatus(jobStatus);
        setMessage(_getProgressMessage(jobProgress, jobStatus));
      }
      
      // STEP 2: Handle completed status
      if (jobStatus === 'completed') {
        console.log('[POLL] Job completed, fetching assets...');
        
        const assetsResponse = await fetch(`${apiBase}/api/v1/jobs/${jobId}/assets`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        if (!isMountedRef.current || currentJobIdRef.current !== jobId) return true;
        
        if (assetsResponse.ok) {
          const assets = await assetsResponse.json();
          const firstAsset = assets[0];
          
          if (firstAsset) {
            console.log('[POLL] Asset found:', firstAsset.id);
            assetFetchRetriesRef.current = 0;
            
            setAsset({
              id: firstAsset.id,
              url: firstAsset.url,
              asset_type: firstAsset.asset_type,
              width: firstAsset.width,
              height: firstAsset.height,
              file_size: firstAsset.file_size,
            });
            setStatus('completed');
            setProgress(100);
            trackGenerationCompletedRef.current(firstAsset.asset_type, jobId);
            showSuccessToast('Asset created successfully!', {
              description: 'Your new asset is ready to download.',
            });
            return true; // Stop polling - SUCCESS!
          } else {
            // Job completed but no assets yet - race condition, keep polling
            assetFetchRetriesRef.current++;
            console.log('[POLL] No assets yet, retry:', assetFetchRetriesRef.current);
            
            if (assetFetchRetriesRef.current >= MAX_ASSET_FETCH_RETRIES) {
              setError('Asset created but could not be loaded. Please check your assets page.');
              setErrorCode('ASSET_FETCH_FAILED');
              setStatus('failed');
              return true; // Stop polling
            }
            return false; // Continue polling
          }
        }
        return false; // Continue polling if assets fetch failed
      }
      
      // STEP 3: Handle failed status
      if (jobStatus === 'failed') {
        console.log('[POLL] Job failed:', job.error_message);
        if (isMountedRef.current) {
          setError(job.error_message || 'Generation failed');
          setErrorCode('GENERATION_FAILED');
          trackGenerationFailedRef.current(job.asset_type || 'unknown', job.error_message || 'Unknown error', jobId);
        }
        return true; // Stop polling
      }
      
      return false; // Continue polling for queued/processing
    } catch (err) {
      console.error('[POLL] Error:', err);
      return false; // Continue polling on error
    }
  }, [jobId]);

  /**
   * Start polling loop - simple and robust.
   */
  const startPolling = useCallback(() => {
    console.log('[POLL] Starting polling for job:', jobId);
    setStatus('processing');
    setMessage('Starting generation...');
    
    let pollCount = 0;
    const maxPolls = 180; // 3 minutes max (1 second intervals)
    
    const poll = async () => {
      // Guard: Check if we should continue
      if (!isMountedRef.current || currentJobIdRef.current !== jobId) {
        console.log('[POLL] Stopping: unmounted or job changed');
        return;
      }
      
      if (pollCount >= maxPolls) {
        console.warn('[POLL] Timeout after', pollCount, 'polls');
        if (isMountedRef.current) {
          setError('Generation timed out. Please check your assets page.');
          setErrorCode('GENERATION_TIMEOUT');
          setStatus('failed');
        }
        return;
      }
      
      pollCount++;
      console.log('[POLL] Poll #%d for job %s', pollCount, jobId);
      
      const shouldStop = await pollJobStatus();
      
      // Schedule next poll if we should continue
      if (!shouldStop && isMountedRef.current && currentJobIdRef.current === jobId) {
        pollTimeoutRef.current = setTimeout(poll, 1000);
      } else {
        console.log('[POLL] Polling ended, shouldStop:', shouldStop);
      }
    };
    
    // Start first poll
    poll();
  }, [jobId, pollJobStatus]);

  // Helper function for progress messages
  const _getProgressMessage = (progress: number, status: string): string => {
    if (status === 'queued') return 'Waiting in queue...';
    if (status === 'processing') {
      if (progress < 20) return 'Starting generation...';
      if (progress < 50) return 'AI is creating your masterpiece...';
      if (progress < 80) return 'Applying finishing touches...';
      return 'Almost there...';
    }
    return 'Processing...';
  };

  // Handle retry
  const handleRetry = useCallback(() => {
    if (retryCount >= maxRetries) {
      showErrorToast(
        { code: 'GENERATION_FAILED', message: 'Maximum retry attempts reached' },
        { onNavigate: (path) => router.push(path) }
      );
      return;
    }
    
    // Stop any existing polling
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    
    setRetryCount(prev => prev + 1);
    setError(null);
    setErrorCode(null);
    setProgress(0);
    setStatus('connecting');
    assetFetchRetriesRef.current = 0;
    
    // Small delay before starting new polling
    setTimeout(() => {
      if (isMountedRef.current && currentJobIdRef.current === jobId) {
        startPolling();
      }
    }, 100);
  }, [retryCount, maxRetries, startPolling, router, jobId]);

  // Store startPolling in a ref to avoid useEffect re-running when it changes
  const startPollingRef = useRef(startPolling);
  startPollingRef.current = startPolling;

  useEffect(() => {
    log.info('useEffect triggered, jobId:', jobId);
    // Use polling instead of SSE (more reliable through Cloudflare)
    startPollingRef.current();
    
    // Cleanup function - just clear the timeout, refs handle the rest
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [jobId]); // Only re-run when jobId changes, not when startPolling changes

  // Trigger celebration when generation completes (stable deps)
  const celebrateGenerationRef = useRef(celebrateGeneration);
  celebrateGenerationRef.current = celebrateGeneration;
  
  useEffect(() => {
    if (status === 'completed' && asset && !celebrationTriggeredRef.current) {
      celebrationTriggeredRef.current = true;
      
      // Get user's asset count (use assetsGeneratedThisMonth as a proxy)
      const userAssetCount = user?.assetsGeneratedThisMonth ?? 1;
      
      celebrateGenerationRef.current(
        {
          id: asset.id,
          assetType: asset.asset_type,
          url: asset.url,
        },
        userAssetCount
      );
    }
  }, [status, asset, user?.assetsGeneratedThisMonth]);

  // Ref for copy success timeout cleanup
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDownload = () => {
    if (!asset) return;
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = `${asset.asset_type}-${asset.id}.png`;
    link.click();
  };

  const handleShareTwitter = () => {
    if (!asset) return;
    const assetTypeLabel = formatAssetType(asset.asset_type);
    const text = encodeURIComponent(`I just created a ${assetTypeLabel} with @AuraStream! 🎨✨`);
    const url = encodeURIComponent(getPublicAssetUrl(asset.id));
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    if (!asset) return;
    const url = getPublicAssetUrl(asset.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      // Clear any existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setCopySuccess(false);
        }
        copyTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Refinement handlers
  const handleLoveIt = useCallback(() => {
    setRefinementStep('satisfied');
  }, []);

  const handleTweak = useCallback(() => {
    setRefinementStep('input');
  }, []);

  const handleBackToChoice = useCallback(() => {
    setRefinementStep('choice');
  }, []);

  const handleRefineSubmit = useCallback(async (refinement: string) => {
    setIsRefining(true);
    try {
      const response = await apiClient.generation.refineJob(jobId, { refinement });
      // Navigate to the new job's progress page
      router.push(`/intel/generate/${response.newJob.id}`);
      showSuccessToast('Tweaking your asset...', {
        description: 'Creating a refined version based on your feedback.',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refine';
      showErrorToast(
        { code: 'REFINE_FAILED', message: errorMessage },
        { onNavigate: (path) => router.push(path) }
      );
      setIsRefining(false);
    }
  }, [jobId, router]);


  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Progress Card */}
        <div className="bg-background-surface border border-border-subtle rounded-2xl p-8 text-center">
          {status === 'completed' && asset ? (
            <>
              {/* Success State */}
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-text-primary mb-2">Asset Created!</h1>
                <p className="text-text-secondary">{message}</p>
              </div>

              {/* Asset Preview */}
              <div className="mb-6 rounded-xl overflow-hidden border border-border-subtle">
                <img
                  src={asset.url}
                  alt="Generated asset"
                  loading="eager"
                  decoding="async"
                  className="w-full h-auto"
                />
              </div>

              {/* Asset Info */}
              <div className="flex items-center justify-center gap-4 text-sm text-text-muted mb-6">
                <span>{asset.width}×{asset.height}</span>
                <span>•</span>
                <span>{formatFileSize(asset.file_size)}</span>
              </div>

              {/* Refinement Flow - Show choice or input based on step */}
              {refinementStep === 'choice' && (
                <div className="mb-6">
                  <QuickRefinementChoice
                    onLoveIt={handleLoveIt}
                    onTweak={handleTweak}
                    tier={user?.subscriptionTier}
                    disabled={isRefining}
                  />
                </div>
              )}

              {refinementStep === 'input' && (
                <div className="mb-6">
                  <QuickRefineInput
                    onSubmit={handleRefineSubmit}
                    onBack={handleBackToChoice}
                    isSubmitting={isRefining}
                  />
                </div>
              )}

              {/* Show actions only when satisfied or after refinement choice */}
              {refinementStep === 'satisfied' && (
                <>
                  {/* Primary Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-4 py-3 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                    <Link
                      href="/intel/assets"
                      className="flex-1 px-4 py-3 bg-background-elevated hover:bg-background-surface text-text-primary font-medium rounded-xl transition-colors text-center"
                    >
                      View in Library
                    </Link>
                  </div>

                  {/* Social Share */}
                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={handleShareTwitter}
                      className="flex-1 px-4 py-2.5 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                      aria-label="Share on Twitter"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Share
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className={`flex-1 px-4 py-2.5 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                        copySuccess
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-background-elevated hover:bg-background-surface text-text-primary'
                      }`}
                      aria-label="Copy link to clipboard"
                    >
                      {copySuccess ? (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>

                  {/* Create Another - Prominent CTA */}
                  <div className="pt-6 border-t border-border-subtle">
                    <Link
                      href="/intel/create"
                      className="block w-full px-6 py-4 bg-interactive-600 hover:bg-interactive-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Another Asset
                      </span>
                    </Link>
                  </div>
                </>
              )}
            </>
          ) : status === 'failed' ? (
            <>
              {/* Enhanced Error State */}
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-text-primary mb-2">Generation Failed</h1>
                <p className="text-red-500 mb-2">{error}</p>
                {errorCode === 'GENERATION_TIMEOUT' && (
                  <p className="text-sm text-text-secondary">
                    💡 Try a simpler prompt or try again later.
                  </p>
                )}
                {errorCode === 'NETWORK_ERROR' && (
                  <p className="text-sm text-text-secondary">
                    💡 Check your internet connection and try again.
                  </p>
                )}
                {errorCode === 'ASSET_FETCH_FAILED' && (
                  <p className="text-sm text-text-secondary">
                    💡 Your asset was created but couldn&apos;t be loaded. Check your <Link href="/intel/assets" className="text-interactive-500 hover:underline">Assets Library</Link>.
                  </p>
                )}
              </div>

              {/* Retry count indicator */}
              {retryCount > 0 && retryCount < maxRetries && (
                <p className="text-xs text-text-tertiary mb-4">
                  Retry attempt {retryCount} of {maxRetries}
                </p>
              )}
              {retryCount >= maxRetries && (
                <p className="text-xs text-red-500 mb-4">
                  Maximum retry attempts reached. Please try a different approach.
                </p>
              )}

              {/* Retry Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {retryCount < maxRetries && (
                  <button
                    onClick={handleRetry}
                    className="flex-1 px-4 py-3 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-xl transition-colors text-center flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                )}
                <Link
                  href="/intel/create"
                  className="flex-1 px-4 py-3 bg-background-elevated hover:bg-background-surface text-text-primary font-medium rounded-xl transition-colors text-center"
                >
                  New Creation
                </Link>
                <Link
                  href="/intel"
                  className="flex-1 px-4 py-3 bg-background-elevated hover:bg-background-surface text-text-primary font-medium rounded-xl transition-colors text-center"
                >
                  Go to Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Loading State with Enhanced Progress Stages */}
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  {/* Animated spinner */}
                  <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-background-elevated"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      className="text-interactive-600"
                      strokeDasharray={`${progress * 2.51} 251`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-text-primary">{progress}%</span>
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-text-primary mb-2">Creating Your Asset</h1>
                <p className="text-text-secondary animate-pulse">{message}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-background-elevated rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-interactive-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Status Steps with Enhanced Messaging */}
              <div className="mt-8 space-y-3 text-left">
                {PROGRESS_STAGES.map((stage, index) => (
                  <ProgressStep 
                    key={stage.threshold}
                    label={stage.label} 
                    message={stage.message}
                    completed={progress >= (PROGRESS_STAGES[index + 1]?.threshold || 100)} 
                    active={progress >= stage.threshold && progress < (PROGRESS_STAGES[index + 1]?.threshold || 100)} 
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


function ProgressStep({ 
  label, 
  message, 
  completed, 
  active 
}: { 
  label: string; 
  message?: string;
  completed: boolean; 
  active: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        completed ? 'bg-emerald-500' : active ? 'bg-interactive-600' : 'bg-background-elevated'
      }`}>
        {completed ? (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : active ? (
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        ) : null}
      </div>
      <div className="flex-1">
        <span className={`text-sm font-medium ${completed ? 'text-text-primary' : active ? 'text-text-primary' : 'text-text-muted'}`}>
          {label}
        </span>
        {active && message && (
          <p className="text-xs text-text-tertiary mt-0.5 animate-pulse">{message}</p>
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAssetType(assetType: string): string {
  const labels: Record<string, string> = {
    twitch_emote: 'Twitch Emote',
    youtube_thumbnail: 'YouTube Thumbnail',
    twitch_banner: 'Twitch Banner',
    twitch_badge: 'Twitch Badge',
    overlay: 'Stream Overlay',
    twitch_panel: 'Twitch Panel',
    twitch_offline: 'Offline Screen',
    profile_picture: 'Profile Picture',
    streamer_logo: 'Streamer Logo',
  };
  return labels[assetType] || assetType.replace(/_/g, ' ');
}

function getPublicAssetUrl(assetId: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/asset/${assetId}`;
}
