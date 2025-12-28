'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, X } from 'lucide-react';

import { analytics } from '@aurastream/shared';
import { useAnalyzeImage, useVibeBrandingUsage } from '@aurastream/api-client';
import { UploadDropzone } from './UploadDropzone';
import { AnalyzingTerminal } from './AnalyzingTerminal';
import { VibeResultsDisplay } from './VibeResultsDisplay';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from './constants';
import type { VibeAnalysis, VibeBrandingStep } from './types';

interface VibeBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKitCreated?: (kitId: string) => void;
}

export function VibeBrandingModal({ 
  isOpen, 
  onClose, 
  onKitCreated 
}: VibeBrandingModalProps) {
  const [step, setStep] = useState<VibeBrandingStep>('upload');
  const [analysis, setAnalysis] = useState<VibeAnalysis | null>(null);
  const [brandKitId, setBrandKitId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { data: usage } = useVibeBrandingUsage();
  const analyzeMutation = useAnalyzeImage();
  
  // Track when modal opens
  useEffect(() => {
    if (isOpen) {
      analytics.track('vibe_branding_started', {}, 'feature');
    }
  }, [isOpen]);
  
  const handleDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be under 10MB');
      setStep('error');
      return;
    }
    
    setStep('analyzing');
    setError(null);
    
    try {
      const result = await analyzeMutation.mutateAsync({
        file,
        options: { autoCreateKit: true }
      });
      
      setAnalysis(result.analysis);
      setBrandKitId(result.brandKitId);
      setStep('success');
      
      // Track successful analysis
      analytics.track('vibe_branding_completed', {
        confidence: result.analysis.confidence,
      }, 'feature');
      
      // Track brand kit creation if one was created
      if (result.brandKitId) {
        analytics.track('vibe_branding_kit_created', {
          brandKitId: result.brandKitId,
        }, 'feature');
      }
      
      // Celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      if (result.brandKitId && onKitCreated) {
        onKitCreated(result.brandKitId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      setStep('error');
      
      // Track failed analysis
      analytics.track('vibe_branding_failed', {
        error: errorMessage,
      }, 'feature');
    }
  }, [analyzeMutation, onKitCreated]);
  
  const handleReset = useCallback(() => {
    setStep('upload');
    setAnalysis(null);
    setBrandKitId(null);
    setError(null);
  }, []);
  
  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    disabled: step === 'analyzing',
  });
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-background-surface border border-border-subtle rounded-xl overflow-hidden shadow-2xl mx-4"
      >
        {/* Header */}
        <div className="p-6 border-b border-border-subtle flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-interactive-500" />
              Vibe Branding
            </h2>
            <p className="text-text-secondary text-sm">
              Upload a screenshot. Extract the aesthetic.
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-text-tertiary hover:text-text-secondary rounded-lg hover:bg-background-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Usage indicator */}
        {usage && step === 'upload' && (
          <div className="px-6 py-2 bg-background-elevated/50 border-b border-border-subtle">
            <p className="text-xs text-text-tertiary">
              {usage.remaining} of {usage.limit} analyses remaining this month
            </p>
          </div>
        )}
        
        {/* Content */}
        <div className="p-8 min-h-[400px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <UploadDropzone
                key="upload"
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
              />
            )}
            
            {step === 'analyzing' && (
              <AnalyzingTerminal key="analyzing" />
            )}
            
            {step === 'success' && analysis && (
              <VibeResultsDisplay
                key="success"
                analysis={analysis}
                brandKitId={brandKitId}
                onClose={handleClose}
                onReset={handleReset}
              />
            )}
            
            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-red-400 mb-2 font-medium">Analysis Failed</p>
                <p className="text-text-tertiary text-sm mb-6">{error}</p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2 bg-interactive-600 hover:bg-interactive-500 text-white rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
