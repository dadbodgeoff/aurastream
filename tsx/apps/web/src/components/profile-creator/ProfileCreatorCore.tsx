'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Palette, Sparkles, Send, Loader2, Check, ArrowRight, RefreshCw, ChevronLeft } from 'lucide-react';
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

type Step = 'type' | 'style' | 'chat' | 'generate' | 'complete';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function ProfileCreatorCore({ canCreate, onComplete }: ProfileCreatorCoreProps) {
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

  const generateMutation = useGenerateFromSession();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (step === 'chat') inputRef.current?.focus();
  }, [step]);

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
    if (!sessionId) return;
    try {
      await generateMutation.mutateAsync({ sessionId, options });
      setStep('complete');
      setTimeout(() => onComplete(), 2000);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  const handleReset = () => {
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
                    <p className="text-[10px] text-text-tertiary">Avatar for your channels</p>
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
                    <p className="text-[10px] text-text-tertiary">Brand mark or icon</p>
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
              <label className="block text-[11px] font-medium text-text-secondary mb-1">Initial description (optional)</label>
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
                    <p className="text-[10px] text-text-tertiary truncate">{refinedDescription?.slice(0, 80)}...</p>
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

        {/* Step 5: Complete */}
        {step === 'complete' && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <div className="w-12 h-12 bg-success-muted/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-success-muted" />
            </div>
            <h2 className="text-base font-semibold text-text-primary">Generation Started!</h2>
            <p className="text-xs text-text-secondary mt-1">Check the gallery in a moment</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
