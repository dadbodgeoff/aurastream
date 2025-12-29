'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Palette, 
  Sparkles, 
  Send, 
  Loader2, 
  Check,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

import { apiClient } from '@aurastream/api-client';
import { 
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
} from '@aurastream/api-client/src/types/profileCreator';
import { STYLE_PRESETS } from '@aurastream/api-client/src/types/profileCreator';
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

/**
 * Core Profile Creator component with AI-guided flow.
 */
export function ProfileCreatorCore({ canCreate, onComplete }: ProfileCreatorCoreProps) {
  // Step state
  const [step, setStep] = useState<Step>('type');
  const [creationType, setCreationType] = useState<CreationType | null>(null);
  const [stylePreset, setStylePreset] = useState<StylePreset | null>(null);
  const [initialDescription, setInitialDescription] = useState('');

  // Chat state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [refinedDescription, setRefinedDescription] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);

  // Generation state
  const generateMutation = useGenerateFromSession();

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when entering chat step
  useEffect(() => {
    if (step === 'chat') {
      inputRef.current?.focus();
    }
  }, [step]);

  // Handle type selection
  const handleTypeSelect = (type: CreationType) => {
    setCreationType(type);
    setStep('style');
  };

  // Handle style selection
  const handleStyleSelect = (style: StylePreset) => {
    setStylePreset(style);
  };

  // Start the session
  const startSession = useCallback(async () => {
    if (!creationType || !canCreate) return;

    setStep('chat');
    setIsStreaming(true);

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
        throw new Error('Failed to start session');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantMessage = '';
      const messageId = `assistant-${Date.now()}`;

      // Add streaming message
      setMessages([{
        id: messageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      }]);

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
                setMessages(prev => prev.map(m => 
                  m.id === messageId 
                    ? { ...m, content: assistantMessage }
                    : m
                ));
              } else if (data.type === 'intent_ready') {
                setIsReady(true);
                setRefinedDescription(data.metadata?.refinedDescription || null);
                setConfidence(data.metadata?.confidence || 0);
              } else if (data.type === 'done') {
                setSessionId(data.metadata?.sessionId || null);
              } else if (data.type === 'error') {
                console.error('Stream error:', data.content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Mark message as complete
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, isStreaming: false }
          : m
      ));

    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setIsStreaming(false);
    }
  }, [creationType, stylePreset, initialDescription, canCreate]);

  // Send a message
  const sendMessage = useCallback(async () => {
    if (!sessionId || !inputValue.trim() || isStreaming) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsStreaming(true);

    // Add user message
    const userMessageId = `user-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMessageId,
      role: 'user',
      content: userMessage,
    }]);

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

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantMessage = '';
      const messageId = `assistant-${Date.now()}`;

      // Add streaming message
      setMessages(prev => [...prev, {
        id: messageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      }]);

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
                setMessages(prev => prev.map(m => 
                  m.id === messageId 
                    ? { ...m, content: assistantMessage }
                    : m
                ));
              } else if (data.type === 'intent_ready') {
                setIsReady(true);
                setRefinedDescription(data.metadata?.refinedDescription || null);
                setConfidence(data.metadata?.confidence || 0);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Mark message as complete
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, isStreaming: false }
          : m
      ));

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsStreaming(false);
    }
  }, [sessionId, inputValue, isStreaming]);

  // Handle generate
  const handleGenerate = () => {
    if (isReady) {
      setStep('generate');
    }
  };

  // Execute generation
  const executeGeneration = async (options: {
    outputSize: 'small' | 'medium' | 'large';
    outputFormat: 'png' | 'webp';
    background: 'transparent' | 'solid' | 'gradient';
    backgroundColor?: string;
  }) => {
    if (!sessionId) return;

    try {
      await generateMutation.mutateAsync({
        sessionId,
        options,
      });
      setStep('complete');
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  };

  // Reset and start over
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
  };

  // Render based on step
  return (
    <div className="max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {/* Step 1: Type Selection */}
        {step === 'type' && (
          <motion.div
            key="type"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                What would you like to create?
              </h2>
              <p className="text-gray-400">
                Choose the type of asset you want to generate
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => handleTypeSelect('profile_picture')}
                className="group p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-pink-500/50 transition-all text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-pink-500/30 transition-colors">
                    <User className="w-5 h-5 text-pink-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">
                      Profile Picture
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Unique avatar for your streaming channels
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleTypeSelect('streamer_logo')}
                className="group p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-purple-500/50 transition-all text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/30 transition-colors">
                    <Palette className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">
                      Streamer Logo
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Professional logo or brand mark
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {!canCreate && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
                <p className="text-amber-400 text-sm">
                  You've reached your monthly limit. Upgrade to Pro for more creations!
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Style Selection */}
        {step === 'style' && (
          <motion.div
            key="style"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Choose a style
              </h2>
              <p className="text-gray-400">
                Select a preset or describe your own style
              </p>
            </div>

            <StyleSelector
              selected={stylePreset}
              onSelect={handleStyleSelect}
            />

            {/* Optional description */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Describe what you want (optional)
              </label>
              <input
                type="text"
                value={initialDescription}
                onChange={(e) => setInitialDescription(e.target.value)}
                placeholder="e.g., A cool fox mascot with gaming headphones..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep('type')}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={startSession}
                disabled={!stylePreset}
                className="flex items-center gap-2 px-6 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Chat */}
        {step === 'chat' && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Chat messages */}
            <div className="h-[400px] overflow-y-auto bg-gray-800/30 rounded-xl p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-xl ${
                      message.role === 'user'
                        ? 'bg-pink-500/20 text-white'
                        : 'bg-gray-700/50 text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-pink-400 animate-pulse ml-1" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Ready indicator */}
            {isReady && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-green-400 font-medium">Ready to generate!</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {refinedDescription?.slice(0, 100)}...
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
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
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={isStreaming || !inputValue.trim()}
                className="px-4 py-3 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-700 text-white rounded-lg transition-colors"
              >
                {isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Start Over
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Generation Options */}
        {step === 'generate' && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
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
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Generation Started!
            </h2>
            <p className="text-gray-400">
              Your creation is being generated. Check the gallery in a moment!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
