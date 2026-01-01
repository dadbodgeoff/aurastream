'use client';

/**
 * Thumbnail Recreation Page
 * 
 * Enterprise-grade thumbnail recreation experience.
 * Takes a winning thumbnail and recreates it with user's face.
 * 
 * @module app/intel/recreate/page
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Sparkles, 
  Upload, 
  User, 
  Palette, 
  Type,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  Camera,
  X,
  ChevronDown,
  Download,
  Share2,
} from 'lucide-react';
import { 
  useRecreateThumbnail,
  useRecreationStatus,
  useFaceAssets,
  useUploadFace,
  useBrandKits,
  type ThumbnailAnalysis,
  type FaceAsset,
} from '@aurastream/api-client';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type RecreationStep = 'preview' | 'face' | 'customize' | 'generating' | 'complete';

// Skin tone options with Fitzpatrick scale
type SkinTone = 'light' | 'light-medium' | 'medium' | 'medium-dark' | 'dark' | 'original';

const SKIN_TONES: { value: SkinTone; label: string; color: string }[] = [
  { value: 'original', label: 'Keep Original', color: 'transparent' },
  { value: 'light', label: 'Light', color: '#FFDFC4' },
  { value: 'light-medium', label: 'Light-Medium', color: '#F0C08A' },
  { value: 'medium', label: 'Medium', color: '#D4A574' },
  { value: 'medium-dark', label: 'Medium-Dark', color: '#A67C52' },
  { value: 'dark', label: 'Dark', color: '#8D5524' },
];

interface RecreationState {
  step: RecreationStep;
  analysis: ThumbnailAnalysis | null;
  selectedFace: FaceAsset | null;
  uploadedFaceBase64: string | null;
  customText: string;
  useBrandColors: boolean;
  selectedBrandKitId: string | null;
  recreationId: string | null;
  generatedUrl: string | null;
  skinTone: SkinTone;
}

// ============================================================================
// Helper Components
// ============================================================================

function StepIndicator({ 
  currentStep, 
  steps 
}: { 
  currentStep: RecreationStep; 
  steps: { key: RecreationStep; label: string }[] 
}) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
            index < currentIndex 
              ? 'bg-green-500 text-white'
              : index === currentIndex
                ? 'bg-interactive-600 text-white'
                : 'bg-white/10 text-text-tertiary'
          )}>
            {index < currentIndex ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              'w-12 h-0.5 mx-2',
              index < currentIndex ? 'bg-green-500' : 'bg-white/10'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

function ColorSwatch({ colors }: { colors: string[] }) {
  return (
    <div className="flex gap-1">
      {colors.slice(0, 5).map((color, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded border border-white/20"
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}

function FaceUploader({
  onUpload,
  isUploading,
}: {
  onUpload: (base64: string) => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string)?.split(',')[1];
      if (base64) onUpload(base64);
    };
    reader.readAsDataURL(file);
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
        dragOver 
          ? 'border-interactive-500 bg-interactive-500/10' 
          : 'border-border-primary hover:border-interactive-500/50'
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      
      {isUploading ? (
        <Loader2 className="w-12 h-12 mx-auto mb-4 text-interactive-500 animate-spin" />
      ) : (
        <Upload className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
      )}
      
      <p className="text-text-primary font-medium mb-1">
        {isUploading ? 'Uploading...' : 'Drop your photo here'}
      </p>
      <p className="text-text-tertiary text-sm">
        or click to browse
      </p>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function RecreationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Parse analysis from URL
  const [state, setState] = useState<RecreationState>({
    step: 'preview',
    analysis: null,
    selectedFace: null,
    uploadedFaceBase64: null,
    customText: '',
    useBrandColors: false,
    selectedBrandKitId: null,
    recreationId: null,
    generatedUrl: null,
    skinTone: 'original',
  });

  // Hooks
  const { data: faceAssets } = useFaceAssets();
  const { data: brandKitsData } = useBrandKits();
  const brandKits = brandKitsData?.brandKits || [];
  const { mutate: uploadFace, isPending: isUploadingFace } = useUploadFace();
  const { mutate: recreate, isPending: isRecreating } = useRecreateThumbnail();
  
  // Poll recreation status
  const { data: recreationStatus } = useRecreationStatus(
    state.recreationId || '',
    {
      enabled: !!state.recreationId && state.step === 'generating',
      refetchInterval: state.step === 'generating' ? 2000 : false,
    }
  );

  // Parse analysis from URL on mount
  useEffect(() => {
    const analysisParam = searchParams.get('analysis');
    if (analysisParam) {
      try {
        const analysis = JSON.parse(decodeURIComponent(analysisParam));
        // Validate required fields
        if (!analysis.videoId || !analysis.thumbnailUrl) {
          console.error('Invalid analysis data: missing required fields');
          return;
        }
        setState(prev => ({ 
          ...prev, 
          analysis,
          customText: analysis.textContent || '',
        }));
      } catch (e) {
        console.error('Failed to parse analysis:', e);
      }
    }
  }, [searchParams]);

  // Handle recreation status updates
  useEffect(() => {
    if (recreationStatus?.status === 'completed' && recreationStatus.generatedThumbnailUrl) {
      setState(prev => ({
        ...prev,
        step: 'complete',
        generatedUrl: recreationStatus.generatedThumbnailUrl || null,
      }));
    } else if (recreationStatus?.status === 'failed') {
      // Handle failure - go back to customize step
      setState(prev => ({
        ...prev,
        step: 'customize',
        recreationId: null,
      }));
    }
  }, [recreationStatus]);

  // Handlers
  const handleFaceUpload = useCallback((base64: string) => {
    setState(prev => ({ ...prev, uploadedFaceBase64: base64, selectedFace: null }));
  }, []);

  const handleSelectFace = useCallback((face: FaceAsset) => {
    setState(prev => ({ ...prev, selectedFace: face, uploadedFaceBase64: null }));
  }, []);

  const handleStartRecreation = useCallback(() => {
    if (!state.analysis) return;
    
    // Build skin tone instruction if not original
    const skinToneInstruction = state.skinTone !== 'original' 
      ? `Render the face with a ${state.skinTone} skin tone.`
      : undefined;
    
    recreate({
      videoId: state.analysis.videoId,
      thumbnailUrl: state.analysis.thumbnailUrl,
      analysis: state.analysis,
      faceImageBase64: state.uploadedFaceBase64 || undefined,
      faceAssetId: state.selectedFace?.id,
      customText: state.customText !== state.analysis.textContent ? state.customText : undefined,
      useBrandColors: state.useBrandColors,
      brandKitId: state.selectedBrandKitId || undefined,
      additionalInstructions: skinToneInstruction,
    }, {
      onSuccess: (response) => {
        setState(prev => ({
          ...prev,
          step: 'generating',
          recreationId: response.recreationId,
        }));
      },
    });
  }, [state, recreate]);

  const handleNextStep = useCallback(() => {
    setState(prev => {
      // Define steps - skip 'face' step if no face in original thumbnail
      const allSteps: RecreationStep[] = ['preview', 'face', 'customize', 'generating', 'complete'];
      const steps = prev.analysis?.hasFace 
        ? allSteps 
        : allSteps.filter(s => s !== 'face');
      
      const currentIndex = steps.indexOf(prev.step);
      const nextStep = steps[currentIndex + 1] || prev.step;
      return { ...prev, step: nextStep };
    });
  }, []);

  const handlePrevStep = useCallback(() => {
    setState(prev => {
      // Define steps - skip 'face' step if no face in original thumbnail
      const allSteps: RecreationStep[] = ['preview', 'face', 'customize', 'generating', 'complete'];
      const steps = prev.analysis?.hasFace 
        ? allSteps 
        : allSteps.filter(s => s !== 'face');
      
      const currentIndex = steps.indexOf(prev.step);
      const prevStep = steps[currentIndex - 1] || prev.step;
      return { ...prev, step: prevStep };
    });
  }, []);

  // Loading state or missing analysis
  if (!state.analysis) {
    const hasAnalysisParam = searchParams.get('analysis');
    
    if (!hasAnalysisParam) {
      // No analysis provided - show error state
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-lg font-medium text-text-primary mb-2">No Thumbnail Selected</h2>
            <p className="text-text-secondary mb-6">
              Please select a thumbnail from the Thumbnail Studio to recreate.
            </p>
            <Link
              href="/intel/thumbnails"
              className="inline-flex items-center gap-2 px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go to Thumbnail Studio
            </Link>
          </div>
        </div>
      );
    }
    
    // Loading analysis from URL
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 text-interactive-500 animate-spin" />
          <p className="text-text-secondary">Loading thumbnail data...</p>
        </div>
      </div>
    );
  }

  const { analysis } = state;
  const hasFace = analysis.hasFace;
  const needsFace = hasFace && !state.selectedFace && !state.uploadedFaceBase64;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/intel/thumbnails"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text-secondary" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-interactive-500" />
              Recreate Thumbnail
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {hasFace 
                ? 'Recreate this winning thumbnail with your face'
                : 'Recreate this winning thumbnail style'}
            </p>
          </div>
        </div>
        
        {/* Step Indicator */}
        <StepIndicator
          currentStep={state.step}
          steps={hasFace ? [
            { key: 'preview', label: 'Preview' },
            { key: 'face', label: 'Face' },
            { key: 'customize', label: 'Customize' },
            { key: 'generating', label: 'Generate' },
          ] : [
            { key: 'preview', label: 'Preview' },
            { key: 'customize', label: 'Customize' },
            { key: 'generating', label: 'Generate' },
          ]}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Reference Thumbnail */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-text-primary">Reference Thumbnail</h2>
          
          <div className="relative aspect-video rounded-xl overflow-hidden border border-border-primary">
            <img
              src={analysis.thumbnailUrl}
              alt={analysis.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs rounded flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {((analysis.viewCount || 0) / 1000000).toFixed(1)}M views
            </div>
          </div>
          
          <p className="text-sm text-text-secondary line-clamp-2">{analysis.title}</p>
          
          {/* Analysis Summary */}
          <div className="bg-background-secondary border border-border-primary rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-text-primary">What We'll Recreate</h3>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-text-tertiary">Layout:</span>
                <p className="text-text-primary">{analysis.layoutType}</p>
              </div>
              <div>
                <span className="text-text-tertiary">Style:</span>
                <p className="text-text-primary">{analysis.colorMood}</p>
              </div>
            </div>
            
            <div>
              <span className="text-text-tertiary text-sm">Colors:</span>
              <div className="mt-1">
                <ColorSwatch colors={analysis.dominantColors} />
              </div>
            </div>
            
            {hasFace && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-400">Face Detected</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Expression: {analysis.faceExpression || 'expressive'} • 
                      Position: {analysis.facePosition || 'prominent'}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      We'll swap this with your face
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {analysis.hasText && analysis.textContent && (
              <div>
                <span className="text-text-tertiary text-sm">Text:</span>
                <p className="text-text-primary font-medium">"{analysis.textContent}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Panel */}
        <div className="space-y-4">
          {/* Step: Preview */}
          {state.step === 'preview' && (
            <div className="bg-background-secondary border border-border-primary rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-medium text-text-primary mb-2">Ready to Recreate</h2>
                <p className="text-text-secondary text-sm">
                  This thumbnail has {analysis.viewCount?.toLocaleString()} views. 
                  Let's recreate it with your personal touch.
                </p>
              </div>
              
              <div className="bg-interactive-600/10 border border-interactive-600/30 rounded-lg p-4">
                <h3 className="text-sm font-medium text-interactive-400 mb-2">Why This Works</h3>
                <p className="text-sm text-text-secondary">{analysis.whyItWorks}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Layout: {analysis.layoutRecipe}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Colors: {analysis.colorRecipe}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Difficulty: {analysis.difficulty}</span>
                </div>
              </div>
              
              <button
                onClick={handleNextStep}
                className="w-full py-3 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-lg transition-colors"
              >
                {hasFace ? 'Add Your Face' : 'Customize'}
              </button>
            </div>
          )}

          {/* Step: Face Upload */}
          {state.step === 'face' && (
            <div className="bg-background-secondary border border-border-primary rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-medium text-text-primary mb-2">Add Your Face</h2>
                <p className="text-text-secondary text-sm">
                  Upload a photo of yourself. Try to match the "{analysis.faceExpression || 'expressive'}" expression!
                </p>
              </div>
              
              {/* Uploaded/Selected Preview */}
              {(state.uploadedFaceBase64 || state.selectedFace) && (
                <div className="relative">
                  <img
                    src={state.uploadedFaceBase64 
                      ? `data:image/png;base64,${state.uploadedFaceBase64}`
                      : state.selectedFace?.originalUrl
                    }
                    alt="Your face"
                    className="w-32 h-32 rounded-xl object-cover mx-auto"
                  />
                  <button
                    onClick={() => setState(prev => ({ 
                      ...prev, 
                      uploadedFaceBase64: null, 
                      selectedFace: null 
                    }))}
                    className="absolute top-0 right-1/2 translate-x-16 -translate-y-2 p-1 bg-red-500 rounded-full"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
              
              {/* Upload Zone */}
              {!state.uploadedFaceBase64 && !state.selectedFace && (
                <FaceUploader
                  onUpload={handleFaceUpload}
                  isUploading={isUploadingFace}
                />
              )}
              
              {/* Saved Faces */}
              {faceAssets && faceAssets.faces.length > 0 && !state.uploadedFaceBase64 && (
                <div>
                  <p className="text-sm text-text-tertiary mb-2">Or use a saved face:</p>
                  <div className="flex gap-2 flex-wrap">
                    {faceAssets.faces.map(face => (
                      <button
                        key={face.id}
                        onClick={() => handleSelectFace(face)}
                        className={cn(
                          'w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors',
                          state.selectedFace?.id === face.id
                            ? 'border-interactive-500'
                            : 'border-transparent hover:border-white/20'
                        )}
                      >
                        <img
                          src={face.originalUrl}
                          alt={face.displayName || 'Saved face'}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Expression Tip */}
              {analysis.faceExpression && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm text-blue-400">
                    💡 Tip: The original uses a "{analysis.faceExpression}" expression. 
                    Try to match it for best results!
                  </p>
                </div>
              )}
              
              {/* Skin Tone Selector */}
              {(state.uploadedFaceBase64 || state.selectedFace) && (
                <div>
                  <label className="block text-sm text-text-secondary mb-3">
                    <User className="w-4 h-4 inline mr-1" />
                    Skin Tone (optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SKIN_TONES.map((tone) => (
                      <button
                        key={tone.value}
                        onClick={() => setState(prev => ({ ...prev, skinTone: tone.value }))}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                          state.skinTone === tone.value
                            ? 'border-interactive-500 bg-interactive-500/10'
                            : 'border-border-primary hover:border-white/30 bg-white/5'
                        )}
                      >
                        {tone.value === 'original' ? (
                          <div className="w-5 h-5 rounded-full border-2 border-dashed border-text-tertiary" />
                        ) : (
                          <div 
                            className="w-5 h-5 rounded-full border border-white/20" 
                            style={{ backgroundColor: tone.color }}
                          />
                        )}
                        <span className="text-xs text-text-secondary">{tone.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-text-tertiary mt-2">
                    Select how you'd like the face to be rendered in the thumbnail
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={handlePrevStep}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-text-primary font-medium rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={needsFace}
                  className={cn(
                    'flex-1 py-3 font-medium rounded-lg transition-colors',
                    needsFace
                      ? 'bg-white/10 text-text-tertiary cursor-not-allowed'
                      : 'bg-interactive-600 hover:bg-interactive-500 text-white'
                  )}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step: Customize */}
          {state.step === 'customize' && (
            <div className="bg-background-secondary border border-border-primary rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-medium text-text-primary mb-2">Optional Tweaks</h2>
                <p className="text-text-secondary text-sm">
                  We recommend keeping the original style, but you can customize if needed.
                </p>
              </div>
              
              {/* Custom Text */}
              {analysis.hasText && (
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    <Type className="w-4 h-4 inline mr-1" />
                    Text (original: "{analysis.textContent}")
                  </label>
                  <input
                    type="text"
                    value={state.customText}
                    onChange={(e) => setState(prev => ({ ...prev, customText: e.target.value }))}
                    placeholder={analysis.textContent || 'Enter text'}
                    className="w-full px-4 py-2 bg-black/30 border border-border-primary rounded-lg text-white placeholder:text-text-tertiary focus:outline-none focus:border-interactive-500 focus:ring-1 focus:ring-interactive-500"
                  />
                </div>
              )}
              
              {/* Brand Colors Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-text-tertiary" />
                  <span className="text-sm text-text-secondary">Use my brand colors</span>
                </div>
                <button
                  onClick={() => setState(prev => ({ ...prev, useBrandColors: !prev.useBrandColors }))}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    state.useBrandColors ? 'bg-interactive-600' : 'bg-white/10'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                    state.useBrandColors ? 'translate-x-6' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
              
              {/* Brand Kit Selector */}
              {state.useBrandColors && brandKits && brandKits.length > 0 && (
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Select Brand Kit</label>
                  <select
                    value={state.selectedBrandKitId || ''}
                    onChange={(e) => setState(prev => ({ ...prev, selectedBrandKitId: e.target.value || null }))}
                    className="w-full px-4 py-2 bg-black/30 border border-border-primary rounded-lg text-white focus:outline-none focus:border-interactive-500 focus:ring-1 focus:ring-interactive-500"
                  >
                    <option value="">Select a brand kit</option>
                    {brandKits.map(kit => (
                      <option key={kit.id} value={kit.id}>{kit.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-sm text-yellow-400">
                  ⚠️ Changing colors or text may reduce effectiveness. 
                  The original style got {((analysis.viewCount || 0) / 1000000).toFixed(1)}M views!
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handlePrevStep}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-text-primary font-medium rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStartRecreation}
                  disabled={isRecreating}
                  className="flex-1 py-3 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isRecreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Thumbnail
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Generating */}
          {state.step === 'generating' && (
            <div className="bg-background-secondary border border-border-primary rounded-xl p-6 space-y-6">
              {recreationStatus?.status === 'failed' ? (
                // Error state
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-lg font-medium text-text-primary mb-2">Generation Failed</h2>
                  <p className="text-text-secondary text-sm mb-4">
                    {recreationStatus.errorMessage || 'Something went wrong. Please try again.'}
                  </p>
                  <button
                    onClick={() => setState(prev => ({ ...prev, step: 'customize', recreationId: null }))}
                    className="px-4 py-2 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                // Loading state
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-interactive-600/20 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-interactive-500 animate-spin" />
                    </div>
                    <h2 className="text-lg font-medium text-text-primary mb-2">Creating Your Thumbnail</h2>
                    <p className="text-text-secondary text-sm">
                      {recreationStatus?.status === 'processing' 
                        ? 'AI is working its magic...'
                        : 'Queued for generation...'}
                    </p>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-interactive-600 transition-all duration-500"
                      style={{ width: `${recreationStatus?.progressPercent || 10}%` }}
                    />
                  </div>
                  
                  <p className="text-center text-sm text-text-tertiary">
                    This usually takes 20-30 seconds
                  </p>
                </>
              )}
            </div>
          )}

          {/* Step: Complete */}
          {state.step === 'complete' && state.generatedUrl && (
            <div className="bg-background-secondary border border-border-primary rounded-xl p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-lg font-medium text-text-primary mb-2">Thumbnail Ready!</h2>
                <p className="text-text-secondary text-sm">
                  Your recreation is complete
                </p>
              </div>
              
              {/* Generated Thumbnail */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-green-500/30">
                <img
                  src={state.generatedUrl}
                  alt="Generated thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <a
                  href={state.generatedUrl}
                  download="thumbnail.png"
                  className="flex-1 py-3 bg-interactive-600 hover:bg-interactive-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(state.generatedUrl || '');
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-text-primary font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Copy Link
                </button>
              </div>
              
              <div className="flex gap-3">
                <Link
                  href="/intel/thumbnails"
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-text-primary font-medium rounded-lg transition-colors text-center"
                >
                  Back to Thumbnails
                </Link>
                <button
                  onClick={() => setState(prev => ({ ...prev, step: 'preview', generatedUrl: null, recreationId: null }))}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-text-primary font-medium rounded-lg transition-colors"
                >
                  Recreate Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
