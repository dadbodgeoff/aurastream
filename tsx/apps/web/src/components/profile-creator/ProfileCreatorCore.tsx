'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Palette, Sparkles, Send, Loader2, Check, ArrowRight, RefreshCw, ChevronLeft, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

import { 
  apiClient,
  getStartSessionUrl, 
  getContinueSessionUrl,
  transformStartRequest,
  useGenerateFromSession,
} from '@aurastream/api-client';
import type { 
  CreationType, 
  StylePreset, 
  StreamChunk,
  StartProfileCreatorRequest,
} from '@aurastream/api-client';
import { StyleSelector } from './StyleSelector';
import { GenerationOptions } from './GenerationOptions';

interface ProfileCreatorCoreProps {
  canCreate: boolean;
  onComplete: () => void;
}

type Step = 'type' | 'style' | 'chat' | 'generate' | 'generating' | 'complete';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface GeneratedAsset {
  id: string;
  url: string;
  assetType: string;
  width: number;
  height: number;
}

export function ProfileCreatorCore({ canCreate, onComplete }: ProfileCreatorCoreProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('type');
  const [creationType, setCreationType] = useState<CreationType | null>(null);
  const [stylePreset, setStylePreset] = useState<StylePreset | null>(null);
  const [initialDescription, setInitialDescription] = useState('');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [refinedDescription, setRefinedDescription] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Generation state
  const [jobId, setJobId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);

  const generateMutation = useGenerateFromSession();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (step === 'chat') inputRef.current?.focus();
  }, [step]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearTimeout(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll job status
  const pollJobStatus = useCallback(async (currentJobId: string) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const accessToken = apiClient.getAccessToken();
    
    console.log('[ProfileCreator] Polling job status:', currentJobId);
    
    try {
      const response = await fetch(`${apiBase}/api/v1/jobs/${currentJobId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        console.error('[ProfileCreator] Job status fetch failed:', response.status);
        throw new Error('Failed to fetch job status');
      }
      
      const job = await response.json();
      console.log('[ProfileCreator] Job status:', job.status, 'Progress:', job.progress);
      
      setGenerationProgress(job.progress || 0);
      setGenerationStatus(job.status);
      
      if (job.status === 'completed') {
        console.log('[ProfileCreator] Job completed, fetching assets...');
        
        // Fetch the generated asset
        const assetsResponse = await fetch(`${apiBase}/api/v1/jobs/${currentJobId}/assets`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        
        console.log('[ProfileCreator] Assets response status:', assetsResponse.status);
        
        if (assetsResponse.ok) {
          const assets = await assetsResponse.json();
          console.log('[ProfileCreator] Assets received:', assets);
          
          if (assets && assets.length > 0) {
            const asset = assets[0];
            console.log('[ProfileCreator] Setting generated asset:', asset);
            
            setGeneratedAsset({
              id: asset.id,
              url: asset.url,
              assetType: asset.asset_type || asset.assetType,
              width: asset.width,
              height: asset.height,
            });
            setStep('complete');
            onComplete();
          } else {
            console.error('[ProfileCreator] No assets returned');
            setError('Generation completed but no assets found');
            setStep('generate');
          }
        } else {
          console.error('[ProfileCreator] Failed to fetch assets:', assetsResponse.status);
          setError('Failed to fetch generated asset');
          setStep('generate');
        }
        return; // Stop polling
      }
      
      if (job.status === 'failed') {
        console.error('[ProfileCreator] Job failed:', job.error_message);
        setError(job.error_message || 'Generation failed');
        setStep('generate'); // Go back to options
        return; // Stop polling
      }
      
      // Continue polling for queued/processing status
      console.log('[ProfileCreator] Continuing to poll...');
      pollIntervalRef.current = setTimeout(() => pollJobStatus(currentJobId), 1500);
    } catch (err) {
      console.error('[ProfileCreator] Polling error:', err);
      // Continue polling on error (with longer delay)
      pollIntervalRef.current = setTimeout(() => pollJobStatus(currentJobId), 3000);
    }
  }, [onComplete]);

  const handleTypeSelect = (type: CreationType) => {
    setCreationType(type);
    setStep('style');
  };

  const handleStyleSelect = (style: StylePreset) => {
    setStylePreset(style);
  };

  const startSession = useCallback(async () => {
    if (!creationType || !canCreate) return;
    setStep('chat');
    setIsStreaming(true);
    setError(null);

    const request: StartProfileCreatorRequest = {
      creationType,
      stylePreset,
      initialDescription: initialDescription || undefined,
    };

    try {
      const accessToken = apiClient.getAccessToken();
      const response = await fetch(getStartSessionUrl(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformStartRequest(request)),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || errorData.detail || 'Failed to start session');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantMessage = '';
      const messageId = `assistant-${Date.now()}`;

      setMessages([{ id: messageId, role: 'assistant', content: '', isStreaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6));
              if (data.type === 'token') {
                assistantMessage += data.content;
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: assistantMessage } : m));
              } else if (data.type === 'intent_ready') {
                setIsReady(true);
                const meta = data.metadata as Record<string, unknown> | undefined;
                setRefinedDescription((meta?.refinedDescription || meta?.refined_description || null) as string | null);
                setConfidence((meta?.confidence || 0) as number);
              } else if (data.type === 'done') {
                const meta = data.metadata as Record<string, unknown> | undefined;
                setSessionId((meta?.sessionId || meta?.session_id || null) as string | null);
              } else if (data.type === 'error') {
                setError(data.content || 'An error occurred');
              }
            } catch (e) {}
          }
        }
      }

      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isStreaming: false } : m));
    } catch (error) {
      console.error('Failed to start session:', error);
      setError(error instanceof Error ? error.message : 'Failed to start session');
    } finally {
      setIsStreaming(false);
    }
  }, [creationType, stylePreset, initialDescription, canCreate]);

  const sendMessage = useCallback(async () => {
    if (!sessionId || !inputValue.trim() || isStreaming) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsStreaming(true);

    const userMessageId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: userMessageId, role: 'user', content: userMessage }]);

    try {
      const accessToken = apiClient.getAccessToken();
      const response = await fetch(getContinueSessionUrl(sessionId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantMessage = '';
      const messageId = `assistant-${Date.now()}`;

      setMessages(prev => [...prev, { id: messageId, role: 'assistant', content: '', isStreaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6));
              if (data.type === 'token') {
                assistantMessage += data.content;
                setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: assistantMessage } : m));
              } else if (data.type === 'intent_ready') {
                setIsReady(true);
                const meta = data.metadata as Record<string, unknown> | undefined;
                setRefinedDescription((meta?.refinedDescription || meta?.refined_description || null) as string | null);
                setConfidence((meta?.confidence || 0) as number);
              }
            } catch (e) {}
          }
        }
      }

      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isStreaming: false } : m));
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsStreaming(false);
    }
  }, [sessionId, inputValue, isStreaming]);

  const handleGenerate = () => { if (isReady) setStep('generate'); };

  const executeGeneration = async (options: {
    outputSize: 'small' | 'medium' | 'large';
    outputFormat: 'png' | 'webp';
    background: 'transparent' | 'solid' | 'gradient';
    backgroundColor?: string;
  }) => {
    if (!sessionId) {
      console.error('[ProfileCreator] No session ID for generation');
      return;
    }
    
    console.log('[ProfileCreator] Starting generation with options:', options);
    
    setError(null);
    setGenerationProgress(0);
    setGenerationStatus('queued');
    setGeneratedAsset(null); // Clear any previous asset
    setStep('generating');
    
    try {
      const result = await generateMutation.mutateAsync({ sessionId, options });
      console.log('[ProfileCreator] Generation started, job ID:', result.jobId);
      setJobId(result.jobId);
      
      // Start polling for job status after a short delay
      pollIntervalRef.current = setTimeout(() => {
        console.log('[ProfileCreator] Starting polling for job:', result.jobId);
        pollJobStatus(result.jobId);
      }, 1500);
    } catch (error) {
      console.error('[ProfileCreator] Generation failed:', error);
      setError(error instanceof Error ? error.message : 'Generation failed');
      setGenerationStatus('failed');
      setStep('generate');
    }
  };

  const handleDownload = () => {
    if (!generatedAsset) return;
    const link = document.createElement('a');
    link.href = generatedAsset.url;
    link.download = `${generatedAsset.assetType}-${generatedAsset.id}.png`;
    link.click();
  };

  const handleReset = () => {
    if (pollIntervalRef.current) {
      clearTimeout(pollIntervalRef.current);
    }
    setStep('type');
    setCreationType(null);
    setStylePreset(null);
    setInitialDescription('');
    setSessionId(null);
    setMessages([]);
    setIsReady(false);
    setRefinedDescription(null);
    setConfidence(0);
    setError(null);
    setJobId(null);
    setGenerationProgress(0);
    setGenerationStatus('idle');
    setGeneratedAsset(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {/* Step 1: Type Selection */}
        {step === 'type' && (
          <motion.div key="type" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-base font-semibold text-text-primary">What would you like to create?</h2>
              <p className="text-xs text-text-secondary mt-0.5">Choose the type of asset</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTypeSelect('profile_picture')}
                className="group p-3 bg-background-surface border border-border-subtle rounded-lg hover:border-interactive-600/50 transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-interactive-600/10 rounded-lg flex items-center justify-center group-hover:bg-interactive-600/20 transition-colors">
                    <User className="w-4 h-4 text-interactive-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-text-primary">Profile Picture</h3>
                    <p className="text-micro text-text-tertiary">Avatar for your channels</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleTypeSelect('streamer_logo')}
                className="group p-3 bg-background-surface border border-border-subtle rounded-lg hover:border-accent-600/50 transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-accent-600/10 rounded-lg flex items-center justify-center group-hover:bg-accent-600/20 transition-colors">
                    <Palette className="w-4 h-4 text-accent-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-text-primary">Streamer Logo</h3>
                    <p className="text-micro text-text-tertiary">Brand mark or icon</p>
                  </div>
                </div>
              </button>
            </div>

            {!canCreate && (
              <div className="p-2.5 bg-warning-muted/10 border border-warning-muted/20 rounded-lg text-center">
                <p className="text-warning-muted text-xs">Monthly limit reached. Upgrade for more!</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Style Selection */}
        {step === 'style' && (
          <motion.div key="style" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
            <button onClick={() => setStep('type')} className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-xs">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="text-center mb-3">
              <h2 className="text-base font-semibold text-text-primary">Choose a style</h2>
              <p className="text-xs text-text-secondary mt-0.5">Select a preset or describe your own</p>
            </div>

            <StyleSelector selected={stylePreset} onSelect={handleStyleSelect} />

            <div className="mt-3">
              <label className="block text-micro font-medium text-text-secondary mb-1">Initial description (optional)</label>
              <input
                type="text"
                value={initialDescription}
                onChange={(e) => setInitialDescription(e.target.value)}
                placeholder="e.g., A cool fox mascot with gaming headphones..."
                className="w-full px-2.5 py-2 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={startSession}
                disabled={!stylePreset}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                  stylePreset ? "bg-interactive-600 text-white hover:bg-interactive-500" : "bg-background-elevated text-text-muted cursor-not-allowed"
                )}
              >
                Continue
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Chat */}
        {step === 'chat' && (
          <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
            {/* Chat messages */}
            <div className="h-[280px] overflow-y-auto bg-background-surface rounded-lg border border-border-subtle p-3 space-y-2.5">
              {/* Loading state when no messages yet */}
              {messages.length === 0 && isStreaming && !error && (
                <div className="flex items-center gap-2 text-text-tertiary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Starting conversation...</span>
                </div>
              )}
              {/* Error state */}
              {error && (
                <div className="p-3 bg-error-muted/10 border border-error-muted/30 rounded-lg">
                  <p className="text-error-muted text-xs">{error}</p>
                  <button 
                    onClick={handleReset}
                    className="mt-2 text-xs text-interactive-400 hover:text-interactive-300"
                  >
                    Try again
                  </button>
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={cn(
                    "max-w-[85%] px-3 py-2 rounded-lg text-xs",
                    message.role === 'user' ? "bg-interactive-600/20 text-text-primary" : "bg-background-elevated text-text-secondary"
                  )}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.isStreaming && <span className="inline-block w-1.5 h-3 bg-interactive-400 animate-pulse ml-0.5" />}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Ready indicator */}
            {isReady && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-2.5 bg-success-muted/10 border border-success-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-success-muted/20 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-success-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-success-muted text-xs font-medium">Ready to generate!</p>
                    <p className="text-micro text-text-tertiary truncate">{refinedDescription?.slice(0, 80)}...</p>
                  </div>
                  <button onClick={handleGenerate} className="px-3 py-1.5 bg-success-muted hover:bg-success-muted/80 text-white text-xs font-medium rounded-lg transition-colors">
                    Generate
                  </button>
                </div>
              </motion.div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Describe what you want or ask for changes..."
                disabled={isStreaming}
                className="flex-1 px-2.5 py-2 text-xs bg-background-base border border-border-subtle rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-interactive-600 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={isStreaming || !inputValue.trim()}
                className="px-3 py-2 bg-interactive-600 hover:bg-interactive-500 disabled:bg-background-elevated disabled:text-text-muted text-white rounded-lg transition-colors"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-start">
              <button onClick={handleReset} className="flex items-center gap-1 px-2 py-1 text-text-tertiary hover:text-text-secondary text-xs transition-colors">
                <RefreshCw className="w-3 h-3" />
                Start Over
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Generation Options */}
        {step === 'generate' && (
          <motion.div key="generate" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <GenerationOptions
              refinedDescription={refinedDescription || ''}
              isGenerating={generateMutation.isPending}
              onGenerate={executeGeneration}
              onBack={() => setStep('chat')}
            />
          </motion.div>
        )}

        {/* Step 5: Generating (inline progress) */}
        {step === 'generating' && (
          <motion.div key="generating" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-background-elevated" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className="text-interactive-600" strokeDasharray={`${generationProgress * 2.51} 251`} transform="rotate(-90 50 50)" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-text-primary">{generationProgress}%</span>
                </div>
              </div>
              <h2 className="text-base font-semibold text-text-primary mb-1">Creating Your {creationType === 'profile_picture' ? 'Profile Picture' : 'Logo'}</h2>
              <p className="text-xs text-text-secondary animate-pulse">
                {generationProgress < 30 ? 'Starting generation...' : 
                 generationProgress < 60 ? 'AI is creating your masterpiece...' : 
                 generationProgress < 90 ? 'Applying finishing touches...' : 'Almost there...'}
              </p>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-background-elevated rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-interactive-600 rounded-full transition-all duration-500" style={{ width: `${generationProgress}%` }} />
            </div>
          </motion.div>
        )}

        {/* Step 6: Complete (show asset inline) */}
        {step === 'complete' && generatedAsset && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            {/* Success header */}
            <div className="text-center">
              <div className="w-10 h-10 bg-success-muted/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-5 h-5 text-success-muted" />
              </div>
              <h2 className="text-base font-semibold text-text-primary">Your {creationType === 'profile_picture' ? 'Profile Picture' : 'Logo'} is Ready!</h2>
            </div>

            {/* Asset preview */}
            <div className="relative rounded-xl overflow-hidden border border-border-subtle bg-background-surface">
              <img
                src={generatedAsset.url}
                alt={`Generated ${creationType}`}
                className="w-full h-auto max-h-[300px] object-contain mx-auto"
              />
            </div>

            {/* Asset info */}
            <div className="flex items-center justify-center gap-3 text-xs text-text-muted">
              <span>{generatedAsset.width}×{generatedAsset.height}</span>
              <span>•</span>
              <span>{creationType === 'profile_picture' ? 'Profile Picture' : 'Streamer Logo'}</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-interactive-600 hover:bg-interactive-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              
              <div className="flex gap-2">
                <Link
                  href="/dashboard/assets"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-background-elevated hover:bg-background-surface text-text-primary text-xs font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View in Library
                </Link>
                <button
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-background-elevated hover:bg-background-surface text-text-primary text-xs font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Create Another
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Fallback complete state (no asset) */}
        {step === 'complete' && !generatedAsset && (
          <motion.div key="complete-fallback" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <div className="w-12 h-12 bg-success-muted/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-success-muted" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Generation Complete!</h2>
            <p className="text-xs text-text-secondary mt-1 mb-4">Check your asset library</p>
            <div className="flex gap-2 justify-center">
              <Link
                href="/dashboard/assets"
                className="px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                View Assets
              </Link>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-background-elevated hover:bg-background-surface text-text-primary text-xs font-medium rounded-lg transition-colors"
              >
                Create Another
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
