/**
 * Quick Create - Shared Components
 */

import { cn } from '@/lib/utils';

export function SectionCard({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn(
      "bg-background-surface/30 backdrop-blur-sm border border-white/5 rounded-2xl p-6",
      "hover:border-white/10 transition-colors duration-200",
      className
    )}>
      {children}
    </div>
  );
}

export function StepIndicator({ 
  currentStep, 
  steps 
}: { 
  currentStep: number; 
  steps: string[];
}) {
  return (
    <div className="flex items-center gap-0.5 mb-4 p-0.5 bg-background-surface/30 backdrop-blur-sm rounded-lg border border-white/5 w-fit">
      {steps.map((label, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;
        
        return (
          <div key={label} className="flex items-center">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
              isActive 
                ? "bg-interactive-600 text-white shadow-md shadow-interactive-600/20" 
                : isCompleted
                  ? "text-interactive-400 hover:bg-white/5"
                  : "text-text-muted hover:text-text-secondary hover:bg-white/5"
            )}>
              <span className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                isActive 
                  ? "bg-white/20 text-white"
                  : isCompleted
                    ? "bg-interactive-500/20 text-interactive-400"
                    : "bg-white/10 text-text-muted"
              )}>
                {isCompleted ? (
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "w-4 h-0.5 mx-0.5 rounded-full transition-colors duration-150",
                isCompleted ? "bg-interactive-500/50" : "bg-white/10"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
