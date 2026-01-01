'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, ChevronRight, Globe, Gamepad2 } from 'lucide-react';
import { useAvailableCategories, useSubscribeCategory } from '@aurastream/api-client';
import { useIntelStore } from '@/stores/intelStore';
import { cn } from '@/lib/utils';

// =============================================================================
// Confetti Component
// =============================================================================

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
}

function Confetti({ isActive }: { isActive: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  
  useEffect(() => {
    if (isActive) {
      const colors = ['#21808D', '#32B8C6', '#A84F2F', '#F79F6F', '#FCFCF9', '#66BDC3'];
      const newPieces: ConfettiPiece[] = [];
      
      for (let i = 0; i < 50; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 0.5,
          rotation: Math.random() * 360,
        });
      }
      
      setPieces(newPieces);
      
      // Clear after animation
      const timer = setTimeout(() => setPieces([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);
  
  if (!isActive || pieces.length === 0) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ 
            y: -20, 
            x: `${piece.x}vw`, 
            rotate: piece.rotation,
            opacity: 1,
            scale: 1,
          }}
          animate={{ 
            y: '100vh', 
            rotate: piece.rotation + 720,
            opacity: 0,
            scale: 0.5,
          }}
          transition={{ 
            duration: 2.5 + Math.random(), 
            delay: piece.delay,
            ease: 'easeOut',
          }}
          className="absolute w-3 h-3 rounded-sm"
          style={{ backgroundColor: piece.color }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Step Indicator
// =============================================================================

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            width: i === currentStep ? 24 : 8,
            backgroundColor: i <= currentStep ? '#21808D' : 'rgba(255,255,255,0.1)',
          }}
          className="h-2 rounded-full"
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Category Card
// =============================================================================

interface CategoryCardProps {
  category: {
    key: string;
    name: string;
    icon?: string;
    platform: 'twitch' | 'youtube' | 'both';
  };
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: () => void;
}

function CategoryCard({ category, isSelected, isDisabled, onToggle }: CategoryCardProps) {
  return (
    <motion.button
      onClick={onToggle}
      disabled={isDisabled}
      whileHover={!isDisabled ? { scale: 1.02, y: -2 } : undefined}
      whileTap={!isDisabled ? { scale: 0.98 } : undefined}
      className={cn(
        'relative flex items-center gap-3 p-4 rounded-xl border transition-colors',
        isSelected 
          ? 'bg-interactive-600/20 border-interactive-500/50' 
          : isDisabled
            ? 'bg-background-surface/30 border-border-subtle/50 opacity-50 cursor-not-allowed'
            : 'bg-background-surface/50 border-border-subtle hover:border-interactive-500/30'
      )}
    >
      {/* Selection indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-2 right-2 w-5 h-5 bg-interactive-500 rounded-full flex items-center justify-center"
          >
            <Check className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
      
      <span className="text-2xl">{category.icon || '🎮'}</span>
      <div className="flex-1 text-left">
        <span className={cn(
          'font-medium block',
          isSelected ? 'text-text-primary' : 'text-text-secondary'
        )}>
          {category.name}
        </span>
        <span className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
          {category.platform === 'both' ? (
            <>
              <Globe className="w-3 h-3" />
              Twitch & YouTube
            </>
          ) : category.platform === 'twitch' ? (
            <>
              <Gamepad2 className="w-3 h-3" />
              Twitch
            </>
          ) : (
            <>
              <Globe className="w-3 h-3" />
              YouTube
            </>
          )}
        </span>
      </div>
    </motion.button>
  );
}

// =============================================================================
// Intel Onboarding
// =============================================================================

export function IntelOnboarding() {
  const { data: availableCategories, isLoading } = useAvailableCategories();
  const subscribeCategory = useSubscribeCategory();
  const addCategoryOptimistic = useIntelStore(state => state.addCategoryOptimistic);
  
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const toggleCategory = useCallback((key: string) => {
    setSelectedCategories(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : prev.length < 3 ? [...prev, key] : prev
    );
  }, []);
  
  const handleContinue = async () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    
    if (selectedCategories.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      for (const key of selectedCategories) {
        const category = availableCategories?.find(c => c.key === key);
        if (category) {
          await subscribeCategory.mutateAsync({
            key: category.key,
            name: category.name,
            twitchId: category.twitchId,
            youtubeQuery: category.youtubeQuery,
            platform: category.platform,
          });
          
          addCategoryOptimistic({
            key: category.key,
            name: category.name,
            twitchId: category.twitchId,
            youtubeQuery: category.youtubeQuery,
            platform: category.platform,
            notifications: true,
            addedAt: new Date().toISOString(),
          });
        }
      }
      
      // Show success state with confetti
      setShowConfetti(true);
      setIsComplete(true);
      
    } catch (error) {
      console.error('Failed to subscribe to categories:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Welcome step
  if (step === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto py-16 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-interactive-500/20 to-accent-500/20 flex items-center justify-center"
        >
          <Sparkles className="w-10 h-10 text-interactive-400" />
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-text-primary mb-4"
        >
          Welcome to Creator Intel
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-text-secondary mb-8 text-lg"
        >
          Your personalized command center for content intelligence.
          We&apos;ll show you what&apos;s trending, what&apos;s working, and what to create next.
        </motion.p>
        
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleContinue}
          className="inline-flex items-center gap-2 px-8 py-3 bg-interactive-600 hover:bg-interactive-500 text-white rounded-xl font-medium transition-colors"
        >
          Get Started
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    );
  }
  
  // Success state
  if (isComplete) {
    return (
      <>
        <Confetti isActive={showConfetti} />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto py-16 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-main/20 flex items-center justify-center"
          >
            <Check className="w-10 h-10 text-success-main" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-text-primary mb-4">
            You&apos;re All Set! 🎉
          </h1>
          
          <p className="text-text-secondary mb-8">
            Your Creator Intel dashboard is ready. We&apos;re tracking {selectedCategories.length} categories for you.
          </p>
          
          <p className="text-sm text-text-muted">
            Loading your personalized dashboard...
          </p>
        </motion.div>
      </>
    );
  }
  
  // Category selection step
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-2xl mx-auto py-12"
    >
      <StepIndicator currentStep={1} totalSteps={2} />
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          Pick Your Categories
        </h1>
        <p className="text-text-secondary">
          Select up to 3 games or topics you create content for.
          We&apos;ll personalize your intel based on these.
        </p>
      </div>
      
      {/* Category Selection */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-text-primary">
            Popular Categories
          </h2>
          <span className={cn(
            'text-sm font-medium px-2 py-0.5 rounded-full',
            selectedCategories.length === 3 
              ? 'bg-success-main/20 text-success-main'
              : 'bg-white/5 text-text-muted'
          )}>
            {selectedCategories.length}/3 selected
          </span>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: 0.05 }
              }
            }}
          >
            {availableCategories?.slice(0, 12).map((category) => {
              const isSelected = selectedCategories.includes(category.key);
              const isDisabled = !isSelected && selectedCategories.length >= 3;
              
              return (
                <motion.div
                  key={category.key}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <CategoryCard
                    category={category}
                    isSelected={isSelected}
                    isDisabled={isDisabled}
                    onToggle={() => toggleCategory(category.key)}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
      
      {/* Continue Button */}
      <motion.button
        onClick={handleContinue}
        disabled={selectedCategories.length === 0 || isSubmitting}
        whileHover={selectedCategories.length > 0 ? { scale: 1.02 } : undefined}
        whileTap={selectedCategories.length > 0 ? { scale: 0.98 } : undefined}
        className={cn(
          'w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
          selectedCategories.length > 0
            ? 'bg-interactive-600 hover:bg-interactive-500 text-white'
            : 'bg-background-surface text-text-muted cursor-not-allowed'
        )}
      >
        {isSubmitting ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
            Setting up your dashboard...
          </>
        ) : (
          <>
            Continue to Dashboard
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </motion.button>
      
      {/* Skip */}
      <p className="text-center text-sm text-text-muted mt-4">
        You can always add more categories later from the dashboard
      </p>
    </motion.div>
  );
}
