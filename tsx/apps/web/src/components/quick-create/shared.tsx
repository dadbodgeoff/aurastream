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
      "bg-background-surface/50 backdrop-blur-sm border border-border-subtle rounded-2xl p-6",
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
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            i === currentStep 
              ? "bg-interactive-600 text-white" 
              : i < currentStep
                ? "bg-interactive-600/10 text-interactive-600"
                : "bg-background-elevated text-text-muted"
          )}>
            <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
              {i + 1}
            </span>
            {label}
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              "w-8 h-0.5 mx-1",
              i < currentStep ? "bg-interactive-600" : "bg-border-subtle"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
