'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';

import { useAnalyzeImage, useVibeBrandingUsage } from '@aurastream/api-client';
import { ResponsiveModal } from '@/components/ui/ResponsiveModal';
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
  
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Vibe Branding"
      description="Upload a screenshot. Extract the aesthetic."
      maxHeight="90vh"
      className="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Usage indicator */}
        {usage && step === 'upload' && (
          <div className="px-4 py-2 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 bg-background-elevated/50 border-b border-border-subtle">
            <p className="text-xs text-text-tertiary">
              {usage.remaining} of {usage.limit} analyses remaining this month
            </p>
          </div>
        )}
        
        {/* Content */}
        <div className="min-h-[350px] flex flex-col justify-center">
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
      </div>
    </ResponsiveModal>
  );
}
